# Supabase hosted validation

Audit: 2026-11-12; connector re-verification: **2026-11-17**, branch `codex/metrosathi-implementation`.

**Staging target identified: `paknrdenraxaoiwoxnfb`**, supplied by the user as the isolated project. Dashboard name: `1HPdhruva’s Project`, Singapore, Nano, Healthy. Its branch badge says `main PRODUCTION` (Supabase's default branch label); this is not permission to deploy or migrate. The user explicitly instructed leaving the other three CLI-visible projects untouched.

Read-only checks: the authenticated dashboard overview reports **no migrations**, no repository connection and no branches. A credentialless GET to `https://paknrdenraxaoiwoxnfb.supabase.co/rest/v1/` returns **401**, showing the API gateway is reachable and rejects a missing key; it proves neither table RLS nor database persistence. The local CLI account lists different projects and does not have this target in its inventory. On 12 November the connector was unavailable, so browser metadata inspection was used. On 17 November the newly connected Supabase tools independently confirmed ACTIVE_HEALTHY, public.tasks with RLS enabled, and an empty migration list. A local configuration check found that the existing server URL matches the staging target and a server credential is present; no credential was displayed or used for passenger-row access. The public table inventory contains exactly one starter `tasks` table (estimated four rows; no rows opened). The schema visualizer shows its five columns and no `metro_*` tables. Its policy page offers “Disable RLS” and reports no policies, consistent with RLS enabled for this starter table. The Migrations page shows “Run your first migration”. This confirms MetroSathi tables and its ticket RPC have not been provisioned in the inspected public schema; it does not prove every other schema is empty.

**No remote SQL, migrations, seeds, Auth changes, project creation or passenger-row reads were performed.** The user explicitly chose **“Keep remote SQL unexecuted; push code and checklist”** on 17 November. Hosted app validation still needs separately approved staging schema setup and Preview configuration. The migration execution checklist below remains unexecuted.

The connector security advisor reports one informational `rls_enabled_no_policy` finding for the starter `public.tasks` table. This is consistent with deliberate default-deny behavior; no policy was added. See the [Supabase finding explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). MetroSathi RLS cannot be hosted-validated while its tables are absent. No logs or Auth-user lists containing possible private data were fetched.

## Local findings and verification boundaries

| Requirement | Inspected implementation / local evidence | Hosted result |
| --- | --- | --- |
| Registration and login | No passenger registration or Supabase Auth login. `/api/login` is a team passcode gate; `/api/session` selects one of three public synthetic fixtures. | Real registration/login unimplemented |
| Persistent sessions | Signed HMAC, separate gate/passenger cookies, HttpOnly, SameSite Strict, Secure in production, 12-hour expiry. Tampering, expiry, cross-kind and non-demo fail-closed tests pass. | Hosted cookie persistence unverified |
| Passenger cards | Actor originates from signed server cookie; `ownRows` filters `passenger_id`; `requireCard` rejects foreign card IDs. | No hosted PostgREST query performed |
| Transactions | Composite card/passenger foreign key in SQL; actor filter and card-ownership check in server store. | Unverified remotely |
| Support tickets | Signed 10-minute actor-bound draft, explicit confirmation, server RPC, actor filter, advisory transaction lock, idempotency/confirmation uniqueness, one audit event. | Durable logout/login persistence unverified |
| Admin permissions | No admin UI, roles or permission grant implemented. Service-role credential is backend infrastructure, not a passenger admin session. | Admin workflow unavailable |
| Database isolation | Nine prefixed tables have RLS enabled and anon/authenticated grants revoked; ticket RPC revoked from public/anon/authenticated and granted only to service_role. Local PGlite tests exercise constraints, grants and replay behavior. | Metro schema absent on staging; local grants/RLS unverified remotely |
| Persistence | Memory default is process-local and cannot prove database durability. Supabase mode has explicit six-second database timeouts and fails without silently substituting fixtures. | Requires approved staging setup and synthetic write test |

The service role can bypass RLS. Thus this design depends on server authorization and explicit ownership filters; it does **not** provide end-user `auth.uid()` RLS policies. Public fixtures can be switched by every team-gated demo user and must never contain real passenger information. `auth_subject` is reserved and unused; `DEMO_MODE` other than exact `true` denies passenger operations. Do not enable real passenger mode or add broad authenticated policies as a shortcut.

Local evidence: `tests/database.test.ts`, `tests/session.test.ts`, `tests/metro.test.ts`, `scripts/smoke.mjs`; implementation: `lib/auth.ts`, `lib/metro/security.ts`, `lib/metro/store.ts`, `lib/supabase.ts`. Local SQL simulation is not hosted Supabase Auth/PostgREST evidence. See [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) for service-key bypass semantics.

## Migration execution checklist — prepared, not executed

1. Identify the exact isolated project reference, verify owner/environment and absence of private or production data, and record explicit approval for the exact remote SQL action. Inspect current migration history/schema read-only through approved mechanisms; stop on table collisions or drift. Back up staging before writes.
2. Review `supabase/migrations/202611110001_metrosathi.sql` and file checksums with the reviewer. It is transactional/additive but creates triggers without `IF NOT EXISTS`: apply **once** through migration history, never replay blindly. Do not use database reset or any `archive/` SQL.
3. After approval only, apply that migration, then `seed/metrosathi.sql`, then optional `seed/20261111_station_reference.sql`. Seeds preserve existing rows using stable IDs and `ON CONFLICT DO NOTHING`; they do not reconcile stale pre-existing values. Compare synthetic records and dates after insertion.
4. Confirm all nine table RLS flags, no browser-role table grants, restricted RPC execution and fixed function search paths. Exercise anon/authenticated denials and service-role access without exposing keys. Confirm no new public passenger policies appeared.
5. Configure **Preview only** with staging `SUPABASE_URL` and server-only `SUPABASE_SECRET_KEY`, `DEMO_MODE=true`, `METRO_STORAGE=supabase`, and a separate strong app passcode. No `NEXT_PUBLIC_` secrets. Confirm `/api/health` reports expected mode; do not equate configuration with connectivity.
6. With synthetic A/B profiles only, test each card/transaction/recharge/ticket list and explicit foreign-card rejection. Prepare/cancel without writes; confirm once; repeat request and verify the same ticket plus one audit event. Attempt cross-actor confirmation replay and reject it.
7. Create one explicitly approved synthetic test ticket. Logout, log in and select the same fixture; verify ticket survives. Restart the Preview instance and verify persistence. Switch fixture and confirm ticket disappears. These steps write staging and need approval in addition to read-only identification.
8. Record hosted run date, project reference, migration version, HTTP statuses, counts and sanitized diagnostics. Mark requirements individually; real Auth/admin remain unavailable until separately implemented. Clean test records only through an approved, narrowly scoped procedure; do not drop/reset the project.

No remote execution command is embedded here to avoid accidentally targeting the existing application's project. Approval must identify both the project and migration/seed files.
