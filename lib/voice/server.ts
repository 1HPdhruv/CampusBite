import "server-only";
import { GoogleGenAI, Modality } from "@google/genai";
import { z } from "zod";
import { requireEnv } from "../env";
import { signValue, verifyValue } from "../auth";
import { ApiError, rateLimit } from "../metro/security";
import { toolsFor } from "../agent/tools";
import { executeTool } from "../agent/runAgent";
import { toFunctionDeclarations } from "../agent/defineTool";
import { buildSystemPrompt } from "../agent/systemPrompt";
import type { Language } from "../schemas";
export const liveTools = (actor: string) =>
  toolsFor(actor).filter((t) => !t.writes && t.name !== "prepareSupportTicket");
export const liveCallSchema = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(80),
    args: z.record(z.string(), z.unknown()),
  })
  .strict();
export const liveToolRequestSchema = z
  .object({
    capability: z.string().max(3000),
    calls: z.array(liveCallSchema).min(1).max(4),
  })
  .strict();
export function liveTokenConfig(
  actor: string,
  language: Language,
  now = Date.now(),
) {
  const model = process.env.GEMINI_LIVE_MODEL?.trim() || "gemini-3.8-live";
  return {
    uses: 1,
    expireTime: new Date(now + 90000).toISOString(),
    newSessionExpireTime: new Date(now + 30000).toISOString(),
    liveConnectConstraints: {
      model,
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        maxOutputTokens: 1200,
        systemInstruction:
          buildSystemPrompt(language) +
          "\nLive session: read-only tools only. Never claim a support ticket was created. Ask passenger to use Support centre to review and confirm a ticket. For auto language follow the language of the current speech. Pronounce CMRL and NCMC as separate letters; speak Tamil station names when a verified Tamil name is returned.",
        tools: [
          { functionDeclarations: toFunctionDeclarations(liveTools(actor)) },
        ],
      },
    },
    httpOptions: { timeout: 8000 },
    abortSignal: AbortSignal.timeout(10000),
  };
}
export async function mintLiveSession(actor: string, language: Language) {
  if (process.env.GEMINI_LIVE_ENABLED !== "true")
    throw new ApiError("LIVE_DISABLED", 409);
  const ai = new GoogleGenAI({
    apiKey: requireEnv("GEMINI_API_KEY"),
    httpOptions: { apiVersion: "v1beta" },
  });
  const config = liveTokenConfig(actor, language);
  const token = await ai.authTokens.create({ config });
  if (!token.name) throw new ApiError("LIVE_PROVIDER_UNAVAILABLE", 503);
  return {
    token: token.name,
    model: config.liveConnectConstraints.model,
    expires_at: config.expireTime,
    capability: await signValue(
      "live-tools",
      { actor, nonce: crypto.randomUUID() },
      90,
    ),
    max_seconds: 45,
  };
}
export async function dispatchLiveTools(actor: string, raw: unknown) {
  if (process.env.GEMINI_LIVE_ENABLED !== "true")
    throw new ApiError("LIVE_DISABLED", 409);
  const p = liveToolRequestSchema.safeParse(raw);
  if (!p.success) throw new ApiError("INVALID_LIVE_TOOL_REQUEST");
  const capability = await verifyValue<{ actor: string; nonce: string }>(
    p.data.capability,
    "live-tools",
  );
  if (!capability || capability.actor !== actor)
    throw new ApiError("INVALID_LIVE_SESSION", 403);
  const tools = liveTools(actor);
  const responses = [];
  for (const call of p.data.calls) {
    rateLimit(`live-call:${capability.nonce}`, 12);
    const start = Date.now();
    const outcome = await executeTool(
      tools.find((t) => t.name === call.name),
      call.args,
    );
    // No inputs, outputs, capabilities or transcripts enter logs.
    console.info(
      JSON.stringify({
        event: "live_tool",
        tool: tools.some((t) => t.name === call.name) ? call.name : "unknown",
        outcome: outcome.ok ? "ok" : "rejected",
        duration_ms: Date.now() - start,
      }),
    );
    responses.push({
      id: call.id,
      name: call.name,
      response: { result: outcome.result },
    });
  }
  return { functionResponses: responses };
}
