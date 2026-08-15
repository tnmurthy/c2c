# Scope: Database Audit & Schema Linkage Milestone (M2)

## Architecture
The milestone modifies the database schema and Row Level Security (RLS) configurations, adds missing composite indexes and `updated_at` triggers, and introduces a foreign key linkage (`candidate_id`) between the `opportunities` and `students` tables. It also updates the frontend React components in the Next.js application to display candidate details resolved from the new relation.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|---|
| M2.1 | Database Audit & Analysis | Identify all tables, RLS status, tenant_id constraints, and missing updated_at triggers or indexes. | None | PLANNED |
| M2.2 | SQL Migrations & Schema Update | Create migrations under supabase/migrations/ adding candidate_id column, composite indexes, updated_at triggers, and enabling RLS. | M2.1 | PLANNED |
| M2.3 | Frontend Schema Integration | Update Next.js opportunities page/components to use candidate_id and fetch candidate names/departments. | M2.2 | PLANNED |
| M2.4 | Verification & Audit | Validate migrations, RLS constraints, frontend TS compile, and perform forensic audit verification. | M2.3 | PLANNED |

## Interface Contracts
### opportunities ↔ students (Database Link)
- Column `candidate_id` UUID added to `opportunities` referencing `students(id)`.
- Index `opportunities_tenant_id_stage_id_idx` on `(tenant_id, stage_id)`.
- Index `leads_tenant_id_status_idx` on `(tenant_id, status)`.
- RLS enabled on all tables; check constraints on `tenant_id` if applicable.
- `updated_at` triggers active on all mutable tables.

### opportunities ↔ Frontend UI components
- Opportunity interfaces must replace mock/indexed candidates with `candidate` entity properties (e.g. `candidate.students.name`, `candidate.students.department` or joined fields).
