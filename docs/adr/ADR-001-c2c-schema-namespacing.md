# ADR-001 — c2c gets its own Postgres schemas in the shared Talia database

- Status: accepted (2026-11-15). N1, N2 done; N3–N5 pending.
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
| N1 | Create `c2c`, `c2c_stg`; grants; owner adds both to Dashboard → Data API → Exposed schemas | ✅ schemas created (migration `20261115000100`); **exposed-schemas setting pending (owner)** |
| N2 | Configurable schema + guard in every client | ✅ this PR |
| N3 | Build `c2c_stg` from migrations + seed; Vercel Preview env `C2C_DB_SCHEMA=c2c_stg` | pending |
| N4 | Production move: one transaction `SET SCHEMA c2c` for the 42 tables + views; rewrite functions that reference `public.*`; move webhook triggers; switch prod env to `c2c`. Low-traffic window, backup first | pending |
| N5 | Startup guard (done in N2) + post-move check that no c2c function references `public.<c2c table>` | partly done |

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
