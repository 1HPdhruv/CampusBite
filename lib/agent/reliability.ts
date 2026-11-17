import type { ChatMessage } from "../schemas";
import { withinDeadline } from "./deadline";
import { providerErrorCode } from "./errors";
export const AGENT_DEADLINE_MS = 45000;
export const PROVIDER_ATTEMPT_MS = 12000;
export const MAX_PROVIDER_ATTEMPTS = 3;
export const MAX_REQUEST_ATTEMPTS = 7;
export function boundedHistory(
  messages: ChatMessage[],
  maxBytes = 16000,
  maxMessages = 12,
) {
  const chosen: ChatMessage[] = [];
  let bytes = 0;
  for (const m of [...messages].reverse()) {
    const size = new TextEncoder().encode(m.text).length;
    if (
      chosen.length >= maxMessages ||
      (chosen.length > 0 && bytes + size > maxBytes)
    )
      break;
    chosen.unshift(m);
    bytes += size;
  }
  while (chosen.length > 1 && chosen[0].role === "model") chosen.shift();
  return chosen;
}
function statusOf(error: unknown) {
  const e = error as {
    status?: unknown;
    response?: { status?: unknown };
  } | null;
  const status = e?.status ?? e?.response?.status;
  return typeof status === "number" && status >= 100 && status < 600
    ? status
    : null;
}
export function isTransient(error: unknown) {
  const status = statusOf(error);
  const e = error as {
    message?: string;
    name?: string;
    cause?: { code?: string };
  } | null;
  if (
    status === 429 &&
    /per.day|daily|billing|quota.{0,20}(?:zero|limit.?0)/i.test(
      e?.message ?? "",
    )
  )
    return false;
  if (status !== null) return [408, 429, 500, 502, 503, 504].includes(status);
  return (
    /timeout|timed out|abort|fetch failed|network/i.test(e?.message ?? "") ||
    e?.name === "AbortError" ||
    /^(ECONNRESET|ETIMEDOUT|EAI_AGAIN)$/.test(e?.cause?.code ?? "")
  );
}
function retryAfterMs(error: unknown) {
  const e = error as {
    headers?: Headers | Record<string, string>;
    response?: { headers?: Headers };
  } | null;
  const h = e?.headers ?? e?.response?.headers;
  const value =
    h instanceof Headers ? h.get("retry-after") : h?.["retry-after"];
  if (!value) return null;
  const seconds = Number(value);
  return Number.isFinite(seconds)
    ? Math.max(0, seconds * 1000)
    : Math.max(0, Date.parse(value) - Date.now()) || null;
}
function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("AI request timeout"));
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(new Error("AI request timeout"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
export type AttemptEvent = {
  event: "gemini_attempt";
  correlation_id: string;
  attempt: number;
  request_attempt: number;
  duration_ms: number;
  status: number | null;
  outcome: string;
  retry_in_ms: number | null;
};
export async function withProviderRetry<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: {
    signal: AbortSignal;
    correlationId: string;
    budget: { used: number };
    log?: (event: AttemptEvent) => void;
    sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
    random?: () => number;
    attemptMs?: number;
  },
) {
  const log = options.log ?? ((event) => console.info(JSON.stringify(event)));
  for (let attempt = 1; attempt <= MAX_PROVIDER_ATTEMPTS; attempt++) {
    options.signal.throwIfAborted();
    if (options.budget.used >= MAX_REQUEST_ATTEMPTS)
      throw new Error("AI request attempt limit");
    options.budget.used++;
    const started = Date.now();
    const signal = AbortSignal.any([
      options.signal,
      AbortSignal.timeout(options.attemptMs ?? PROVIDER_ATTEMPT_MS),
    ]);
    try {
      const value = await withinDeadline(operation(signal), signal);
      log({
        event: "gemini_attempt",
        correlation_id: options.correlationId,
        attempt,
        request_attempt: options.budget.used,
        duration_ms: Date.now() - started,
        status: 200,
        outcome: "ok",
        retry_in_ms: null,
      });
      return value;
    } catch (error) {
      const retryAfter = retryAfterMs(error);
      const retry =
        !options.signal.aborted &&
        attempt < MAX_PROVIDER_ATTEMPTS &&
        options.budget.used < MAX_REQUEST_ATTEMPTS &&
        isTransient(error) &&
        (retryAfter === null || retryAfter <= 5000);
      const wait = retry
        ? Math.max(
            retryAfter ?? 0,
            300 * 2 ** (attempt - 1) +
              Math.floor((options.random ?? Math.random)() * 150),
          )
        : null;
      log({
        event: "gemini_attempt",
        correlation_id: options.correlationId,
        attempt,
        request_attempt: options.budget.used,
        duration_ms: Date.now() - started,
        status: statusOf(error),
        outcome: providerErrorCode(error),
        retry_in_ms: wait,
      });
      if (!retry) throw error;
      await (options.sleep ?? delay)(wait!, options.signal);
    }
  }
  throw new Error("AI provider unavailable");
}
export function providerMessage(code: string, ta: boolean) {
  const messages: Record<string, [string, string]> = {
    AI_TIMEOUT: [
      "The AI request timed out. Please retry. Card and support panels are still available.",
      "AI கோரிக்கைக்கான நேரம் முடிந்தது. மீண்டும் முயற்சிக்கவும். அட்டை மற்றும் ஆதரவு பகுதிகளைப் பயன்படுத்தலாம்.",
    ],
    AI_QUOTA: [
      "AI request capacity is temporarily limited. Please wait before retrying.",
      "AI கோரிக்கை வரம்பை எட்டியது. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.",
    ],
    AI_CONFIGURATION: [
      "The AI service is unavailable because its configuration or access needs attention. Please use the card/support panels.",
      "AI சேவையின் அமைப்பு அல்லது அணுகலைச் சரிபார்க்க வேண்டும். அட்டை மற்றும் ஆதரவு பகுதிகளைப் பயன்படுத்தலாம்.",
    ],
    AI_UNAVAILABLE: [
      "The AI provider is temporarily unavailable. Please retry; no account or fare information has been invented.",
      "AI சேவை தற்போது கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்; இருப்பு அல்லது கட்டணம் ஊகித்து வழங்கப்படவில்லை.",
    ],
  };
  return (messages[code] ?? messages.AI_UNAVAILABLE)[ta ? 1 : 0];
}
