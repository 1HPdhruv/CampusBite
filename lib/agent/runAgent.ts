import "server-only";
import {
  ThinkingLevel,
  type Content,
  type Part,
  type GenerateContentResponse,
} from "@google/genai";
import { getGemini } from "../gemini";
import { GEMINI_MODEL } from "../env";
import type { ChatMessage, Language } from "../schemas";
import { toolsFor } from "./tools";
import { toFunctionDeclarations, type AgentTool } from "./defineTool";
import { buildSystemPrompt, responseLanguage } from "./systemPrompt";
import type { AgentResult, AgentStep, TicketProposal } from "./types";
import { providerErrorCode } from "./errors";
import { withinDeadline } from "./deadline";
import { groundReply, type ToolEvidence } from "./grounding";
import {
  AGENT_DEADLINE_MS,
  PROVIDER_ATTEMPT_MS,
  boundedHistory,
  withProviderRetry,
  providerMessage,
} from "./reliability";
export const MAX_ROUNDS = 5;
export const MAX_CALLS = 12;
type Generate = (
  contents: Content[],
  signal: AbortSignal,
) => Promise<GenerateContentResponse>;
export async function executeTool(tool: AgentTool | undefined, raw: unknown) {
  if (!tool) return { ok: false, result: { error: "UNKNOWN_TOOL" } };
  const parsed = tool.schema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, result: { error: "INVALID_TOOL_ARGUMENTS" } };
  try {
    return { ok: true, result: await tool.run(parsed.data) };
  } catch {
    return { ok: false, result: { error: "TOOL_UNAVAILABLE_OR_NOT_OWNED" } };
  }
}
export async function runAgent(
  messages: ChatMessage[],
  actor: string,
  language: Language,
  injected?: Generate,
  options?: { correlationId?: string; signal?: AbortSignal },
): Promise<AgentResult> {
  const tools = toolsFor(actor),
    steps: AgentStep[] = [],
    correlationId = options?.correlationId ?? crypto.randomUUID();
  if (!/^(?:models\/)?gemini-[a-z0-9][a-z0-9._-]{0,79}$/i.test(GEMINI_MODEL))
    return {
      reply: providerMessage(
        "AI_CONFIGURATION",
        responseLanguage(language, messages) === "ta-IN",
      ),
      steps,
      error_code: "AI_CONFIGURATION",
      correlation_id: correlationId,
    };
  const context = boundedHistory(messages);
  const budget = { used: 0 };
  console.info(
    JSON.stringify({
      event: "gemini_request",
      correlation_id: correlationId,
      model: GEMINI_MODEL,
      endpoint: "generativelanguage.googleapis.com/v1beta",
      messages_received: messages.length,
      messages_used: context.length,
      history_bytes: new TextEncoder().encode(
        context.map((m) => m.text).join(""),
      ).length,
    }),
  );
  const contents: Content[] = context.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));
  const signal = AbortSignal.any([
    AbortSignal.timeout(AGENT_DEADLINE_MS),
    ...(options?.signal ? [options.signal] : []),
  ]);
  const generate: Generate =
    injected ??
    ((contents, abortSignal) =>
      getGemini().models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction: buildSystemPrompt(language, messages),
          tools: [{ functionDeclarations: toFunctionDeclarations(tools) }],
          ...(/^models\/gemini-(?:3\.|4-)|^gemini-(?:3\.|4-)/i.test(
            GEMINI_MODEL,
          )
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
            : {}),
          maxOutputTokens: 1600,
          abortSignal,
          httpOptions: {
            timeout: PROVIDER_ATTEMPT_MS,
            retryOptions: { attempts: 1 },
          },
        },
      }));
  const evidence: ToolEvidence[] = [];
  let proposal: TicketProposal | undefined;
  const ta = responseLanguage(language, messages) === "ta-IN";
  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      signal.throwIfAborted();
      const response = await withProviderRetry(
        (attemptSignal) => generate(contents, attemptSignal),
        { signal, correlationId, budget },
      );
      const calls = response.functionCalls ?? [];
      if (!calls.length)
        return {
          reply: groundReply(
            response.text?.trim() ||
              (ta
                ? "பதில் கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்."
                : "No answer received. Please try again."),
            evidence,
            responseLanguage(language, messages),
          ),
          steps,
          proposal,
          correlation_id: correlationId,
        };
      if (steps.length + calls.length > MAX_CALLS) break;
      const turn = response.candidates?.[0]?.content;
      if (!turn) break;
      contents.push(turn);
      const parts: Part[] = [];
      for (const call of calls) {
        if (signal.aborted) break;
        const start = Date.now();
        const outcome = await withinDeadline(
          executeTool(
            tools.find((t) => t.name === call.name),
            call.args ?? {},
          ),
          signal,
        );
        const name = tools.some((t) => t.name === call.name)
          ? call.name!
          : "unknown";
        steps.push({ tool: name, ok: outcome.ok });
        console.info(
          JSON.stringify({
            event: "metro_tool",
            tool: name,
            duration_ms: Date.now() - start,
            outcome: outcome.ok ? "ok" : "rejected",
            correlation_id: correlationId,
          }),
        );
        if (outcome.ok) evidence.push({ name, result: outcome.result });
        let safeResult = outcome.result;
        if (name === "prepareSupportTicket" && outcome.ok) {
          proposal = outcome.result as TicketProposal;
          safeResult = {
            draft: proposal.draft,
            notice: proposal.notice,
            requires_ui_confirmation: true,
          };
        }
        parts.push({
          functionResponse: {
            id: call.id,
            name: call.name,
            response: { result: safeResult },
          },
        });
      }
      contents.push({ role: "user", parts });
    }
    return {
      reply: ta
        ? "கோரிக்கை வரம்பை எட்டியது. சுருக்கமாக மீண்டும் கேட்கவும்."
        : "Request limit reached. Please ask a shorter question.",
      steps,
      proposal,
      correlation_id: correlationId,
    };
  } catch (error) {
    const error_code = providerErrorCode(error);
    console.info(
      JSON.stringify({
        event: "metro_provider",
        outcome: error_code,
        correlation_id: correlationId,
      }),
    );
    return {
      error_code,
      reply: providerMessage(error_code, ta),
      steps,
      proposal,
      correlation_id: correlationId,
    };
  }
}
