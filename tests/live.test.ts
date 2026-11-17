import { it, expect, beforeEach, afterEach, vi } from "vitest";
import type { LiveServerMessage, FunctionResponse } from "@google/genai";
import { LiveEvents, mergeCaption } from "../lib/voice/live-events";
import {
  liveTokenConfig,
  liveTools,
  dispatchLiveTools,
} from "../lib/voice/server";
import { signValue } from "../lib/auth";
import { passengers, cards } from "../lib/metro/fixtures";
import { PcmEncoder, decodePcm } from "../lib/voice/pcm";
const A = passengers[0].id,
  B = passengers[1].id;
beforeEach(() => {
  vi.stubEnv("APP_PASSCODE", "unit-live-only-secret");
  vi.stubEnv("GEMINI_LIVE_ENABLED", "true");
  vi.stubEnv("METRO_STORAGE", "memory");
});
afterEach(() => vi.unstubAllEnvs());
it("mints only a one-use short-lived constrained Live config with read tools", () => {
  const c = liveTokenConfig(A, "ta-IN", 0);
  expect(c.uses).toBe(1);
  expect(c.expireTime).toBe("1970-01-01T00:01:30.000Z");
  expect(c.newSessionExpireTime).toBe("1970-01-01T00:00:30.000Z");
  expect(c.liveConnectConstraints.model).toBe("gemini-3.8-live");
  expect(c.liveConnectConstraints.config.systemInstruction).toContain(
    "Respond in ta-IN",
  );
  expect(
    liveTools(A).some((t) => t.writes || t.name === "prepareSupportTicket"),
  ).toBe(false);
  expect(JSON.stringify(c)).not.toContain("unit-live-only-secret");
});
it("Live tool bridge scopes data, rejects actor injection/expired capability and writes", async () => {
  const capability = await signValue(
    "live-tools",
    { actor: A, nonce: crypto.randomUUID() },
    90,
  );
  const call = { id: "one", name: "getMyCards", args: {} };
  const result = await dispatchLiveTools(A, { capability, calls: [call] });
  expect(JSON.stringify(result)).toContain(cards[0].masked_number);
  expect(JSON.stringify(result)).not.toContain(cards[1].masked_number);
  await expect(
    dispatchLiveTools(B, { capability, calls: [call] }),
  ).rejects.toThrow("INVALID_LIVE_SESSION");
  await expect(
    dispatchLiveTools(A, { capability, calls: [call], passengerId: B }),
  ).rejects.toThrow("INVALID_LIVE_TOOL_REQUEST");
  const denied = await dispatchLiveTools(A, {
    capability,
    calls: [{ ...call, name: "createSupportTicket" }],
  });
  expect(JSON.stringify(denied)).toContain("UNKNOWN_TOOL");
  const expired = await signValue(
    "live-tools",
    { actor: A, nonce: crypto.randomUUID() },
    -1,
  );
  await expect(
    dispatchLiveTools(A, { capability: expired, calls: [call] }),
  ).rejects.toThrow("INVALID_LIVE_SESSION");
  const other = await dispatchLiveTools(A, {
    capability,
    calls: [{ ...call, name: "getCardBalance", args: { cardId: cards[1].id } }],
  });
  expect(JSON.stringify(other)).toContain("NOT_OWNED");
});
it("buffers delta/cumulative captions, processes every audio part, clears interrupted speech", async () => {
  const caption = vi.fn(),
    audio = vi.fn(),
    interrupt = vi.fn();
  const events = new LiveEvents({
    caption,
    audio,
    interrupt,
    tools: async () => [],
    respond: vi.fn(),
    failure: vi.fn(),
  });
  await events.handle({
    serverContent: { inputTranscription: { text: "என்" } },
  } as LiveServerMessage);
  await events.handle({
    serverContent: {
      inputTranscription: { text: "என் அட்டை", finished: true },
      outputTranscription: { text: "Demo" },
      modelTurn: {
        parts: [
          { inlineData: { data: "AAA=", mimeType: "audio/pcm;rate=24000" } },
          { inlineData: { data: "BBB=", mimeType: "audio/pcm;rate=24000" } },
        ],
      },
    },
  } as LiveServerMessage);
  expect(caption).toHaveBeenCalledWith("user", "என் அட்டை", true);
  expect(audio).toHaveBeenCalledTimes(2);
  await events.handle({
    serverContent: { interrupted: true },
  } as LiveServerMessage);
  expect(interrupt).toHaveBeenCalledTimes(1);
  events.close();
  await events.handle({
    serverContent: { outputTranscription: { text: "late" } },
  } as LiveServerMessage);
  expect(caption).not.toHaveBeenCalledWith("model", "late", false);
  expect(mergeCaption("hello", "world")).toBe("hello world");
});
it("returns authorized tool results, suppresses cancelled late results and bounds model loops", async () => {
  const respond = vi.fn(),
    failure = vi.fn();
  let finish: (r: FunctionResponse[]) => void = () => {};
  const events = new LiveEvents({
    caption: vi.fn(),
    audio: vi.fn(),
    interrupt: vi.fn(),
    respond,
    failure,
    tools: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  const call = { id: "cancelled", name: "getMyCards", args: {} };
  const pending = events.handle({
    toolCall: { functionCalls: [call] },
  } as LiveServerMessage);
  await events.handle({
    toolCallCancellation: { ids: ["cancelled"] },
  } as LiveServerMessage);
  finish([
    { id: call.id, name: call.name, response: { result: { is_demo: true } } },
  ]);
  await pending;
  expect(respond).toHaveBeenCalledWith([]);
  await events.handle({
    toolCall: { functionCalls: Array(13).fill(call) },
  } as LiveServerMessage);
  expect(failure).toHaveBeenCalled();
});
it("sends a returned tool result using the original call id", async () => {
  const respond = vi.fn();
  const response = {
    id: "balance-1",
    name: "getMyCards",
    response: { result: { is_demo: true } },
  };
  const events = new LiveEvents({
    caption: vi.fn(),
    audio: vi.fn(),
    interrupt: vi.fn(),
    respond,
    failure: vi.fn(),
    tools: async () => [response],
  });
  await events.handle({
    toolCall: {
      functionCalls: [{ id: "balance-1", name: "getMyCards", args: {} }],
    },
  } as LiveServerMessage);
  expect(respond).toHaveBeenCalledWith([response]);
});
it("encodes continuous native browser PCM without telephony conversion", () => {
  const encoder = new PcmEncoder(48000);
  const a = decodePcm(encoder.encode(new Float32Array(480).fill(0.5)));
  expect(a).toHaveLength(160);
  expect(a[0]).toBeCloseTo(0.5, 3);
  const split = new PcmEncoder(44100);
  const one = new Float32Array(441).fill(-0.5);
  const count =
    decodePcm(split.encode(one.slice(0, 128))).length +
    decodePcm(split.encode(one.slice(128))).length;
  expect(count).toBe(160);
  expect(() => decodePcm("AA==")).toThrow();
});
