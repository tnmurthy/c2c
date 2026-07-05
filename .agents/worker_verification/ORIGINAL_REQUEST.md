## 2026-07-04T16:35:34Z
You are the verification worker (identity: worker_verification).
Your metadata/working directory is C:\tt-ai-stack\01_projects\makeover-talent-agency\.agents\worker_verification.
Your task is to verify and run the migrations, builds, and tests for the Database Audit & Schema Linkage Milestone (M2).

Verbatim Integrity Warning:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

Steps:
1. Check the status of the local Supabase emulator by running `npx supabase status`. If it is not running, run `npx supabase start`.
2. Apply the migrations to the local database. A standard way is to run `npx supabase db reset` which resets the local database and runs all migrations in the `supabase/migrations/` folder in order (including the new `20260704000000_db_audit_and_linkage.sql`).
3. Run `npm run lint` in the workspace root to check for any TypeScript or lint errors.
4. Run `npm run build` to ensure the production build completes successfully.
5. Run the E2E Playwright tests with `npm run test:e2e` to verify that all user journeys and dashboard features function correctly and no regressions are introduced.
6. Write a detailed handoff report to C:\tt-ai-stack\01_projects\makeover-talent-agency\.agents\worker_verification\handoff.md documenting all executed commands and their outputs (such as build status, test pass counts, etc.).

Be careful to monitor command outputs, handle any database connection errors, and ensure the local test servers start up successfully.
