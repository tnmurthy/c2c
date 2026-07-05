# Project: C2C Talent Platform Refactoring

## Architecture
The C2C Talent Platform uses a Next.js frontend, a FastAPI backend monolith, and a Supabase PostgreSQL database. The goal is to clean up architectural debt by modularizing the backend routes, sharing frontend primitives, and auditing/optimizing database integrity and schemas.

### Backend Structure
```
api/
├── main.py (App Factory)
├── constants.py
├── deps.py
├── pdf_generator.py
├── exceptions.py (Centralized Exception Handling)
├── routers/
│   ├── assessment_router.py
│   ├── student_router.py
│   ├── employer_router.py
│   ├── portfolio_router.py
│   └── crm_router.py
└── schemas/
    ├── student.py
    ├── employer.py
    ├── assessment.py
    └── portfolio.py
```

### Frontend Structure
```
src/
├── types/
│   ├── crm.ts
│   └── assessment.ts
├── components/
│   └── ui/
│       └── DataState.tsx (Uniform UI states)
├── hooks/ (or utils/)
│   └── useSupabaseQuery.ts (or similar query hooks)
└── app/
    └── crm/
        └── opportunities/
            └── page.tsx (Using local state updates instead of window reloads)
```

## Milestones

| # | Track | Milestone Name | Scope | Dependencies | Status |
|---|---|---|---|---|---|
| M1 | Testing | E2E Test Suite Setup | Setup Playwright E2E tests for Student, Employer, TPO, Admin based on user journeys. | None | IN_PROGRESS (df687bdf) |
| M2 | DB/Schema | DB Audit & Schema Linkage | Enable RLS, enforce tenant_id constraints, create composite indexes, add updated_at triggers, and link opportunities to candidates with a foreign key. | None | IN_PROGRESS (ae65a057) |
| M3 | Backend | Backend Monolith Split | Split api/main.py into modular routers (assessment, student, employer, portfolio), create api/schemas/ and api/exceptions.py, remove duplicate imports, register GET /health. | M2 | PLANNED |
| M4 | Frontend | Frontend Shared Primitives | Extract TS types to src/types/, create DataState.tsx, implement useSupabaseQuery helper, and eliminate window.location.reload() in opportunities Kanban. | M2, M3 | PLANNED |
| M5 | Integration | Integration & Final E2E Pass | Verify Next.js build, FastAPI startup, pass 100% of the E2E tests, run Forensic Auditor, and perform adversarial coverage hardening. | M1, M3, M4 | PLANNED |

## Interface Contracts
### API Routers ↔ FastAPI App
- All sub-routers (student, employer, assessment, portfolio, crm) must prefix their endpoints with `/api` and be included dynamically in `api/main.py`.
- Custom exceptions raised within any router must be intercepted by FastAPI application handlers registered in `api/main.py` (via `api/exceptions.py`), returning uniform JSON structures:
  `{"error": true, "code": "STATUS_CODE", "message": "Detailed message"}`.
- The `/health` endpoint must return `{"status": "ok", "db": "connected"}` with code 200 on success, or 500 on database error.

### Opportunities ↔ Candidates (Schema Link)
- The `opportunities` table must include a `candidate_id` UUID foreign key referencing `students(id)`.
- Frontend opportunities components must resolve and display candidate details (name, department) via this relation rather than hardcoded array index mock-ups.

## Code Layout
- Frontend types: `src/types/*.ts`
- Frontend reusable state components: `src/components/ui/DataState.tsx`
- Backend routers: `api/routers/*.py`
- Backend schemas: `api/schemas/*.py`
- Backend exception handling: `api/exceptions.py`
- Database Migrations: `supabase/migrations/*_refactor_changes.sql`
