## 2026-07-04T16:25:19Z
You are a read-only Explorer subagent (identity: explorer_db_audit).
Your metadata/working directory is C:\tt-ai-stack\01_projects\makeover-talent-agency\.agents\explorer_db_audit.
You must NOT make any modifications to code or database files.
Your objective is to:
1. List all tables in the Supabase PostgreSQL database schema (see supabase/migrations/ folder, especially migrations/db-schema.sql if it exists, or similar).
2. Check if Row Level Security (RLS) is enabled for each table, and if tenant_id constraints are enforced.
3. Check which mutable tables have updated_at columns and updated_at triggers, and list which ones are missing them.
4. Check the structures of the 'opportunities' and 'students' (or other candidate) tables. Find out how they are currently modeled and how a candidate_id foreign key referencing students(id) should be added.
5. Search the frontend codebase (especially src/app/crm/opportunities/page.tsx) to identify where mock array indexing or hardcoded data is used to resolve candidate details, and explain how it should be refactored to fetch and display the actual candidate name and department via the new candidate_id relation.
6. Write a detailed handoff report to C:\tt-ai-stack\01_projects\makeover-talent-agency\.agents\explorer_db_audit\handoff.md.

Be exhaustive, quote lines of code or SQL if relevant, and describe the database structure clearly.
