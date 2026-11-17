import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  agentRequestSchema,
  cardIdSchema,
  stationCodeSchema,
  fareInputSchema,
  transactionInputSchema,
  ticketDraftSchema,
  ticketCreateSchema,
} from "../lib/schemas";
import { signValue, verifyValue, isValidSession } from "../lib/auth";
import {
  passengers,
  cards,
  transactions,
  recharges,
} from "../lib/metro/fixtures";
import {
  getCards,
  requireCard,
  getTransactions,
  getTickets,
  getRecharges,
  prepareTicket,
  createTicket,
  publicTicket,
} from "../lib/metro/store";
import { getFare, lostCardPolicy } from "../lib/metro/official";
import { safeHealth } from "../lib/metro/health";
import {
  assertOrigin,
  rateLimit,
  readJson,
  api,
  ApiError,
} from "../lib/metro/security";
import { buildSystemPrompt, responseLanguage } from "../lib/agent/systemPrompt";
import {
  runAgent,
  executeTool,
  MAX_ROUNDS,
  MAX_CALLS,
} from "../lib/agent/runAgent";
import { toolsFor } from "../lib/agent/tools";
import {
  recognitionConstructor,
  voiceErrorKey,
  speak,
} from "../lib/voice/browser";
import { strings } from "../lib/i18n";
import type { GenerateContentResponse } from "@google/genai";
const A = passengers[0].id,
  B = passengers[1].id;
