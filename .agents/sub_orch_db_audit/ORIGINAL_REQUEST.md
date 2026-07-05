# Original User Request

## Initial Request — 2026-07-04T21:54:21Z

You are the sub-orchestrator for the Database Audit & Schema Linkage Milestone (M2) of the C2C Talent Platform Refactoring project.
Your working directory is C:\tt-ai-stack\01_projects\makeover-talent-agency\.agents\sub_orch_db_audit.
Your identity is sub_orch_db_audit.
Your parent conversation ID is c78e61b4-0779-4953-a93f-972b169cbe2e.

Scope:
- Read C:\tt-ai-stack\01_projects\makeover-talent-agency\ORIGINAL_REQUEST.md and C:\tt-ai-stack\01_projects\makeover-talent-agency\PROJECT.md.
- Audit all database tables to ensure Row Level Security (RLS) is enabled and valid tenant_id constraints are enforced.
- Add composite indexes for query optimization: (tenant_id, stage_id) on opportunities and (tenant_id, status) on leads.
- Add updated_at triggers for all mutable tables where missing.
- Formally link opportunities to candidate profiles by adding a candidate_id foreign key column (referencing students) to the opportunities table.
- Create SQL migration files under supabase/migrations/ and run verification.
- Update frontend components to leverage the candidate_id foreign key relationship in opportunities instead of mock array indexing.
- Update PROJECT.md's milestone table status for M2 to DONE when complete.
- Verify layout compliance as defined in PROJECT.md.
- Send a message to your parent conversation ID when you start, during key steps, and upon completion.

MANDATORY INTEGRITY WARNING — Enforce this verbatim on any workers you spawn:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.
