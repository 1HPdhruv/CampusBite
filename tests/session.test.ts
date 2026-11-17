import { it, expect, vi, afterEach } from "vitest";
const state = vi.hoisted(() => ({ values: new Map<string, string>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) =>
      state.values.has(key) ? { value: state.values.get(key) } : undefined,
  }),
}));
import { requirePassenger } from "../lib/metro/security";
import { SESSION_COOKIE, PASSENGER_COOKIE, signValue } from "../lib/auth";
import { passengers } from "../lib/metro/fixtures";
afterEach(() => {
  state.values.clear();
  vi.unstubAllEnvs();
});
it("fails closed without a valid gate, passenger and enabled demo mode", async () => {
  vi.stubEnv("APP_PASSCODE", "unit-test-only-secret");
  vi.stubEnv("DEMO_MODE", "true");
  await expect(requirePassenger()).rejects.toThrow("SIGN_IN_REQUIRED");
  state.values.set(SESSION_COOKIE, await signValue("gate", true));
  await expect(requirePassenger()).rejects.toThrow("SELECT_DEMO_PASSENGER");
  state.values.set(
    PASSENGER_COOKIE,
    await signValue("passenger", passengers[0].id),
  );
  expect((await requirePassenger()).id).toBe(passengers[0].id);
  vi.stubEnv("DEMO_MODE", "false");
  await expect(requirePassenger()).rejects.toThrow("PRODUCTION_AUTH_REQUIRED");
  vi.stubEnv("DEMO_MODE", "true");
  state.values.set(
    PASSENGER_COOKIE,
    (await signValue("passenger", passengers[1].id)) + "tampered",
  );
  await expect(requirePassenger()).rejects.toThrow("SELECT_DEMO_PASSENGER");
});
