// Run against an isolated local server with the documented smoke-only configuration.
// Never uses actual passcodes or writes to a remote database.
import assert from "node:assert/strict";
const base = process.env.SMOKE_URL || "http://127.0.0.1:3210";
assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Local server only",
);
const origin = new URL(base).origin;
let cookie = "";
async function call(path, body, expected = 200) {
  const r = await fetch(base + path, {
    headers: {
      cookie,
      ...(body ? { "Content-Type": "application/json", origin } : {}),
    },
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
  });
  if (path === "/api/login" && r.ok)
    cookie = r.headers
      .getSetCookie()
      .map((s) => s.split(";")[0])
      .join("; ");
  if (path === "/api/session" && r.ok)
    cookie +=
      "; " +
      r.headers
        .getSetCookie()
        .map((s) => s.split(";")[0])
        .join("; ");
  assert.equal(r.status, expected, path);
  return r.json();
}
await call("/api/cards", null, 401);
const health = await call("/api/health");
assert.equal(health.storage, "memory");
assert.equal(health.demo_mode, true);
await call("/api/login", { passcode: "local-smoke-only" });
const me = await call("/api/me");
assert.equal(me.passenger, null);
assert.equal(me.profiles.length, 3);
await call("/api/cards", null, 401);
await call("/api/session", { fixture: me.profiles[0].id });
const c = await call("/api/cards");
assert.equal(c.cards.length, 1);
assert.equal(c.cards[0].is_demo, true);
assert.equal(c.recharges[0].card_update_status, "pending");
if (!me.live_enabled)
  await call("/api/voice/session", { language: "en-IN" }, 409);
const central = await call("/api/stations/search?q=Central");
assert.equal(central.stations[0].code, "CENTRAL");
assert.equal(
  (await call("/api/fares?from=AIRPORT&to=GUINDY&asOf=2099-01-01")).verified,
  false,
);
await call("/api/fares?from=AIRPORT&to=GUINDY&asOf=2026-02-30", null, 400);
const tr = await call("/api/transactions");
assert.ok(tr.transactions.every((t) => t.passenger_id === me.profiles[0].id));
await call(
  "/api/transactions?cardId=20000000-0000-4000-8000-000000000002",
  null,
  404,
);
const known = await call("/api/fares?from=AIRPORT&to=MEENAMBAKKAM");
assert.equal(known.standard, 10);
assert.equal((await call("/api/fares?from=EGMORE&to=GUINDY")).verified, false);
const d = await call("/api/tickets/prepare", {
  category: "recharge",
  description:
    "Synthetic recharge payment succeeded but card update is pending",
  cardId: c.cards[0].id,
  language: "ta-IN",
});
const payload = {
  confirmation: d.confirmation,
  idempotencyKey: crypto.randomUUID(),
};
await call("/api/tickets", payload, 400);
const first = await call("/api/tickets", { ...payload, confirmed: true });
const retry = await call("/api/tickets", { ...payload, confirmed: true });
assert.equal(first.ticket.id, retry.ticket.id);
assert.ok(!("confirmation_hash" in first.ticket));
await call("/api/session", { fixture: me.profiles[1].id });
assert.equal((await call("/api/tickets")).tickets.length, 0);
await call(
  "/api/tickets",
  { ...payload, idempotencyKey: crypto.randomUUID(), confirmed: true },
  403,
);
const rejected = await fetch(base + "/api/tickets", {
  method: "POST",
  headers: {
    cookie,
    origin: "https://invalid.example",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ ...payload, confirmed: true }),
});
assert.equal(rejected.status, 403);
const agent = await call("/api/agent", {
  language: "ta-IN",
  messages: [{ role: "user", text: "என் மாதிரி இருப்பு என்ன?" }],
}, 503);
assert.match(agent.reply, /சேவை/); // provider deliberately disabled
assert.equal(agent.error_code, "AI_CONFIGURATION");
assert.match(agent.correlation_id, /^[a-f0-9-]{36}$/);
await call("/api/logout", {});
cookie = "";
await call("/api/cards", null, 401);
console.log(
  "PASS: local HTTP smoke — gate, identity, ownership, cards, recharge, fares, confirmation, retry, cross-session isolation, CSRF, AI fallback, logout",
);
