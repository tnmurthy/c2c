## 2026-07-04T16:29:35Z
You are the Worker agent (identity: worker_db_audit).
Your metadata/working directory is C:\tt-ai-stack\01_projects\makeover-talent-agency\.agents\worker_db_audit.
Your task is to implement the database migrations and frontend refactoring for Milestone M2.

Verbatim Integrity Warning:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

Steps:
1. Create the database migration file `C:\tt-ai-stack\01_projects\makeover-talent-agency\supabase\migrations\20260704000000_db_audit_and_linkage.sql`.
   Write the following schema updates in it:
   - Add `candidate_id` UUID column to `opportunities` referencing `public.students(id)` ON DELETE SET NULL.
   - Add index on `opportunities(candidate_id)`.
   - Add composite index on `opportunities(tenant_id, stage_id)`.
   - Add composite index on `leads(tenant_id, status)`.
   - Create trigger helper function `public.set_updated_at()` and attach BEFORE UPDATE triggers to all mutable tables (both base and CRM tables, adding the `updated_at` column if missing).
   - Create RLS policy helper `public.get_auth_tenant_id()` that returns the logged-in user's tenant_id:
     ```sql
     CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
     RETURNS UUID AS $$
         SELECT tenant_id FROM public.crm_users WHERE user_id = auth.uid();
     $$ LANGUAGE sql SECURITY DEFINER;
     ```
   - Enable RLS on all database tables (37 tables).
   - Enforce tenant isolation on multi-tenant CRM tables by requiring `tenant_id = public.get_auth_tenant_id()`. For `crm_users`, allow `user_id = auth.uid() OR tenant_id = public.get_auth_tenant_id()` to prevent onboarding lockouts.
   - Create permissive policies (`USING (true) WITH CHECK (true)`) on the remaining non-tenant base tables to maintain full compatibility with the existing test suite and application logic.
2. Apply the migration using Supabase CLI if available, or execute it directly against the local PostgreSQL instance. (Note: check how the database is run first, apply the SQL file).
3. Replace the contents of `src/app/crm/opportunities/page.tsx` with the refactored code from `C:\tt-ai-stack\01_projects\makeover-talent-agency\.agents\explorer_db_audit\proposed_opportunities_page.tsx` which maps the candidate details via `candidate_id` and adds candidate selection in the drawer.
4. Verify TypeScript compilation and linting by running `npm run lint`.
5. Verify production compilation by running `npm run build`.
6. Run the E2E Playwright test suite using `npm run test:e2e` to ensure all tests pass successfully.
7. Write a detailed handoff report in C:\tt-ai-stack\01_projects\makeover-talent-agency\.agents\worker_db_audit\handoff.md documenting all applied changes, commands executed, and build/test results.
