# Voice decision and validation — updated 2026-11-12

Browser recognition/synthesis remains the default. Optional Gemini Live is implemented behind `GEMINI_LIVE_ENABLED=true`, using existing `GEMINI_API_KEY` on the server and optional `GEMINI_LIVE_MODEL` (default stable `gemini-3.8-live`). No new dependency or permanent client-side key was introduced.

## Official API and installed SDK review

- [Live model](https://aistudio.google.com/docs/models/gemini-3.8-live) documents the stable model and function calling.
- [Ephemeral tokens](https://aistudio.google.com/docs/live-api/ephemeral-tokens) documents client-to-server short-lived credentials, server constraints and v1beta.
- [Overview](https://aistudio.google.com/docs/live-api), [capabilities/Tamil](https://aistudio.google.com/docs/live-api/capabilities), and [tools](https://aistudio.google.com/docs/live-api/tools) describe 16kHz PCM input, 24kHz PCM output, captions and tool responses.
- Installed `@google/genai` 3.0.0 exposes authTokens and live.connect, but prints an older v1alpha-only warning for ephemeral tokens. Actual constrained v1beta connections succeeded for both English and Tamil in this environment. v1beta is retained according to current official documentation and observed behavior; no undocumented model ID or telephony endpoint is used.

## Browser fallback

Explicit mic click → browser recognition → editable caption → explicit send → validated text agent → optional read-aloud. Selected Tamil/English controls the recognition locale; Auto uses the last inferred locale, English initially. Missing browser recognition or Tamil system voice produces a usable text alternative. Shared speech-only normalization expands transit acronyms/currency and substitutes already verified Tamil station names without altering displayed text, stored details or amounts. Only the language preference is persisted.

## Optional Live

Explicit Live click → mic permission → same-origin authorized credential endpoint → browser SDK connection with one-use, 30s-start/90s-expiry constraints → native mono audio worklet → original 16kHz signed PCM16 encoder → Gemini. Generated PCM output uses Web Audio. The UI exposes transient captions and clearly labels demo data. All parts in each provider event are processed. Interruption clears queued audio; cancelled tool calls suppress late responses.

The browser sends requested tool names/arguments to a signed passenger-bound server bridge; it never runs trusted business logic itself. Every request rechecks session identity, origin, expiry, schemas, ownership and quotas. Only read tools are available. Support tickets continue to require the existing visible review/confirmation flow. Stop, 45s timeout, failure, navigation/unmount, tab hide and language change close sessions/contexts/nodes and stop tracks. Late permission grants and connections cannot revive a stopped session. Failure leaves browser voice/text available; it never triggers a second mic capture automatically.

Audio goes directly to Google in Live mode; the app persists no raw audio or full transcript. The server logs tool names/outcomes/timings only. SDK probes use synthetic typed queries and discard generated audio; no real microphone was accessed.

## Actual evidence

- Authorized Live token issuance returned HTTP 200. Unauthorized requests and forged tool capabilities were rejected.
- English SDK probe: connected, one authorized tool call, completed turn, expected synthetic balance and demo disclosure.
- Tamil SDK probe: connected, one authorized tool call, completed turn, Tamil text, expected synthetic balance and demo disclosure.
- `scripts/check-live.mjs` reproduces these billable checks against an isolated loopback server, printing booleans/categories only; `LIVE_SMOKE_LANGUAGE=ta-IN` selects Tamil.
- Unit/DOM tests cover constrained config, actor isolation, invalid/expired calls, cancelled results, captions, interruption, PCM rate conversion, permission denial, late-grant cleanup and usable fallback.
- Real-browser microphone/PCM transport/playback quality, native Tamil pronunciation and visual/accessibility review remain manual. Successful SDK probes are not a claim that every browser/device or model utterance is correct.

Sarvam was considered but not integrated. Its reviewed source tree lacks the LICENSE referenced by its README, and a new provider/account is unnecessary for the working Gemini/browser paths. No Twilio or MongoDB was introduced.