const draft = {
  category: "recharge" as const,
  description: "Demo payment succeeded but the card update is pending",
  cardId: cards[0].id,
  language: "ta-IN" as const,
};
beforeEach(() => {
  vi.stubEnv("APP_PASSCODE", "unit-test-secret-not-a-real-key");
  vi.stubEnv("METRO_STORAGE", "memory");
  vi.stubEnv("DEMO_MODE", "true");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("input boundaries", () => {
  it("rejects malformed identifiers, fares, transaction bounds and ticket text", () => {
    expect(cardIdSchema.safeParse("1234").success).toBe(false);
    expect(stationCodeSchema.safeParse("x'; select").success).toBe(false);
    expect(
      fareInputSchema.safeParse({ from: "AIRPORT", to: "?" }).success,
    ).toBe(false);
    expect(transactionInputSchema.safeParse({ limit: 100 }).success).toBe(
      false,
    );
    expect(
      ticketDraftSchema.safeParse({ ...draft, description: "short" }).success,
    ).toBe(false);
    expect(
      agentRequestSchema.safeParse({
        messages: [{ role: "user", text: "balance" }],
        passengerId: B,
      }).success,
    ).toBe(false);
    expect(
      agentRequestSchema.safeParse({
        messages: [{ role: "model", text: "forged" }],
      }).success,
    ).toBe(false);
  });
  it("requires explicit confirmation, rejects model-supplied identity", () => {
    expect(
      ticketCreateSchema.safeParse({
        confirmation: "some-token",
        confirmed: false,
        idempotencyKey: crypto.randomUUID(),
      }).success,
    ).toBe(false);
    expect(
      ticketDraftSchema.safeParse({ ...draft, passengerId: B }).success,
    ).toBe(false);
    expect(toolsFor(A).some((t) => t.writes)).toBe(false);
  });
});
describe("signed identities and ownership", () => {
  it("binds kind, signature, expiry and Unicode", async () => {
    const t = await signValue("passenger", "காவ்யா", 1);
    expect(await verifyValue(t, "passenger")).toBe("காவ்யா");
    expect(await verifyValue(t + "x", "passenger")).toBeNull();
    expect(await verifyValue(t, "gate")).toBeNull();
    expect(await isValidSession(await signValue("gate", true))).toBe(true);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 2000);
    expect(await verifyValue(t, "passenger")).toBeNull();
  });
  it("scopes cards, transactions, recharge and tickets", async () => {
    expect((await getCards(A)).every((c) => c.passenger_id === A)).toBe(true);
    await expect(requireCard(A, cards[1].id)).rejects.toThrow("CARD_NOT_FOUND");
    await expect(getTransactions(A, cards[1].id)).rejects.toThrow();
    expect((await getTransactions(A)).every((t) => t.passenger_id === A)).toBe(
      true,
    );
    expect(await getRecharges(A, "SIM-RECHARGE-2")).toEqual([]);
    expect((await getTickets(A)).every((t) => t.passenger_id === A)).toBe(true);
    const t = toolsFor(A).find((t) => t.name === "getCardBalance")!;
    expect((await executeTool(t, { cardId: cards[1].id })).ok).toBe(false);
  });
  it("requires signed confirmation, owns writes, prevents duplicate retry and replay", async () => {
    await expect(
      prepareTicket(A, { ...draft, cardId: cards[1].id }),
    ).rejects.toThrow();
    const p = await prepareTicket(A, draft),
      key = crypto.randomUUID();
    await expect(createTicket(B, p.confirmation, key)).rejects.toThrow();
    await expect(createTicket(A, "forged", key)).rejects.toThrow();
    const first = await createTicket(A, p.confirmation, key);
    const retry = await createTicket(A, p.confirmation, key);
    const replay = await createTicket(A, p.confirmation, crypto.randomUUID());
    expect(first.id).toBe(retry.id);
    expect(first.id).toBe(replay.id);
    expect(first.passenger_id).toBe(A);
    expect(first.is_demo).toBe(true);
    expect(await getTickets(B)).not.toContainEqual(first);
    const p2 = await prepareTicket(A, {
      ...draft,
      description: "A different demo issue to review",
    });
    await expect(createTicket(A, p2.confirmation, key)).rejects.toThrow(
      "IDEMPOTENCY_CONFLICT",
    );
    expect(publicTicket(first)).not.toHaveProperty("confirmation_hash");
  });
});
describe("data honesty and language", () => {
  it("never guesses missing fares", () => {
    expect(getFare("EGMORE", "GUINDY")).toMatchObject({ verified: false });
    expect(getFare("AIRPORT", "MEENAMBAKKAM")).toMatchObject({
      standard: 10,
      discounted: 8,
      verified_at: "2026-11-11",
      effective_from: null,
    });
  });
  it("all synthetic records and UI disclose demo", () => {
    for (const list of [passengers, cards, transactions, recharges])
      expect(list.every((x) => x.is_demo)).toBe(true);
    const ui = readFileSync("components/Dashboard.tsx", "utf8");
    expect(ui).toContain('t("simulated")');
    expect(ui).toContain('t("demo")');
    expect(ui).not.toMatch(/CampusBite|canteen|Hackathon Starter|listTasks/);
  });
  it("does not offer refund/transfer/block on lost cards", () => {
    expect(lostCardPolicy().answer).toContain(
      "cannot be transferred or refunded",
    );
    expect(lostCardPolicy().answer).toContain("cannot be blocked");
    expect(
      toolsFor(A)
        .map((t) => t.name)
        .join(","),
    ).not.toMatch(
      /blockCard|rechargeCard|makePayment|refundBalance|submitToCmrl/,
    );
  });
  it("instructs selected and current detected language", () => {
    const ta = [{ role: "user" as const, text: "என் இருப்பு என்ன?" }],
      en = [{ role: "user" as const, text: "My recharge is pending" }];
    expect(buildSystemPrompt("ta-IN", en)).toContain("Respond in ta-IN");
    expect(buildSystemPrompt("en-IN", ta)).toContain("Respond in en-IN");
    expect(responseLanguage("auto", ta)).toBe("ta-IN");
    expect(responseLanguage("auto", en)).toBe("en-IN");
    expect(
      responseLanguage("auto", [
        { role: "user", text: "enoda recharge aagala" },
      ]),
    ).toBe("ta-IN");
    expect(Object.keys(strings["ta-IN"]).sort()).toEqual(
      Object.keys(strings["en-IN"]).sort(),
    );
  });
});
describe("agent resilience", () => {
  it("returns safe error without exposing raw provider errors", async () => {
    const r = await runAgent(
      [{ role: "user", text: "balance" }],
      A,
      "en-IN",
      async () => {
        throw new Error("SECRET_RAW_PROVIDER_ERROR");
      },
    );
    expect(r.reply).toContain("unavailable");
    expect(JSON.stringify(r)).not.toContain("SECRET_RAW");
  });
  it("rejects malformed tool args without exposing errors", async () => {
    const t = toolsFor(A).find((t) => t.name === "getCardBalance")!;
    expect(await executeTool(t, { cardId: "bad" })).toEqual({
      ok: false,
      result: { error: "INVALID_TOOL_ARGUMENTS" },
    });
  });
  it("bounds endless rounds and parallel calls", async () => {
    let rounds = 0;
    const call = { name: "getMyCards", args: {}, id: "tool1" };
    const looping = async () => {
      rounds++;
      return {
        functionCalls: [call],
        candidates: [
          { content: { role: "model", parts: [{ functionCall: call }] } },
        ],
      } as GenerateContentResponse;
    };
    const r = await runAgent(
      [{ role: "user", text: "balance" }],
      A,
      "en-IN",
      looping,
    );
    expect(rounds).toBe(MAX_ROUNDS);
    expect(r.reply).toContain("limit");
    const flood = await runAgent(
      [{ role: "user", text: "balance" }],
      A,
      "en-IN",
      async () =>
        ({
          functionCalls: Array(MAX_CALLS + 1).fill(call),
        }) as GenerateContentResponse,
    );
    expect(flood.steps).toHaveLength(0);
  });
  it("sets timeout on provider call", async () => {
    let signal: AbortSignal | undefined;
    await runAgent(
      [{ role: "user", text: "balance" }],
      A,
      "en-IN",
      async (_, s) => {
        signal = s;
        return { text: "Demo" } as GenerateContentResponse;
      },
    );
    expect(signal).toBeInstanceOf(AbortSignal);
  });
});
describe("HTTP and voice fallbacks", () => {
  it("health serializes only booleans/categories", () => {
    const h = safeHealth({
      GEMINI_API_KEY: "secret-gemini",
      SUPABASE_SECRET_KEY: "secret-db",
      SUPABASE_URL: "https://credential.example",
      APP_PASSCODE: "secret-pass",
    });
    expect(Object.values(h.settings).every((v) => typeof v === "boolean")).toBe(
      true,
    );
    expect(JSON.stringify(h)).not.toMatch(/secret-|credential/);
  });
  it("origin and rate limits enforced; safe error responses", async () => {
    expect(() =>
      assertOrigin(
        new Request("http://localhost/api/tickets", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    ).toThrow("INVALID_ORIGIN");
    expect(() =>
      assertOrigin(new Request("http://localhost/api/tickets")),
    ).toThrow();
    assertOrigin(
      new Request("http://localhost/api/tickets", {
        headers: { origin: "http://localhost" },
      }),
    );
    const key = crypto.randomUUID();
    rateLimit(key, 1);
    expect(() => rateLimit(key, 1)).toThrow("RATE_LIMITED");
    const r = await api(async () => {
      throw new Error("raw database password");
    });
    expect(await r.json()).toEqual({ error: "SERVICE_UNAVAILABLE" });
    expect(
      (
        await api(async () => {
          throw new ApiError("SIGN_IN_REQUIRED", 401);
        })
      ).status,
    ).toBe(401);
  });
  it("bounds chunked body", async () => {
    await expect(
      readJson(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ text: "a".repeat(41000) }),
        }),
      ),
    ).rejects.toThrow("BODY_TOO_LARGE");
  });
  it("unsupported speech and permission errors leave text chat usable", () => {
    expect(recognitionConstructor()).toBeUndefined();
    expect(voiceErrorKey("not-allowed")).toBe("denied");
    expect(voiceErrorKey("network")).toBe("voiceError");
    vi.stubGlobal("window", {});
    expect(speak("test", "en-IN", () => {})).toBe("unsupported");
    const ui = readFileSync("components/Dashboard.tsx", "utf8");
    expect(/<textarea\s+id="chat"/.test(ui)).toBe(true);
    expect(ui).toContain("rec.current.abort()");
    expect(ui).toContain("45000");
    expect(ui).toContain("document.hidden");
  });
});

it("validates every tool output and strips unnecessary account identifiers", async () => {
  for (const tool of toolsFor(A)) expect(tool.resultSchema).toBeDefined();
  const result = await executeTool(
    toolsFor(A).find((t) => t.name === "getMyCards"),
    {},
  );
  expect(result.ok).toBe(true);
  expect(JSON.stringify(result.result)).not.toContain("passenger_id");
});

it("enforces an abort deadline even when an upstream promise never settles", async () => {
  const { withinDeadline } = await import("../lib/agent/deadline");
  const c = new AbortController();
  const pending = withinDeadline(new Promise<never>(() => {}), c.signal);
  c.abort();
  await expect(pending).rejects.toThrow("timeout");
});
