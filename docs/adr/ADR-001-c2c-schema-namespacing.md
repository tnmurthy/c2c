# ADR-001 — c2c gets its own Postgres schemas in the shared Talia database

- Status: accepted (2026-11-15). N1–N4 done (production runs on `c2c`); compatibility cleanup pending.
- Context owner: Narayanamurthy

## Context

The Talia Supabase project (`onsmkbwqucvbzggugmmn`) is shared by c2c, telangana,
vizag, tool_hub, innovat, sadhana, drisyon, arunachala and orgspec. c2c's 42 tables
sit unprefixed in `public` (94 tables in total). Other apps already identify their
objects either by schema (`telangana`, `vizag`, `tool_hub`, `innovat`) or by table
prefix (`sadhana_*`, `drisyon_*`, `arunachala_*`). c2c needs (a) clear identification
of its objects and (b) a staging environment, without a second Supabase project.

## Decision

Identify c2c by **schema**, not table prefix:

| Schema | Use |
|---|---|
| `c2c` | production |
| `c2c_stg` | staging (same table names; built by replaying migrations) |

All clients take the schema from one setting: `C2C_DB_SCHEMA` (Python, `api/db_schema.py`)
and `NEXT_PUBLIC_C2C_DB_SCHEMA` (Next.js, `src/lib/dbSchema.ts`). Default stays `public`
until the tables move (N4). A deployment guard refuses `c2c_stg` in production and `c2c`
in preview/development.

## Why not table prefixes (`c2c_students`)

162 `.table()/.from()` call sites plus every policy, function and trigger would change,
and staging would need a second prefix. A schema change touches ~10 client constructors;
`ALTER TABLE … SET SCHEMA` keeps data, FKs, indexes, RLS and triggers.

## Plan

| Step | What | Status |
|---|---|---|
| N1 | Create `c2c`, `c2c_stg`; grants; expose both in Dashboard → Data API | ✅ migration `20261115000100`; both exposed 2026-11-15 (verified via REST: unknown schema error lists `c2c`, `c2c_stg`) |
| N2 | Configurable schema + guard in every client | ✅ PR #46 |
| N3 | Build `c2c_stg` as a structural clone of production + seed | ✅ migrations `20261115000200` (clone) and `20261115000300` (seed), applied 2026-11-15. Verified: 42 tables, 386 columns, 68 indexes, 66 FKs, 18 checks, 68 policies, 38 triggers — identical to `public`; 4 webhook triggers deliberately excluded; 0 references back to `public`. Vercel Preview env not switched yet (see below) |
| N4 | Production move | ✅ 2026-11-15 (PR #51, migration `20261115000700`): 50 tables + review view + 17 c2c functions moved to `c2c` in one transaction after a production dry run; `public` compatibility views (51) + RPC wrappers (7) kept for old clients. Vercel Production `C2C_DB_SCHEMA`/`NEXT_PUBLIC_C2C_DB_SCHEMA` = `c2c`, Preview = `c2c_stg`; GitHub variable `C2C_DB_SCHEMA=c2c`. See incident below. |
| N5 | Startup guard + post-move checks; drop compatibility objects | ✅ guard and checks done (no c2c function references `public` c2c objects). **Pending:** apply `20261115000800` to drop the `public` compatibility views/wrappers once local dev (`.env.local`) sets `C2C_DB_SCHEMA=c2c` |

## Consequences / accepted limits

- **Auth is shared** across schemas and apps. Staging users use `@stg.c2c.test` and carry `app_metadata.env = 'stg'`.
- **One backup/PITR timeline** for all apps — no c2c-only restore.
- **Shared compute** — noisy neighbours can slow c2c.
- **Storage buckets** named `c2c-*` / `c2c-stg-*`.
- Revisit a dedicated Supabase project (~$25/month) once there are paying tenants.

## Board review (2026-11-15)

| Reviewer | Finding | Applied |
|---|---|---|
| Systems Architect | Functions with hard-coded `public.` break after move | N4 rewrites them; N5 verifies |
| Cost Engineer | Same-DB staging costs nothing | Accepted |
| Security Reviewer | Staging deploy writing to prod schema | Env guard in both runtimes |
| Product Engineer | Demos must not show fake data as verified | ADR-002 / T2 |

## Staging (`c2c_stg`) — how it works

- **Refresh:** re-run `20261115000200_n3_build_c2c_stg.sql` then `20261115000300_n3_seed_c2c_stg.sql`. The first drops and rebuilds every object in `c2c_stg` from the current production structure; it is hard-wired to `c2c_stg` and cannot touch `public` or `c2c`.
- **Not cloned:** production data; webhook triggers/functions (staging never calls production webhooks).
- **Seed:** one tenant (`c2c-stg`), one institution (`stg.c2c.test`), 20 synthetic students, AI settings. The production item bank (`psychometric_items`) is empty — assessments run from `api/fallback_bank.json` in both environments.
- **Using it:** set `C2C_DB_SCHEMA=c2c_stg` and `NEXT_PUBLIC_C2C_DB_SCHEMA=c2c_stg` for the Vercel **Preview** environment once PR #46 is merged. Until then previews keep using `public` so PR reviews still see demo data.
- **Logins:** auth is shared. Staging users need `@stg.c2c.test` emails and a profile row in `c2c_stg` (students / institutions / employers / admins); none exist yet.

## Incident — N4 cutover (2026-11-15, ~3 min)

- **What:** after switching Vercel Production to `c2c`, every backend database call returned 500 (`/api/health` 500).
- **Cause:** the env values were piped into `vercel env add` from Windows PowerShell, which prefixed a UTF-8 BOM (`\ufeffc2c`). The browser side tolerated it (JS `trim()` strips U+FEFF); Python `str.strip()` does not, so `db_schema()` rejected the value.
- **Recovery:** `vercel rollback` to the previous production deployment (still on `public` via the compatibility layer) — health 200 within seconds; values re-added BOM-free and verified byte-by-byte; new build tested on its deployment URL before `vercel promote`.
- **Prevention:** all schema readers strip a BOM explicitly (`api/db_schema.py`, `src/lib/dbSchema.ts`, market-scout); regression tests in `tests/test_db_schema.py`. When setting env values from PowerShell, set `$OutputEncoding` to UTF-8 without BOM, or use the dashboard.
