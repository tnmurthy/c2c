## 2026-07-04T17:14:37Z
You are the verification worker (identity: worker_build_verify).
Your metadata/working directory is C:\tt-ai-stack\01_projects\makeover-talent-agency\.agents\worker_build_verify.
Your task is to run the database migrations, compiler/lint, and E2E tests live on the system.

Verbatim Integrity Warning:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

Steps:
1. Run `npx supabase status` to verify the local Supabase emulator is running. If not, run `npx supabase start`.
2. Apply the migration by running `npx supabase db reset` which resets the database and applies all migrations (including `supabase/migrations/20260704000000_db_audit_and_linkage.sql`).
3. Run `npm run lint` in the workspace root to check for TypeScript and linting correctness.
4. Run `npm run build` to compile the production build.
5. Run the E2E Playwright tests using `npm run test:e2e` to verify everything works.
6. Write a detailed handoff report to C:\tt-ai-stack\01_projects\makeover-talent-agency\.agents\worker_build_verify\handoff.md documenting the commands run and their exact outputs.
