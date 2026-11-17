import { expect, it, vi } from "vitest";
import { boundedHistory, isTransient, withProviderRetry, type AttemptEvent } from "../lib/agent/reliability";
import type { ChatMessage } from "../lib/schemas";
function options() {
  const events: AttemptEvent[] = [];
  return {signal: new AbortController().signal, correlationId: "test-reference", budget: {used: 0}, log: (e: AttemptEvent) => events.push(e), sleep: vi.fn(async () => {}), random: () => 0, events};
}
it("retries transient failures with bounded backoff and logs only safe metadata", async () => {
  const o = options();
  const operation = vi.fn().mockRejectedValueOnce({status: 503, message: "SECRET_API_KEY passenger transcript"}).mockRejectedValueOnce({status: 429}).mockResolvedValue("verified response");
  expect(await withProviderRetry(operation, o)).toBe("verified response");
  expect(o.sleep.mock.calls.map(call => (call as unknown[])[0])).toEqual([300,600]);
  expect(o.budget.used).toBe(3);
  expect(JSON.stringify(o.events)).not.toMatch(/SECRET_API_KEY|passenger transcript/);
  expect(o.events.every(e => e.correlation_id === "test-reference")).toBe(true);
});
it("does not retry non-transient access, bad payload, daily quota or long retry-after errors", async () => {
  for (const error of [{status:400},{status:401},{status:403},{status:404},{status:429,message:"daily quota exceeded"},{status:503,headers: new Headers({"retry-after":"30"})}]) {
    const o=options(), operation=vi.fn().mockRejectedValue(error);
    await expect(withProviderRetry(operation,o)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(o.sleep).not.toHaveBeenCalled();
  }
});
it("caps repeated unavailability at three attempts and respects a shared request budget", async () => {
  const o=options(), error={status:503}, operation=vi.fn().mockRejectedValue(error);
  await expect(withProviderRetry(operation,o)).rejects.toBe(error);
  expect(operation).toHaveBeenCalledTimes(3);
  o.budget.used=6; operation.mockClear();
  await expect(withProviderRetry(operation,o)).rejects.toBe(error);
  expect(operation).toHaveBeenCalledTimes(1);
  await expect(withProviderRetry(operation,o)).rejects.toThrow("attempt limit");
  expect(o.budget.used).toBe(7);
});
it("honours short retry-after and per-attempt deadline even if the provider ignores cancellation", async () => {
  const o=options();
  const op=vi.fn().mockRejectedValueOnce({status:429,headers:{"retry-after":"2"}}).mockResolvedValue(true);
  await withProviderRetry(op,o);
  expect((o.sleep.mock.calls[0] as unknown[])[0]).toBe(2000);
  const timeoutOptions=options();
  await expect(withProviderRetry(() => new Promise(() => {}), {...timeoutOptions, attemptMs:5})).rejects.toThrow("timeout");
  expect(timeoutOptions.budget.used).toBe(3);
});
it("whole-request cancellation prevents work and aborts backoff", async () => {
  const controller=new AbortController(), op=vi.fn().mockRejectedValue({status:503});
  controller.abort();
  await expect(withProviderRetry(op,{...options(),signal:controller.signal})).rejects.toBeDefined();
  expect(op).not.toHaveBeenCalled();
  const active=new AbortController();
  const o=options();
  await expect(withProviderRetry(async () => {setTimeout(() => active.abort(),5);throw {status:503};},{...o,signal:active.signal,sleep:undefined})).rejects.toThrow("timeout");
  expect(o.budget.used).toBe(1);
});
it("bounds whole Tamil messages by UTF-8 bytes and retains the current question", () => {
  const messages: ChatMessage[]=Array.from({length:20},(_,i)=>({role:i%2 ? "model":"user",text:"தமிழ்".repeat(100)}));
  messages.push({role:"user",text:"என் மாதிரி இருப்பு?"});
  const result=boundedHistory(messages,3500,12);
  expect(new TextEncoder().encode(result.map(m=>m.text).join("")).length).toBeLessThanOrEqual(3500);
  expect(result.at(-1)).toEqual(messages.at(-1));
  expect(result[0].role).toBe("user");
  expect(result.length).toBeLessThanOrEqual(12);
  expect(isTransient({status:503})).toBe(true);
});
