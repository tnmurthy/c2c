# Original User Request

## Initial Request — 2026-06-18T16:39:25Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Map user journeys and write end-to-end tests

Map out all user journeys across the application (Student, Employer, TPO/Institution, and Admin) and write automated end-to-end tests to verify each journey.

Working directory: c:\tt-ai-stack\01_projects\makeover-talent-agency
Integrity mode: development

## Requirements

### R1. Journey Documentation
Create a detailed Markdown document outlining every step, decision branch, and expected outcome for all four user roles.

### R2. Automated Test Suite
Write automated end-to-end test scripts (using Playwright) to execute the documented journeys, ensuring that logins, redirects, and core actions (like the Student Assessment) function correctly.

## Acceptance Criteria

### Documentation
- [ ] A `user_journeys.md` file is created containing flows for Student, Employer, TPO, and Admin.

### Test Execution
- [ ] Playwright tests are written for each of the 4 roles.
- [ ] Tests must successfully execute and pass against the application.

## Follow-up — 2026-07-04T16:20:12Z

The goal of this project is to refactor the backend and frontend codebases of the C2C Talent Platform to resolve architectural debt, establish domain-driven structure, and create shared primitives to support multi-agent development.

Working directory: C:/tt-ai-stack/01_projects/makeover-talent-agency
Integrity mode: development

## Requirements

### R1. Backend Monolith Router Split
- Refactor `api/main.py` by extracting all domain endpoints into dedicated routers located in `api/routers/`:
  - `assessment_router.py` (all `/assessment/*` endpoints)
  - `student_router.py` (all `/student/*`, `/onboard/student`, `/profile/*` endpoints)
  - `employer_router.py` (all `/employer/*`, `/jobs/*` endpoints)
  - `portfolio_router.py` (all `/portfolio/*`, `/ordeal/*` endpoints)
- The refactored `api/main.py` must act as a thin application factory, loading environment variables, mounting the modular routers, setting up CORS, and registering a new `GET /health` endpoint that checks Supabase DB connectivity.
- Consolidate all Pydantic request/response models from `api/main.py` into a structured directory `api/schemas/` (e.g., `api/schemas/student.py`, `api/schemas/employer.py`, etc.).
- Centralize custom exception handling into `api/exceptions.py` with typed exceptions that map cleanly to standard HTTP status codes and uniform JSON responses.
- Ensure the duplicate `import sys` statement is removed from the codebase.

### R2. Frontend Shared Primitives and Modularization
- Extract common data-fetching hooks and tenant-auth checks into reusable utility functions/hooks (e.g., `useSupabaseQuery` or similar helpers) to eliminate duplicated boilerplate across pages.
- Centralize TypeScript types/interfaces and move them to `src/types/` (e.g., `src/types/crm.ts` and `src/types/assessment.ts`).
- Create standard loading, error, and empty state UI components in `src/components/ui/DataState.tsx` to handle visual states uniformly.
- Update `src/app/crm/opportunities/page.tsx` to use local state updates instead of triggering full page reloads via `window.location.reload()`.

### R3. Database & RLS Audit and Candidates-Opportunities Link
- Audit all database tables to ensure Row Level Security (RLS) is enabled and valid `tenant_id` constraints are enforced.
- Add composite indexes for query optimization: `(tenant_id, stage_id)` on `opportunities` and `(tenant_id, status)` on `leads`.
- Add `updated_at` triggers for all mutable tables where missing.
- Formally link opportunities to candidate profiles by adding a `candidate_id` foreign key column (referencing `students`) to the `opportunities` table and updating frontend components to leverage this relationship instead of mock array indexing.

## Acceptance Criteria

### Compilation & Build Verification
- [ ] Next.js frontend builds successfully without TypeScript or build-time errors (`npm run build`).
- [ ] FastAPI backend starts successfully without import or runtime initialization errors (`uvicorn api.main:app`).

### Backend Router Isolation
- [ ] The `api/main.py` file contains no inline business logic endpoints (only CORS setup, router mounting, health check, and startup verification).
- [ ] A `GET /health` request returns HTTP 200 with JSON: `{"status": "ok", "db": "connected"}`.
- [ ] Duplicate `import sys` statement is eliminated.

### Frontend Primitives
- [ ] All CRM pages use the centralized type declarations in `src/types/crm.ts` rather than local copies.
- [ ] Loading, error, and empty states on the Talent Pool and Opportunities pages render using the shared `<DataState />` components.
- [ ] Adding a new opportunity updates the Kanban state instantly without calling `window.location.reload()`.

### Database Integrity & Graph Freshness
- [ ] All tenant-owned tables have RLS enabled and verify against `tenant_id`.
- [ ] Foreign key `candidate_id` is successfully added to the `opportunities` table.
- [ ] Running `graphify update` completes successfully, updating the local knowledge graph.

## Follow-up — 2026-07-13T03:13:18Z

Build a CV/resume creator tailored to jobs/roles found online, integrating with existing repository code that generates tailored resume contexts, cover letters, and outreach drafts based on student profiles and scraped job listings.

Working directory: C:/tt-ai-stack/01_projects/makeover-talent-agency
Integrity mode: development

## Requirements

### R1. Next.js Retro Desktop UI Integration
Integrate a new app shortcut named "CV Tailor" (`cv_tailor`) into the retro-themed student portfolio desktop page (`src/app/portfolio/[id]/page.tsx`).
- Opening the window displays a retro-styled form.
- The form allows the user to:
  1. Select a job lead from the database (scraped leads in the `leads` table).
  2. Or toggle to paste a raw job description (JD) text field.
- Clicking the "Tailor CV" button initiates the tailoring process.

### R2. Document Tailoring API Integration
Connect the frontend to backend endpoints (such as `POST /api/market/generate/resume` and `POST /api/market/generate/cover-letter`) that feed the candidate profile and target job details to the existing `build_resume_context` and `build_cover_letter_context` functions in the `services/market_intelligence` module.

### R3. Output Preview & Download Formats
Display the tailored resume context, cover letter, and outreach Cold Email/LinkedIn message directly inside the "CV Tailor" retro window in copyable Markdown/text format.
- Add a "Download tailored PDF" button that generates a polished, downloadable PDF of the tailored resume context.

## Verification Plan

### Automated Tests
- Create an E2E Playwright test script (`tests/test_cv_tailor_journey.js`) that:
  1. Opens the browser and navigates to the student portfolio page `/portfolio/{id}`.
  2. Opens the "CV Tailor" desktop icon.
  3. Fills in a sample job description and clicks the "Tailor CV" button.
  4. Asserts that the tailored markdown text preview is populated.
  5. Asserts that clicking the PDF download button returns a valid PDF file.

## Acceptance Criteria

### Retro UI & Workflows
- [ ] Clicking the "CV Tailor" icon opens a window containing the form inputs (dropdown + paste text area).
- [ ] Submitting the form shows a loading indicator followed by the tailored results preview.

### Document Generation
- [ ] Tailored resume context matches the format returned by `build_resume_context`.
- [ ] PDF download button successfully downloads a generated PDF containing the tailored resume details.

### Test Automation
- [ ] The Playwright script (`tests/test_cv_tailor_journey.js`) executes cleanly and passes.

