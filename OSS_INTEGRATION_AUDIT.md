# OSS integration audit

Initial audit: 2026-11-11; integration review completed 2026-11-12. Existing branch `codex/metrosathi-implementation` retained. The working tree contains the previous MetroSathi implementation as uncommitted changes; these are preserved. No reset, rebuild of the application, deployment, or remote SQL is authorized or needed.

## Existing implementation

| Area         | Current paths                                                                              | Findings / selective improvement                                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gemini Live  | No live endpoint/client; `docs/VOICE_DECISION.md`                                          | Browser fallback only; prior provider probe HTTP 504. Add opt-in constrained Live credential flow, server-authorized tool bridge, browser PCM lifecycle and interruption cleanup; retain default fallback.               |
| Voice        | `lib/voice/browser.ts`, `components/Dashboard.tsx`                                         | Tamil/English recognition, captions, explicit send/read-aloud, denial/unsupported states, 45s timeout and stop/unmount/tab-hide cleanup. Preserve; add shared pronunciation normalization and optional Live adapter.     |
| Localization | `lib/i18n.ts`, `lib/agent/systemPrompt.ts`, Dashboard                                      | Typed dictionaries; repeated client/server auto detection; no persistent preference. Consolidate language resolution and use guarded local preference persistence.                                                       |
| Stations     | `lib/metro/official.ts`                                                                    | Five source-checked English/Tamil names; Blue/Green corridor context; unknown operational state. No canonical lines/stops/transfers or importer. Add validated graph/provenance without inferring missing data.          |
| Fare lookup  | `lib/metro/official.ts`, `/api/fares`                                                      | Four directed records, separate published standard/discount fields, source version/date; missing pairs abstain. Effective date null; no expiry/as-of enforcement. Add freshness policy and historical/future abstention. |
| Storage      | `lib/metro/store.ts`, `lib/supabase.ts`, `supabase/migrations/202611110001_metrosathi.sql` | Explicit memory/Supabase modes, server-only service role, owned queries, signed confirmation + atomic idempotent ticket RPC. Preserve; no production migration.                                                          |
| Auth         | `lib/auth.ts`, `lib/metro/security.ts`, `proxy.ts`, session/login routes                   | Expiring HMAC gate/passenger cookies, public synthetic profiles, origin/size/rate limits; non-demo access fails closed. Reuse for every Live session/tool request.                                                       |
| Gemini tools | `lib/agent/{tools,defineTool,runAgent,systemPrompt}.ts`                                    | 11 strict argument/result schemas, actor closure, bounded rounds/calls/deadline, draft only; model cannot write tickets. Share validated dispatcher with Live and enforce read-only tools there.                         |
| Evaluation   | `tests/`, `scripts/smoke.mjs`                                                              | 25 prior passing tests including SQL isolation and DOM fallback/confirmation. Add checked bilingual factual cases, freshness/unknown/interchange/importer/Live security and regression tests.                            |

## Repository coverage

Inspected inventory of active app/routes, components, lib, SQL/seeds, tests/scripts, configuration, environment-variable names, README, CODEX_PROGRESS and docs; historical sample material is inactive under archive. Secret environment files are excluded. Existing infrastructure, synthetic accounts, ticket confirmation, Supabase choice and current UI are retained. Upstream repositories are reviewed as untrusted reference material; no upstream code is executed.

## Upstream review and implementation status

Review completed. Exact commit/file/license decisions and code-vs-data rights are recorded in OSS_REUSE_REPORT.md. ChennaiGTFS is not an authoritative current fare or timetable source. No stale fares, expired calendar services, unverified Yellow Line records or unclear-license datasets will be promoted into the runtime register.

## Completed selective integration

- Original bounded Python GTFS inspector/stager, checksum-pinned actual feed metadata and strict rights quarantine. The actual source's calendar ends 2021-12-31; no feed fares or service rows entered the app.
- Canonical validated station/line/stop/interchange subset; seven stations with explicit Alandur/Central memberships, no route or Yellow Line invention.
- Read-time fare freshness/date validation and source-qualified deterministic text guards; original paired Tamil/English evaluation cases with planted-bug checks.
- Two small MIT adaptations with exact license notices: Live event organization and locale persistence. Independent Metro speech normalization; no Sarvam source or MPL schema copied.
- Optional constrained Gemini Live credentials, original browser PCM worklet/encoder, interruption/caption/cancellation handling, signed read-only server bridge and cleanup/fallback.
- Actual English and Tamil Live SDK/tool probes succeeded. Real microphone/browser visual quality and hosted Supabase deployment checks remain manual. Default browser/text paths and existing ticket-confirmation infrastructure are preserved.

No npm dependencies, frameworks, authentication provider or production schema were replaced. See the latest CODEX_PROGRESS.md checkpoint for final commands/results.
