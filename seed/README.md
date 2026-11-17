# MetroSathi fixtures

All profiles, masked cards, balances, references and transactions are synthetic. They do not represent people or CMRL / issuer operations. Travel amounts are negative; recharge amounts positive. Recharge transaction amounts describe attempts and do not imply balance application. Fixtures use fixed dates for repeatable judging.

Review `supabase/migrations/202611110001_metrosathi.sql`, then `seed/metrosathi.sql`, followed by optional additive `seed/20261111_station_reference.sql` for the two independently checked interchange stations. Apply locally first. Remote application requires explicit approval; none has been performed by Codex. Seed inserts use stable IDs and ON CONFLICT DO NOTHING; reruns preserve existing rows, including tickets. Do not run anything under `archive/seed`.

`METRO_STORAGE=memory` uses equivalent bundled fixtures without SQL and keeps prototype tickets only in the current server process. `METRO_STORAGE=supabase` requires migration and seed and never silently falls back. Official station/fare/policy tools use the checked versioned TypeScript register (`lib/metro/official.ts`); SQL contains the same reviewable source snapshot, not an automatic live sync.
