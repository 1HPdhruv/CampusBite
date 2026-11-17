// Minimal, isolated billable text diagnostics. No user history, keys, raw errors or text output.
// node --env-file=.env.local scripts/diagnose-gemini.mjs [all|sdk-default|sdk-low|sdk-stream|rest|interactions]
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { readFileSync } from "node:fs";
const key = process.env.GEMINI_API_KEY?.trim();
const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
if (!key || !/^[a-zA-Z0-9._/-]{1,100}$/.test(model)) {
  console.log(
    JSON.stringify({ configured: false, category: "invalid_configuration" }),
  );
  process.exit(1);
}
const sdkVersion = JSON.parse(
  readFileSync(
    new URL("../node_modules/@google/genai/package.json", import.meta.url),
    "utf8",
  ),
).version;
console.log(
  JSON.stringify({
    model,
    sdk: sdkVersion,
    endpoint_host: "generativelanguage.googleapis.com",
    api_version: "v1beta",
    prompt_characters: 19,
    history_messages: 0,
  }),
);
const ai = new GoogleGenAI({
  apiKey: key,
  vertexai: false,
  httpOptions: {
    apiVersion: "v1beta",
    baseUrl: "https://generativelanguage.googleapis.com",
  },
});
const prompt = "Reply with OK only.";
function category(e) {
  const m = String(e?.message ?? "");
  const status = typeof e?.status === "number" ? e.status : null;
  return {
    status,
    category:
      status === 429
        ? "quota"
        : status === 408 || status === 504 || /timeout|abort/i.test(m)
          ? "timeout"
          : [400, 401, 403, 404].includes(status)
            ? "configuration_or_access"
            : /fetch|network|ECONN|ENOTFOUND/i.test(m)
              ? "network"
              : "provider_error",
  };
}
async function check(variant) {
  const start = Date.now(),
    signal = AbortSignal.timeout(20000);
  let firstChunkMs = null;
  const config = {
    maxOutputTokens: 64,
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    abortSignal: signal,
    httpOptions: { timeout: 18000, retryOptions: { attempts: 1 } },
  };
  try {
    let ok = false;
    if (variant === "sdk-default") {
      const r = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          maxOutputTokens: 32,
          temperature: 0.2,
          abortSignal: signal,
          httpOptions: { timeout: 12000, retryOptions: { attempts: 1 } },
        },
      });
      ok = !!r.text?.trim();
    } else if (variant === "sdk-low") {
      const r = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });
      ok = !!r.text?.trim();
    } else if (variant === "sdk-stream") {
      const stream = await ai.models.generateContentStream({
        model,
        contents: prompt,
        config,
      });
      let length = 0;
      for await (const part of stream) {
        if (firstChunkMs === null) firstChunkMs = Date.now() - start;
        length += part.text?.length ?? 0;
      }
      ok = length > 0;
    } else {
      const interactions = variant === "interactions";
      const body = interactions
        ? {
            model,
            input: prompt,
            store: false,
            generation_config: { max_output_tokens: 64, thinking_level: "low" },
          }
        : {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 64,
              thinkingConfig: { thinkingLevel: "low" },
            },
          };
      const path = interactions
        ? "interactions"
        : `models/${encodeURIComponent(model)}:generateContent`;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${path}`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal,
        },
      );
      if (!response.ok) {
        await response.body?.cancel();
        throw { status: response.status };
      }
      const result = await response.json();
      ok = interactions
        ? Boolean(
            result.output_text ||
            result.outputs?.length ||
            result.steps?.length,
          )
        : Boolean(
            result.candidates?.some((c) =>
              c.content?.parts?.some(
                (p) => typeof p.text === "string" && p.text.trim(),
              ),
            ),
          );
    }
    console.log(
      JSON.stringify({
        variant,
        ok,
        elapsed_ms: Date.now() - start,
        first_chunk_ms: firstChunkMs,
        status: 200,
      }),
    );
    return ok;
  } catch (e) {
    console.log(
      JSON.stringify({
        variant,
        ok: false,
        elapsed_ms: Date.now() - start,
        first_chunk_ms: firstChunkMs,
        ...category(e),
      }),
    );
    return false;
  }
}
const selected = process.argv[2] || "all";
const variants = [
  "sdk-default",
  "sdk-low",
  "sdk-stream",
  "rest",
  "interactions",
];
if (selected !== "all" && !variants.includes(selected))
  throw new Error("Unknown diagnostic variant");
const results = await Promise.all(
  (selected === "all" ? variants : [selected]).map(check),
);
if (!results.some(Boolean)) process.exitCode = 1;
