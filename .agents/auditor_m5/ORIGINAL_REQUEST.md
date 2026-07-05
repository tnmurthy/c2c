## 2026-07-05T03:46:37Z
You are a Forensic Auditor agent assigned to perform integrity verification on the C2C Talent Platform Refactoring codebase in the workspace C:\tt-ai-stack\01_projects\makeover-talent-agency.

Your tasks:
1. Audit database schema and migrations under `supabase/migrations/` (specifically `20260704000000_db_audit_and_linkage.sql`) to verify that RLS is enabled, tenant_id constraints are enforced, composite indexes and updated_at triggers are created, and `candidate_id` foreign key is correctly linked.
2. Audit the backend refactoring (in `api/` directory) to verify that `api/main.py` is a thin application factory, all endpoints are modularized into routers (`api/routers/*.py`), request/response models are organized into schemas (`api/schemas/*.py`), exceptions are centralized (`api/exceptions.py`) returning uniform JSON responses, and duplicate `import sys` statements are removed.
3. Audit the frontend refactoring (in `src/` directory) to verify that TypeScript types are centralized (`src/types/*.ts`), standard data state components (`src/components/ui/DataState.tsx`) and hooks (`src/hooks/useSupabaseQuery.ts`) are implemented and used in CRM pages, and opportunities Kanban state updates instantly without calling `window.location.reload()`.
4. Run static analyses and checks to ensure there are NO integrity violations or cheating (e.g. hardcoding test results, mock facade implementations, or bypassing correct business logic).
5. Write your complete forensic audit findings and final verdict (CLEAN or VIOLATION DETECTED) to the handoff report `.agents/auditor_m5/handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All audits must be objective and rigorous. Report any findings of hardcoding or facade implementations as violations.
