# MetroSathi release readiness

Updated **2026-11-17**, branch `codex/metrosathi-implementation`.

**Safe local work is complete and ready for code review. A verified functional Vercel Preview is still blocked.** No Production deployment, branch merge or remote SQL was performed. The user explicitly requested GitHub push and elected to keep staging SQL unexecuted.

## Verified locally

| Check | Result |
| --- | --- |
| `npm ci --ignore-scripts` | PASS; lockfile retained, no new dependencies |
| `npm test` | PASS — 57 tests, 10 files |
| `npm run typecheck` | PASS |
| `npm run build` | PASS — optimized Next build, 18 generated routes/pages |
| `npm audit` | PASS — 0 vulnerabilities |
| `git diff --check` / candidate secret scan | PASS — 115 candidate files checked, no configured-secret matches; no secret env files tracked |
| Client bundle secret-value scan | PASS — 14 static files, zero configured-secret matches |
| Local production HTTP smoke | PASS — gate, identity, ownership, cards/recharge/transactions, sparse dated fares/abstention, confirmation/retry/isolation, origin protection, provider error and logout |
| Desktop Safari | Login, fixture selection, dashboard and actual timeout/retry UI observed; device voice/mobile QA incomplete |
| Actual text provider | FAILED: minimal SDK recheck on 17 November returned 504 after 16,160 ms; earlier SDK/REST/streaming failures and quota response documented |
| Supabase staging metadata | Connector confirms healthy project, only public.tasks with RLS, no migrations; Metro schema not provisioned |

The repository was recovered by copying its intact working tree from the Mac's Trash back to `/Users/dhruvmishra/Desktop/Github/campusbite-live`. The source copy and unrelated ClaimPilot repository were preserved. All tests listed above were re-run on the recovered MetroSathi branch. Dependency versions/infrastructure were preserved; package.json and lockfile now pin Node **24.x**, matching local v24.7.0 rather than implicitly selecting untested Node 26.

## Read-only Vercel configuration audit

Rechecked 17 November via authenticated CLI; no environment values displayed or settings changed. Git remote is `1HPdhruv/CampusBite`; Vercel project `campus-bite` is linked to `CampusBite`, Next.js, repository root, Production branch **main**. Project runtime selection is 26.x; the new repository engines override selects supported 24.x for future builds. Existing deployed Production was not modified or claimed to run this unpushed implementation.

| Environment key | Existing target scopes |
| --- | --- |
| GEMINI_API_KEY | Production only |
| GEMINI_MODEL | Production only; actual remote value not read |
| APP_PASSCODE | Production only |
| SUPABASE_URL | Preview and Production; value/target correctness not assumed |
| SUPABASE_SECRET_KEY | Production only |
| DEMO_MODE / METRO_STORAGE / Live flags | No explicit remote entries observed |

Preview currently lacks required Gemini credentials/passcode, plus explicit demo configuration. A build can succeed with lazy configuration while runtime login/provider access fails. Production-only variables are not Preview configuration. No secrets may use NEXT_PUBLIC_. A successful Git push or automatic Preview build is not runtime acceptance.

## Blockers and release choices

1. **Gemini availability/quota:** owner checks model access, quota/billing and provider status; obtain a successful ordinary text + authorized tool conversation in English and Tamil on the configured Preview. Timeout/retry handling is verified; provider recovery is not.
2. **Staging persistence:** target `paknrdenraxaoiwoxnfb` is identified but lacks Metro tables. Remote SQL is intentionally unexecuted at the user's request. A memory-only restricted demo can be reviewed with explicit ephemeral-ticket disclosure; it cannot pass hosted persistence acceptance. Use SUPABASE_HOSTED_VALIDATION.md before any separately approved setup.
3. **Authentication:** team passcode/public synthetic selection only. Registration, real passenger Supabase Auth and admin roles are unavailable; non-demo access fails closed. Do not market this as a real passenger/account service.
4. **Voice/browser:** physical English/Tamil microphone, transcription/acoustics, interruption and mobile review remain human acceptance work. Optional Live stays disabled by default.
5. **Data:** seven-station subset, Blue/Green interchange context, four directed fare pairs. Official evidence confirms Yellow passenger service from 11 October 2026, but the runtime does not represent it. Full operational coverage, Yellow transfers/full fares, Tamil name review and current legacy-card recharge guidance remain incomplete. No guessed fare or unclear-license bulk feed was imported. See DATA_PROVENANCE.md.

## Vercel Preview execution instructions — prepared, not run

1. Review/push this feature branch; never merge into main or use `--prod`. Confirm Vercel's Git-triggered target is Preview for this branch. Preserve notices, licenses and demo disclosures. Avoid committing environment files or build output.
2. In **Preview scope**, configure a separate strong APP_PASSCODE, GEMINI_API_KEY and the verified model identifier `gemini-3.8-flash`; set DEMO_MODE=true, METRO_STORAGE=memory and GEMINI_LIVE_ENABLED=false for the initial restricted review. Keep secrets server-only. Do not change Production settings. If automatic Git integration already created a Preview with missing variables, redeploy that Preview after configuration.
3. Durable mode requires separate approval and completion of the staging migration/seed checklist. Then scope SUPABASE_URL and SUPABASE_SECRET_KEY to that staging project in Preview and set METRO_STORAGE=supabase. Do not copy an unverified Production database credential into Preview.
4. The existing Git integration can build the branch. Alternatively, from a separately confirmed local Vercel link to `campus-bite`, `vercel deploy` creates a Preview by default; no deployment command was executed by this work. Review target/project before running. Node engines must resolve to 24.x; confirm build/runtime in deployment metadata.
5. On the resulting HTTPS Preview URL, verify login cookies, fixture switch/isolation, protected APIs returning 401, cards/recharge/transactions, station and unknown fare behavior, draft/cancel/confirm/idempotent retry, logout and safe AI failures. Test database logout/login/restart persistence only after approved durable mode is configured. The loopback smoke scripts deliberately reject external targets; do not bypass their safeguards for a public URL.
6. Run successful text/provider and optional Live checks separately from `/api/health`; health explicitly does not probe the model. Verify X-Request-ID, no-store and 45-second application deadline remain below the effective hosted function duration. Inspect only sanitized correlation logs.
7. Complete the device checklist in BROWSER_QA_REPORT.md, native Tamil review and fresh official data review. Record Preview URL, exact Git commit, deployed Node version, test date, outcomes and remaining limitations before calling the Preview verified. Production remains a separately approved action.

References: [Vercel environments](https://vercel.com/docs/deployments/environments), [supported Node versions and engines override](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [function duration](https://vercel.com/docs/functions/configuring-functions/duration), GEMINI_RELIABILITY_REPORT.md, SUPABASE_HOSTED_VALIDATION.md, BROWSER_QA_REPORT.md and DATA_PROVENANCE.md.
