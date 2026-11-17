// Minimal billable provider probe; prints categories only, never config values/raw errors.
// Run: node --env-file=.env.local scripts/check-provider.mjs
import { GoogleGenAI } from "@google/genai";
if (!process.env.GEMINI_API_KEY?.trim()) {
  console.log(JSON.stringify({ provider: "gemini", configured: false }));
  process.exitCode = 1;
} else {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const r = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash",
      contents: "Reply with OK only.",
      config: {
        maxOutputTokens: 10,
        httpOptions: { timeout: 12000 },
        abortSignal: AbortSignal.timeout(15000),
      },
    });
    const ok = Boolean(r.text?.trim());
    console.log(JSON.stringify({ provider: "gemini", ok }));
    if (!ok) process.exitCode = 1;
  } catch (e) {
    const message = typeof e?.message === "string" ? e.message : "";
    const status = typeof e?.status === "number" ? e.status : null;
    const category =
      status === 429 || /quota|RESOURCE_EXHAUSTED/i.test(message)
        ? "quota"
        : status === 408 || status === 504 || /timeout|abort/i.test(message)
          ? "timeout"
          : [401, 403, 404].includes(status)
            ? "configuration_or_access"
            : "unavailable";
    console.log(
      JSON.stringify({ provider: "gemini", ok: false, status, category }),
    );
    process.exitCode = 1;
  }
}
