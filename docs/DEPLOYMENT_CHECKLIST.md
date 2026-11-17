> Latest execution-ready checklist and verified blockers: [RELEASE_READINESS.md](../RELEASE_READINESS.md), updated 2026-11-17. No deployment or remote SQL was executed. The user requested feature-branch push and chose to retain the migration as review-only. Follow the latest report where historical instructions below differ.

# Deployment checklist

No preview or production deployment has been performed. Existing Vercel configuration and variable names remain intact.

1. Review branch `codex/metrosathi-implementation` and `CODEX_PROGRESS.md`. Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm audit`.
2. Keep `APP_PASSCODE`, `GEMINI_API_KEY`, `GEMINI_MODEL` (optional), `SUPABASE_URL`, `SUPABASE_SECRET_KEY` server-side. Never paste secret values in reports or create public secret variables.
3. Set `DEMO_MODE=true`. Choose `METRO_STORAGE=memory` for an explicitly temporary preview or `supabase` for durable demo tickets. Do not enable production passenger access: it is not implemented.
4. For durable storage, review migration and seed; obtain approval for the exact target remote action, then apply migration once and seed, including optional `seed/20261111_station_reference.sql`. Check no existing schema is overwritten. Do not run archived SQL. Confirm RLS, anon/authenticated denials, service-role RPC grants and hosted PostgREST access. Codex has not applied remote SQL.
5. Confirm chosen text model exists and the account has quota. Default `gemini-3.8-flash` is in Google's checked catalogue; per-account success must be smoke-tested. `/api/health` only reports configuration, DB category and `provider:not_probed`.
6. Next safe step is a **local** run with `DEMO_MODE=true METRO_STORAGE=memory npm run dev`. Review bilingual flow and ticket confirmation. Request a Vercel preview separately when ready; no deploy command has been executed.
7. In a separately approved preview, test sign-in, fixture switch isolation, API 401s, cards, pending recharge, unknown fare fallback, draft/cancel/confirm/retry, logout, Gemini outage and ready status.
8. Test desktop/mobile and keyboard navigation. In a supported browser test Tamil/English mic acceptance and denial, captions, text correction, stop, 45-second timeout, tab hide, navigation, unsupported speech and read-aloud with/without a Tamil system voice. Never record real personal details for judging.
9. Obtain native Tamil label review and recheck official CMRL sources before public demonstration.
10. Production release needs explicit user approval, real passenger auth, distributed quota controls, operational retention policy and any authorized operator integrations. This prototype must continue showing demo and non-affiliation disclosures.

11. For optional Live, set `GEMINI_LIVE_ENABLED=true` and optional `GEMINI_LIVE_MODEL`. Verify constrained token issuance, SDK connection and passenger-scoped tools using the loopback smoke script before device testing. Both English/Tamil SDK probes passed in this integration run, but real microphone/PCM/playback/permission cases remain manual. Browser/text fallback must remain available. Do not send private audio for a judge demo.
12. Review OSS_REUSE_REPORT.md and preserve bundled MIT notices. Do not promote GTFS or aggregate data without independent dataset rights and current official validation. Check date-aware fare abstention after the 30-day local freshness window.
