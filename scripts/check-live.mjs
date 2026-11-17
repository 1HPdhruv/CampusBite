// Optional billable Live smoke against an isolated loopback server only.
// Start server with APP_PASSCODE=local-smoke-only, DEMO_MODE=true,
// METRO_STORAGE=memory, GEMINI_LIVE_ENABLED=true and the existing Gemini key.
// No microphone is used. No credentials, audio or transcripts are printed/stored.
import assert from "node:assert/strict";
import { GoogleGenAI, Modality } from "@google/genai";
const base = process.env.LIVE_SMOKE_URL || "http://127.0.0.1:3211";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
let cookie = "";
async function post(path, body) {
  const r = await fetch(base + path, {
    method: "POST",
    headers: {
      origin: new URL(base).origin,
      "Content-Type": "application/json",
      cookie,
    },
    body: JSON.stringify(body),
  });
  for (const item of r.headers.getSetCookie())
    cookie += "; " + item.split(";")[0];
  if (!r.ok) throw new Error("LIVE_HTTP_" + r.status);
  return r.json();
}
const language =
  process.env.LIVE_SMOKE_LANGUAGE === "ta-IN" ? "ta-IN" : "en-IN";
let session;
try {
  await post("/api/login", { passcode: "local-smoke-only" });
  await post("/api/session", {
    fixture: "10000000-0000-4000-8000-000000000001",
  });
  const auth = await post("/api/voice/session", { language });
  const ai = new GoogleGenAI({
    apiKey: auth.token,
    httpOptions: { apiVersion: "v1beta" },
  });
  let resolve,
    reject,
    completed = false,
    callCount = 0,
    toolCalls = 0,
    text = "";
  const done = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  const timeout = setTimeout(() => reject(new Error("LIVE_TIMEOUT")), 18000);
  try {
    session = await Promise.race([
      ai.live.connect({
        model: auth.model,
        config: { responseModalities: [Modality.AUDIO] },
        callbacks: {
          onmessage: async (message) => {
            try {
              if (message.serverContent?.outputTranscription?.text)
                text += message.serverContent.outputTranscription.text;
              const calls = message.toolCall?.functionCalls ?? [];
              if (calls.length) {
                callCount += calls.length;
                if (callCount > 12) throw new Error("LIVE_TOOL_LIMIT");
                const result = await post("/api/voice/tools", {
                  capability: auth.capability,
                  calls: calls.map((c) => ({
                    id: c.id ?? "",
                    name: c.name ?? "",
                    args: c.args ?? {},
                  })),
                });
                toolCalls += calls.length;
                session?.sendToolResponse({
                  functionResponses: result.functionResponses,
                });
              }
              if (message.serverContent?.turnComplete && toolCalls) {
                completed = true;
                resolve();
              }
            } catch {
              reject(new Error("LIVE_TOOL_FAILED"));
            }
          },
          onerror: () => reject(new Error("LIVE_CONNECTION_FAILED")),
          onclose: () => {
            if (!completed) reject(new Error("LIVE_CLOSED"));
          },
        },
      }),
      done,
    ]);
    session.sendClientContent({
      turns: [
        {
          role: "user",
          parts: [
            {
              text:
                language === "ta-IN"
                  ? "என் மாதிரி பயண அட்டையின் இருப்பை கருவிகளைப் பயன்படுத்திச் சரிபார்க்கவும். இது மாதிரி தரவு என்று கூறவும்."
                  : "Use your tools to check my simulated demo card balance. State that this is demo data.",
            },
          ],
        },
      ],
      turnComplete: true,
    });
    await done;
    if (
      !completed ||
      toolCalls < 1 ||
      !/demo|simulat|மாதிரி/i.test(text) ||
      !/286/.test(text) ||
      (language === "ta-IN" && !/[\u0B80-\u0BFF]/.test(text))
    )
      throw new Error("LIVE_FACTUALITY_FAILED");
    console.log(
      JSON.stringify({
        check: "Live SDK + authorized tool bridge",
        language,
        connected: true,
        tool_calls: toolCalls,
        turn_completed: completed,
        has_demo_disclosure: /demo|simulat|மாதிரி/i.test(text),
        has_expected_fixture_balance: /286/.test(text),
        has_tamil: /[\u0B80-\u0BFF]/.test(text),
      }),
    );
  } finally {
    clearTimeout(timeout);
    session?.close();
  }
} catch (e) {
  console.log(
    JSON.stringify({
      check: "Live SDK + authorized tool bridge",
      ok: false,
      category: /^LIVE_[A-Z_0-9]+$/.test(e?.message ?? "")
        ? e.message
        : "LIVE_PROVIDER_UNAVAILABLE",
    }),
  );
  process.exitCode = 1;
}
