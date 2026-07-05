## 2026-07-05T03:32:32Z
You are a worker agent assigned to implement Milestone M3: Backend Monolith Split in the workspace C:\tt-ai-stack\01_projects\makeover-talent-agency.

Your tasks:
1. Centralize custom exception handling:
   - Create `api/exceptions.py`.
   - Define custom exception classes representing common API errors (e.g., DatabaseConnectionError, NotFoundError, PermissionDeniedError).
   - In `api/main.py`, register exception handlers that intercept these custom exceptions and return a uniform JSON format:
     `{"error": true, "code": "STATUS_CODE", "message": "Detailed message"}` where STATUS_CODE is the HTTP status code (e.g., 404, 403, 500, etc.) or a string code, and return the appropriate HTTP status code.

2. Consolidate Pydantic models:
   - Create `api/schemas/` directory.
   - Extract and organize the Pydantic models from `api/main.py` into:
     - `api/schemas/student.py` (StudentOnboard, StudentProfileUpdate, ApplicationCreate, etc.)
     - `api/schemas/employer.py` (EmployerOnboard, JobCreate, JobMatchRequest, etc.)
     - `api/schemas/assessment.py` (InstitutionOnboard, AssessmentSubmit, FeedbackSubmit, etc.)
     - `api/schemas/portfolio.py` (AuditRequest, OrdealRequest, PortfolioRequest, etc.)

3. Extract and modularize routers:
   - Create `api/routers/` directory.
   - Extract endpoints from `api/main.py` into:
     - `api/routers/assessment_router.py` (all `/assessment/*` routes, `/feedback/submit`, and `/webhook/assessment-completed`)
     - `api/routers/student_router.py` (all `/student/*` routes, `/onboard/student`, `/profile/*`, `/cohort/*`, `/institution/*`, `/alerts/student/*`, `/export/student/*`, `/export/interview-guide/*`, and `/webhook/student-onboarded`)
     - `api/routers/employer_router.py` (all `/employer/*`, `/jobs/*`, and `/webhook/job-posted`)
     - `api/routers/portfolio_router.py` (placeholder router or any related endpoints)
   - Ensure these routers use `APIRouter()` and correct dependencies from `api/deps.py`.

4. Refactor `api/main.py`:
   - Keep it as a thin application factory.
   - Mount the modular routers dynamically under the `/api` prefix (ensure compatibility with `api/crm_router.py` which is already mounted under `/api`).
   - Register a `GET /health` endpoint that checks Supabase DB connectivity by attempting a fast select query (e.g., `client.table("institutions").select("id").limit(1).execute()`) and returns `{"status": "ok", "db": "connected"}` with code 200 on success, or 500 on database error.
   - Ensure the duplicate `import sys` statement is removed from `api/main.py` (lines 2 and 27).

5. Verification:
   - Test starting the FastAPI backend with uvicorn (e.g., run the backend and check if it starts without any import/syntax errors).
   - Verify layout compliance with PROJECT.md.
   - Write your handoff report documenting the refactored file structures, exceptions, router mappings, and verification commands/results to `.agents/worker_m3/handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
