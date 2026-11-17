# MetroSathi Preview readiness checkpoint

Updated **2026-11-17 (Asia/Kolkata)**. Branch `codex/metrosathi-implementation`. This checkpoint supersedes historical validation statements below.

**Safe local work is complete; a verified functional Preview is not claimed.** The user requested GitHub delivery and explicitly elected to keep all remote SQL unexecuted. No Production deployment, merge, database migration or private passenger access occurred.

- Recovered the intact original checkout from the Mac's Trash to `/Users/dhruvmishra/Desktop/Github/campusbite-live`; preserved the source copy and unrelated ClaimPilot project. Retained all previous uncommitted implementation/OSS work.
- Added isolated SDK/REST/streaming/Interactions diagnostics, explicit Gemini Developer API routing, 45-second overall / 12-second attempt deadlines, bounded transient retry/backoff and a seven-attempt request budget, byte-bounded context, correlation IDs and safe diagnostic logs. Preserved tools, confirmation, evidence checks and ownership restrictions.
- Added honest 504/429/503 API responses, English/Tamil error explanations and an explicit Retry control that preserves provider errors on non-2xx responses. Added seven regression tests; no new npm dependencies. Pinned Node 24.x for reproducible Preview builds.
- **Gemini remains externally blocked:** initial matrix failed with provider 503; actual English request exhausted three 504 attempts; Tamil and mixed-script requests returned localized 503/429. Minimal SDK recheck on 17 November still returned 504 after 16,160 ms. No successful ordinary text recovery or fabricated fallback claimed.
- Identified isolated Supabase staging `paknrdenraxaoiwoxnfb`. Browser metadata and newly connected Supabase tools confirm only the starter public.tasks table (RLS enabled, no policies), no Metro tables and no migrations. One informational advisor finding recorded. No rows opened and no SQL executed; user explicitly declined remote execution. Prepared a file-specific migration/seed/ownership/persistence checklist.
- Actual Safari login, synthetic fixture selection, dashboard layout and English timeout/reference/retry rendering observed on 12 November. Native automation was intermittent and its tool namespace was later removed. Automated voice/UI tests do not certify physical microphone, Tamil transcription/pronunciation or mobile acceptance.
- Audited current official CMRL sources: Yellow passenger service commenced 11 October 2026, missing from runtime. Confirmed fare-page publication/update date without inventing an effective date. Preserved sparse fares and GTFS licensing quarantine; recorded current-card-policy reconciliation and incomplete station/transfer/fare coverage as release limitations.
- Rechecked Vercel configuration read-only: existing project campus-bite, Production branch main, missing Preview passcode/Gemini credentials and explicit demo configuration. No remote environment changes, deployments or linking performed.

## Final local validation (17 November)

- `npm ci --ignore-scripts`: PASS; existing lockfile, no new dependencies.
- `npm test`: **PASS — 57 tests / 10 files**.
- `npm run typecheck`: PASS.
- `npm run build`: PASS — optimized build, 18 generated routes/pages.
- `npm audit`: PASS — 0 vulnerabilities.
- Local production HTTP smoke: PASS on the recovered optimized build.
- Diff whitespace and secret scans: PASS; 115 candidate files and 14 client static files checked, no configured secrets found, no secret environment files tracked.

## Delivery and remaining human actions

All five requested reports are present: GEMINI_RELIABILITY_REPORT.md, SUPABASE_HOSTED_VALIDATION.md, BROWSER_QA_REPORT.md, RELEASE_READINESS.md and this progress log. DATA_PROVENANCE.md includes the fresh official-source coverage audit. Preview execution instructions preserve the existing Next.js / TypeScript / Supabase / Gemini / Vercel architecture.

Remaining: restore successful Gemini text service/quota, configure Preview-scoped secrets, complete physical voice/mobile/native Tamil acceptance and data-policy coverage review. Hosted persistence needs a separately approved staging setup; real registration/admin remain unimplemented. A restricted memory-only synthetic demo can be reviewed but cannot be labelled database-persistence verified. Production remains prohibited without explicit approval.

