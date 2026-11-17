import { agentRequestSchema } from "@/lib/schemas";
import { runAgent } from "@/lib/agent/runAgent";
import {
  api,
  assertOrigin,
  requirePassenger,
  rateLimit,
  readJson,
  ApiError,
} from "@/lib/metro/security";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const actor = await requirePassenger();
    rateLimit(`agent:${actor.id}`, 10);
    rateLimit("agent-global", 40);
    const parsed = agentRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError("INVALID_REQUEST");
    const correlationId = crypto.randomUUID();
    const result = await runAgent(
      parsed.data.messages,
      actor.id,
      parsed.data.language,
      undefined,
      { correlationId, signal: request.signal },
    );
    const status =
      result.error_code === "AI_TIMEOUT"
        ? 504
        : result.error_code === "AI_QUOTA"
          ? 429
          : result.error_code
            ? 503
            : 200;
    return Response.json(result, {
      status,
      headers: {
        "X-Request-ID": correlationId,
        ...(status === 429 ? { "Retry-After": "30" } : {}),
      },
    });
  });
}
