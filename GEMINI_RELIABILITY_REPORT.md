# Gemini reliability investigation

Initial investigation: 2026-11-12. Final local verification: **2026-11-17**. Reliability handling is implemented and tested; **successful ordinary Gemini text generation remains blocked**.

## Baseline and isolated reproduction

Exact configured text model: `gemini-3.8-flash` (validated non-secret model identifier). Installed Google GenAI SDK 3.0.0, Node v24.7.0. Permanent key is configured and was never printed. No Google base-URL/Vertex or HTTP(S)/ALL proxy overrides were present. The original text path used Gemini Developer API /v1beta on generativelanguage.googleapis.com; its Vercel route had maxDuration=60 seconds, with a 25-second application deadline and 20-second per-provider timeout. The updated bounds are below.

`scripts/diagnose-gemini.mjs` sends only "Reply with OK only." (19 characters), no conversation history or tools, with SDK automatic retries disabled and hard timeouts. Results before reliability changes:

| Variant | Actual result | Elapsed |
| --- | --- | --- |
| SDK generateContent, original generation settings | HTTP 503 | 2089 ms |
| SDK generateContent, explicit v1beta, low thinking | HTTP 503 | 1939 ms |
| SDK streamGenerateContent, low thinking | HTTP 503, no chunk | 1987 ms |
| Direct REST generateContent (no SDK server-timeout header) | HTTP 503 | 3628 ms |
| Direct stateless Interactions (store=false) | HTTP 503 | 16556 ms |

These minimal reproductions eliminate application history size and tool execution as necessary causes of this incident. Streaming did not bypass the observed failure. The same failure through direct REST means this is not isolated to the SDK wrapper. No 429/quota or 401/403/404 configuration errors were observed in this matrix. This is evidence of provider-side unavailability for these requests, not proof of the provider's internal root cause or a guarantee that quota is healthy.

Google's current docs list gemini-3.8-flash and explicitly say legacy generateContent remains supported. Therefore the app is not rebuilt around another API merely to hide the failure. Interactions was tested statelessly; no passenger transcript was sent or persisted.

## Implemented reliability changes

- Explicit Developer API routing (`vertexai:false`, `v1beta`, known Google base URL). SDK retry attempts set to one; the application owns retries.
- At most three attempts per generation round and seven provider attempts across a tool conversation; transient 408/429/500/502/503/504 and network/timeout failures only. Backoff is 300/600 ms plus bounded jitter. Short Retry-After is respected; waits over five seconds and recognized daily/billing quota failures are not retried. Tool execution is not replayed by the retry mechanism.
- Twelve-second per-attempt abort and 45-second whole-request deadline, enforced even if SDK cancellation is ignored; incoming disconnect abort propagated. Route maximum remains 60 seconds; client waits at most 50 seconds. Actual hosted function execution limits must still be checked in Preview.
- Context bounded to the last 12 whole messages and 16,000 UTF-8 bytes, retaining the current question; API separately bounds message length/count and total body at 40 KB. Tool rounds/calls remain capped. No transcript logging.
- Low thinking for compatible model generations; deprecated temperature setting removed. Existing tools, evidence guards, confirmation and ownership behavior retained. Streaming is not adopted without evidence it helps this incident.
- Generated UUID correlation ID returned in JSON and X-Request-ID. Safe logs contain model/known endpoint, counts, byte sizes, attempt/duration/numeric status, error category and backoff. Keys, request URLs, passenger text, tool arguments/results and raw provider errors are excluded.
- Provider errors now use truthful HTTP 504 (timeout), 429 (quota) or 503 (unavailable/configuration), with localized English/Tamil explanations and explicit Retry UI. Safe provider text remains visible even on a non-2xx response. Clearing conversation/passenger selection clears the retry target. Retry-After is sent on quota responses; no fabricated balance/fare response is substituted.

## Actual verification

| Check | Result |
| --- | --- |
| Added retry/cancellation/byte-boundary/log tests and HTTP-504 UI regression | PASS; included in 57 total tests |
| Actual English browser request, 12 November | Three provider 504s (~10.4/10.1/10.2 seconds), application HTTP 504 after 31.9 seconds; visible timeout message, matching reference and Retry button; no tools ran |
| Actual Tamil-script HTTP request, 12 November | Two provider 504s then 503; HTTP 503 after 24,870 ms, Tamil explanation, matching correlation ID, no-store, zero tool calls |
| Actual code-mixed Tamil/English, auto language, 12 November | Provider 503 then 429; HTTP 429 after 2,274 ms, Tamil quota message, matching correlation ID, no-store, zero tool calls. Account/model quota is therefore an observed additional blocker; no internal quota-limit details exposed |
| Isolated SDK low-thinking request re-run, 17 November | **HTTP 504 after 16,160 ms**; 19-character prompt, no history or tools. No successful text recovery claimed |
| Local production smoke with intentionally missing key | PASS; HTTP 503 / AI_CONFIGURATION, safe Tamil explanation and correlation ID |
| Full validation, 17 November | 57 tests, typecheck, optimized build, audit (0 vulnerabilities) PASS |

The application deadlines and retries mitigate hangs and transient faults; they do not establish that Google/account availability is restored. Repeated model-specific 503/504 and observed 429 require the account owner to check Google AI Studio model entitlement, project billing/quotas and provider status, then rerun `scripts/diagnose-gemini.mjs sdk-low` followed by an actual successful tool conversation in both languages. The app's health endpoint is configuration evidence, not a provider health probe. No automatic switch to another model/provider is used.

Reproduction: `node --env-file=.env.local scripts/diagnose-gemini.mjs sdk-low` (minimal, billable); use `all` for the diagnostic matrix only when needed. `scripts/check-agent-reliability.mjs` exercises two synthetic local HTTP turns with a throwaway local passcode. It prints metrics/categories only and rejects non-loopback targets. The original provider probe remains available. Do not attach real passenger transcripts to diagnostics.

Sources checked: [model](https://aistudio.google.com/docs/models/gemini-3.8-flash), [troubleshooting / retries](https://aistudio.google.com/docs/troubleshooting), [Interactions and generateContent support](https://aistudio.google.com/docs/interactions-overview), [Vercel duration](https://vercel.com/docs/functions/configuring-functions/duration). Installed SDK source/type definitions were also inspected: timeout adds an X-Server-Timeout header, retryOptions can explicitly disable nested retries, and httpOptions supports explicit API version/base URL.