Implementation commit `172b7c2` was successfully pushed to [1HPdhruv/CampusBite, codex/metrosathi-implementation](https://github.com/1HPdhruv/CampusBite/tree/codex/metrosathi-implementation) on 17 November. This documentation follow-up records the completed delivery. No merge into main, manual deployment or remote SQL was performed. The final remote head and clean working tree are checked after pushing this follow-up.

---

# MetroSathi OSS integration checkpoint

Updated: **2026-11-12 (Asia/Kolkata)**. Branch `codex/metrosathi-implementation` retained; all prior uncommitted implementation work preserved. This checkpoint supersedes the historical initial-implementation report below.

**Safe local integration is complete and automated checks pass.** Live SDK + authorized tool calling was verified with actual Gemini sessions in English and Tamil. Ordinary text-model requests still timed out and returned safe localized fallbacks. Real microphone/device/native-Tamil QA and hosted Supabase validation remain outstanding. No deployment, production migration or private passenger access occurred.

## Requested stages

- [x] Stage 1: inspected repository inventory, progress, architecture, data, voice, localization, authentication, Supabase and tools; created `OSS_INTEGRATION_AUDIT.md`.
- [x] Stage 2: reviewed all six required repositories plus optional CMRL-DATASETS, pinned exact revisions, inspected requested paths (TransitSave's paths are nested under `transitsave-main/`), read actual licenses/notices and checked code/data rights separately. Two large full clones were interrupted after targeted pinned files had been obtained; no upstream code was executed.
- [x] Stage 3: selective extensions, preserving Next/TypeScript/Supabase/Gemini/Vercel and the existing application. No new npm dependencies.
- [x] Stage 4: `OSS_REUSE_REPORT.md`, full MIT notices for the two adapted patterns, review-only license/NOTICE snapshots, independent MPL design implementation and dataset exclusions.
- [x] Stage 5: original regression/security/voice/data tests, all four required commands, provider checks and local production HTTP smoke.
- [x] Stage 6: required audit/reuse/provenance/progress files plus README, architecture, security, voice decision, deployment, source and seed docs updated.

## Selective changes

- `scripts/import-chennai-gtfs.py`: original stdlib ZIP/CSV inspector/stager with agency filtering, pinned SHA/checksum, bounded archive/rows, parent/ID validation, explicit dataset rights gate, no fares/timetables, no automatic runtime promotion or DB access. Actual feed metadata in `data/chennai-gtfs-inspection.json`; raw community data is not redistributed.
- `lib/metro/network.ts`: original validated canonical model; seven stations, two Blue/Green corridor records, nine station/line stops and four directed Alandur/Central interchange edges. New English names checked against official chart; new Tamil names left null. Operational state/route adjacency/current full network remain unknown.
- `lib/metro/fare-policy.ts`: original directed, dated records and read-time 30-day local review window. `asOf` date control/API/tool validation; unknown/stale/future/unsupported historical fares abstain. Existing four fare pairs and independent published discount values preserved.
- `lib/agent/grounding.ts` and `evals/metro-cases.json`: deterministic text evidence/citation guard, no guessed fare after abstention, original paired Tamil/English fact cases, negative controls and source/version assertions. This is regression evidence, not a measured LLM accuracy or native-language score.
- `lib/voice/live-events.ts`: MIT-adapted event organization from voice-agent-oss; bounded captions, all audio parts, interruption and cancelled-tool handling. Original PCM encoder/worklet/browser lifecycle, opt-in `LiveVoicePanel`, authenticated constrained-token endpoint and passenger-bound read-tool bridge. No telephony stack, transcript persistence or browser-trusted business logic.
- `lib/useLanguagePreference.ts`: MIT-adapted persistence pattern from TransitSave with SSR/validation/storage-error handling; existing dictionaries retained. Original shared detection and speech-only Metro pronunciation normalization. No stale fares or translations copied.
- `seed/20261111_station_reference.sql`: optional additive two-station reference seed, tested locally. Existing migrations/storage/auth/ticket confirmation preserved and no remote SQL applied.

## Upstream / rights decisions

- ChennaiGTFS exact code license MIT; README compilation ODbL/PDDL claims do not clear mirrored agency rights. Feed collected 2026-10-04 contains an expired 2021-12-31 calendar and a 2021 fare reference; it cannot establish Yellow Line service. Metadata-only inspection, runtime promotion blocked.
- voice-agent-oss and TransitSave: two small MIT source-pattern adaptations, copyright notices and full license copies retained.
- OpenMetro: MPL-2.0 reviewed; no covered source/schema/data copied. Original Zod code differs deliberately (unknown service state, sparse directed fares, no symmetric/zero-fare assumptions).
- Sarvam: README claims MIT but checked tree has no LICENSE. No code copied; optional provider considered but not added. Original pronunciation logic only.
- Fare Policy Assistant: Apache-2.0 original methodology/NOTICE reviewed; known failing upstream gates considered, not inherited or claimed passing. No California corpus, scores or judge code copied.
- CMRL-DATASETS: aggregate ridership, no reviewed LICENSE, not needed and excluded. No passenger data access.

## Actual final validation

| Check                                                                      | Result                                                                                                                                                                                         |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                                                                 | **PASS — 50 tests across 9 files**                                                                                                                                                             |
| `npm run typecheck`                                                        | PASS                                                                                                                                                                                           |
| `npm run build`                                                            | PASS — optimized Next build with 18 routes/pages, protected proxy                                                                                                                              |
| `npm audit`                                                                | PASS — 0 vulnerabilities                                                                                                                                                                       |
| `git diff --check`                                                         | PASS                                                                                                                                                                                           |
| `node scripts/smoke.mjs`, isolated latest production build                 | PASS — existing gate/identity/cards/recharge/fare/ticket/retry/isolation/logout plus Central lookup, future/invalid-date abstention and disabled Live endpoint                                 |
| Actual CMRL GTFS archive inspection                                        | PASS as inspection only: SHA-256 recorded, 254 stop/entrance/platform rows, 28 routes, one calendar ending 2021-12-31; rights and service warnings retained; no source rows imported           |
| Authorized Live token issuance                                             | PASS — HTTP 200; no credential values printed                                                                                                                                                  |
| Unauthorized Live session / forged tool capability                         | PASS — HTTP 401 / 403                                                                                                                                                                          |
| `node scripts/check-live.mjs` against isolated key-configured local server | PASS — English SDK connected, one authorized tool call, completed turn, expected synthetic balance + demo disclosure; generated audio discarded                                                |
| `LIVE_SMOKE_LANGUAGE=ta-IN node scripts/check-live.mjs`                    | PASS — Tamil SDK connected, one authorized tool call, completed turn, Tamil text + expected synthetic balance + demo disclosure; no microphone used                                            |
| Actual English/Tamil ordinary `/api/agent` requests                        | **External limitation: AI_TIMEOUT**, HTTP 200 with safe localized fallback, no successful text-model turn/tool call claimed                                                                    |
| Client bundle / candidate source secret scans                              | No permanent Gemini/Supabase/passcode variable names in `.next/static`; no secret-value patterns in app/docs/tests/data. Existing secret environment files never printed, changed or committed |
| Device/browser microphone/visual quality                                   | NOT VERIFIED — simulated lifecycle/PCM/permission/fallback tests are not a real-device acceptance test                                                                                         |

The installed GenAI SDK 3 prints an older v1alpha-only ephemeral-token warning. Current official docs and actual v1beta English/Tamil Live checks succeeded; v1beta is retained and this caveat documented rather than hiding the warning. No SDK update was needed.

## Remaining blockers / safe next steps

- Restore/verify the separate text `generateContent` provider/model path: actual probes still timed out. Existing card/fare/support panels and optional Live read flow are available; no successful ordinary text conversation is claimed.
- Perform real-browser microphone input, native-rate PCM/playback, denial/stop/tab-hide/navigation and desktop/mobile/accessibility review. Obtain native Tamil pronunciation/label review. Live SDK tests used typed synthetic questions, not a real microphone.
- Clear mirrored GTFS dataset rights and obtain current officially verified service data before any promotion. Full network/Yellow Line, full fare matrix and live service updates remain unverified; missing records abstain.
- Review/apply migration/seeds to Supabase only with explicit approval for that exact remote action, then test hosted ownership/RPC. No production auth, operator integration or deployment added.

Default local run remains `DEMO_MODE=true METRO_STORAGE=memory npm run dev`. To opt into Live locally, add `GEMINI_LIVE_ENABLED=true` and keep the existing server-only Gemini key; `GEMINI_LIVE_MODEL` is optional. Browser voice remains the default. Follow `docs/DEPLOYMENT_CHECKLIST.md` before requesting a preview separately. All changes remain local/uncommitted for review; test servers are stopped after verification.

---

# Historical initial implementation checkpoint (2026-11-11)

The following report is retained as history; its test counts, provider status and browser-only voice decision describe the initial implementation, not the latest OSS checkpoint above.

# MetroSathi implementation progress

Last updated: 2026-11-11 (Asia/Kolkata). Branch: `codex/metrosathi-implementation`.

**Status: local prototype implemented and automated checks pass. Full external/demo acceptance is not claimed:** live Gemini checks did not succeed; real-browser/microphone QA and hosted Supabase validation remain outstanding. No production deployment or remote SQL was performed.

## Audit and architecture

- Read the complete supplied master prompt and inspected Git, current branch/history, source/config, SQL, old demo docs, CLAUDE and Copilot rules. Main was clean at `0d79101`; created the feature branch. No pre-existing user edits were overwritten.
- Preserved Next App Router, React, TypeScript, Tailwind, Google GenAI SDK, Zod adapter, lazy server-only Supabase client, environment names and Vercel/Next configuration.
- Replaced active sample UI/APIs/tools and stale instructions with MetroSathi. Historical SQL/demo docs moved to inactive `archive/`, with a do-not-run notice.
- Shared team passcode protects quota; separate signed 12-hour HttpOnly SameSite Strict cookies bind a selected public demo fixture. Non-demo passenger access fails closed.
- Prefixed public `metro_*` tables avoid exposing a new PostgREST schema. RLS is enabled, anon/authenticated grants revoked, sensitive access is server-only. Ticket RPC is service-role only.
- Default memory mode permits local review without remote SQL; explicit Supabase mode supports persistent tickets after approved migration and never silently falls back on failure.

## Phases delivered

- [x] A — audit, clean branch, inactive legacy material, MetroSathi shell, metadata, navigation and passcode protection.
- [x] B — official source register, four directed checked fare pairs with separate standard/discounted values, five English/Tamil station records, dated lost-card policy, source-qualified recharge/contact help; additive migration and idempotent synthetic seeds.
- [x] C — demo identity and expiry, authorization and ownership, strict bounded argument/result schemas, 11 server tools, bounded Gemini loop, timeouts, safe errors/log metadata, origin checks, body limits, local quotas, API routes, signed ticket draft + confirmation + retry/replay protection.
- [x] D — responsive bilingual dashboard, English/Tamil/Auto, text conversation and quick actions, card/transaction/recharge panels, station search/fare lookup, support listing/review/cancel/confirm, official help, disclosure and accessible form/focus states.
- [x] E — current official Live/ephemeral-token/Tamil/function-call docs and installed SDK investigated; browser speech adapter implemented with captions, editable transcript, explicit send/read-aloud, stop, permission errors, text fallback, timeout and navigation/unmount cleanup. Live streaming not shipped because account/network compatibility could not be established; see `docs/VOICE_DECISION.md`.
- [x] F — 25 passing automated tests, production build/typecheck, local HTTP smoke, dependency audit, private-client-bundle/stale-copy checks. Real visual/mic QA explicitly remains manual.
- [x] G — README, environment reference, architecture, data-source register, judge script, security/limitations, voice decision, deployment checklist, seed guide and this report match the implementation.

## Actual verification results

| Command / check                                                   | Actual result                                                                                                                                                                                                     |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                               | PASS                                                                                                                                                                                                              |
| `npm test`                                                        | PASS: 25 tests, 4 files                                                                                                                                                                                           |
| `npm run build`                                                   | PASS: optimized Next production build, 16 generated routes/pages, protected proxy                                                                                                                                 |
| `npm audit`                                                       | PASS: 0 vulnerabilities                                                                                                                                                                                           |
| `node scripts/smoke.mjs` against isolated local production server | PASS: gate, fixture identity, account ownership, cards, pending recharge, known/unknown fare, explicit ticket confirmation, retry, cross-session isolation, origin protection, disabled-provider fallback, logout |
| PGlite SQL test (included in `npm test`)                          | PASS: migration, seed twice, 3 profiles / 4 cards / 8 category-specific fare records, constraints, service-role RPC, replay/idempotency, one audit event, anon/authenticated denials                              |
| Rendered DOM tests (jsdom, included in `npm test`)                | PASS: unsupported speech, denied mic, recognition abort on unmount, usable text input, Tamil labels, support form, focused draft review, cancel without write, confirm then one write                             |
| Live local English/Tamil `/api/agent` checks                      | Safe localized fallback returned; no tool calls or successful generated conversation verified                                                                                                                     |
| Minimal direct Gemini SDK request                                 | FAILED external check: HTTP 504; no raw provider details or secret values reported                                                                                                                                |
| Official source PDF inspection                                    | PASS: downloaded official standard/discount charts and Phase I map, rendered via Poppler, enlarged fare cells and five Tamil names visually checked; intermediate files removed                                   |
| UI/browser visual review                                          | NOT VERIFIED: browser host unavailable; native Safari/Brave attempts returned `cgWindowNotFound`                                                                                                                  |
| Client bundle / secret scan                                       | No permanent secret variable names in `.next/static`; no key patterns in application/docs/tests; only `.env.example` tracked; actual secret values never printed or changed                                       |
| Active source stale-product scan and `git diff --check`           | PASS; historical names exist only in inactive archive and deliberate negative tests                                                                                                                               |

Initial verification caught stale generated Next route types, an unavailable optional test-runner native binding, a public-host/internal-URL mismatch in the origin check, and a formatter-sensitive source assertion. These were corrected. Vitest 4.1.12 + Vite 7.3.8 run without the problematic Rolldown path; dependency fixes are locked and the final audit reports zero vulnerabilities.

## Important implementation files

- `components/Dashboard.tsx`, `app/globals.css`, `lib/i18n.ts`, `lib/voice/browser.ts`.
- `lib/auth.ts`, `lib/metro/security.ts`, `lib/metro/store.ts`, `lib/metro/results.ts`.
- `lib/agent/tools.ts`, `lib/agent/runAgent.ts`, `lib/agent/systemPrompt.ts`.
- `lib/metro/official.ts`, `supabase/migrations/202611110001_metrosathi.sql`, `seed/metrosathi.sql`.
- `tests/`, `scripts/smoke.mjs`, `scripts/check-provider.mjs`, `docs/`.

## Remaining external checks and manual steps

- [ ] Restore/verify Gemini API connectivity and account/model access. Reproduce safely with `node --env-file=.env.local scripts/check-provider.mjs` (minimal billable request; outputs only status/categories). Then rerun a Tamil and English tool-backed conversation. A successful AI demo is not claimed from this run.
- [ ] Real-device desktop/mobile visual and keyboard/screen-reader review; actual Tamil/English mic, permission-denial, installed Tamil voice and browser-provider testing. Simulated DOM tests do not prove speech service availability.
- [ ] Native Tamil review. No translations are labelled official.
- [ ] For durable storage: approve and manually apply the reviewed migration once and seed to the intended Supabase project; then set `METRO_STORAGE=supabase` and run hosted ownership/RPC/readiness smoke. No remote SQL has been executed. The additive migration is versioned/one-time; the seed is repeatable.
- [ ] Expand official data only after source verification. Current coverage is five station records and four directed fare pairs (eight standard/discount rows), not the full network/matrix. Unknown pairs return unverified. Effective fare date and current discount eligibility are not inferred. Recharge guidance is partial/historical; operational flags remain null.
- [ ] Real production passenger authentication, distributed quotas, retention policy and any real operator/payment integration are beyond this prototype and disabled/unavailable. Production deployment requires explicit approval.

## Safe local run and preview next step

Keep existing secret values configured locally. No secret environment values have been modified. Run:

```sh
DEMO_MODE=true METRO_STORAGE=memory npm run dev
```

Open http://localhost:3000, enter the existing team passcode, and select a synthetic passenger. Gemini uses existing `GEMINI_API_KEY` and optional `GEMINI_MODEL`; Supabase mode uses existing `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. Memory-mode tickets are temporary and per server process; this is disclosed in the support UI.

Review locally first, resolve the external provider check and device QA, then request a Vercel preview separately. No preview or production deployment was initiated. Changes remain local and uncommitted on the feature branch for review.
