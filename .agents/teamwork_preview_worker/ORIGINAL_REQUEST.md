## 2026-07-04T16:35:06Z
You are teamwork_preview_worker, a worker agent.
Your task is to design, implement, and verify a complete automated Playwright E2E test suite covering Tiers 1-4 for all four roles (Student, Employer, TPO, Admin) under tests/e2e/ in the project C:\tt-ai-stack\01_projects\makeover-talent-agency.

Since Docker is not running and we are in network isolation, you must implement a test helper `tests/e2e/testHelpers.ts` to mock/intercept all Supabase (Auth, DB) and FastAPI backend endpoints using Playwright's `page.route()` API.

Please execute the following steps:

1. Create a helper file `tests/e2e/testHelpers.ts` that exports:
   - `setupMocks(page: Page, role?: 'student' | 'employer' | 'institution' | 'admin')`: A function that injects a mock auth token to localStorage and intercepts:
     - `**/auth/v1/signup` -> Return a mock user token and session.
     - `**/auth/v1/token**` -> Return a mock user token and session.
     - `**/auth/v1/user` -> Return the mock user details.
     - `**/rest/v1/**` (Supabase DB queries) -> Return an empty list or mock rows as needed.
     - `/api/onboard/student`, `/api/onboard/institution`, `/api/onboard/employer` -> Return a success response with a profile ID (e.g. `[{ id: 'mock-profile-id' }]`).
     - `/api/student/*` -> Return a student profile, psychometric assessments with dimension scores (e.g. Technical: 88, Product: 94, Leadership: 72, Communication: 91, Adaptability: 76) and a development report.
     - `/api/alerts/student/*` -> Return sample alerts.
     - `/api/leads` -> Return market leads.
     - `/api/admin/item-analysis` -> Return item analysis rows (e.g. id, stem, item_type, dimension, attempts, success_rate, status).
     - `/api/cohort/*` -> Return cohort analytics (e.g. average quotients, distribution, support needs).
     - `/api/employer/candidates` -> Return matched candidates list.
     - `/api/employer/jobs` -> Return list of active job postings.
     - `/api/employer/jobs/new` -> Return success.
     - `/api/assessment/generate*` -> Return psychometric questions.
     - `/api/assessment/submit` -> Return success.

2. Rewrite the following test files:
   - `tests/e2e/student.spec.ts`: Cover Tier 1 (Happy paths) and Tier 2 (Boundary & Corner cases) for the Student role. Use `beforeEach` to call `setupMocks(page, 'student')`.
     - Happy paths: Onboarding form submission, Viewing Dashboard (radar chart, archetype card, feedback), Running the Ordeal assessment, Viewing the Windows 95 Retro Portfolio.
     - Boundary cases: Empty name validation, Invalid graduation year format, Redirecting dashboard/assessment to login if unauthenticated.
   - `tests/e2e/employer.spec.ts`: Cover Tier 1 and Tier 2 for the Employer role. Use `setupMocks(page, 'employer')`.
     - Happy paths: Onboarding (Company tab), Discovering candidates, Toggling strict founder fit, Sorting candidates, Viewing Candidate Dossier modal, saving/bookmarking candidate, Creating a new job role.
     - Boundary cases: Empty company name validation, Empty job title validation, Redirection to login if unauthenticated.
   - `tests/e2e/tpo.spec.ts`: Cover Tier 1 and Tier 2 for the TPO role. Use `setupMocks(page, 'institution')`.
     - Happy paths: Onboarding (Institution tab), Viewing analytics dashboard KPIs, viewing founder profile distribution, viewing intervention feed.
     - Boundary cases: Non-academic email domain validation on onboard, Redirection to login if unauthenticated.
   - `tests/e2e/admin.spec.ts`: Cover Tier 1 and Tier 2 for the Admin role. Use `setupMocks(page, 'admin')`.
     - Happy paths: Auth with `@taliatech.in` email, Accessing Admin Root, Viewing stats cards (Active Nodes, Market Entities, etc.), viewing market leads stream and item analysis tables.
     - Boundary cases: Restricting non-admin domains from admin root, Redirection/RBAC checks for student/employer roles trying to access admin.

3. Create a new test file:
   - `tests/e2e/workflows.spec.ts`: Cover Tier 3 (Cross-feature combinations) and Tier 4 (Real-world scenarios) using setupMocks.
     - Tier 3: Complete cross-role student assessment submission and verification by TPO.
     - Tier 4: Scenario 1: Complete Student Lifecycle (Onboard -> Assessment -> Dashboard -> Job Matching -> Apply).
     - Tier 4: Scenario 2: Employer Recruiter Flow (Onboard -> Post Job -> Run Match -> View Candidates -> Dossier PDF Export).
     - Tier 4: Scenario 3: Institution Verification Flow (Student onboard -> whitelist verify by TPO -> Student completes assessment -> TPO views verified cohort).

4. Run the entire test suite using `npm run test:e2e` to verify all tests execute and pass successfully.
5. Create/write `TEST_READY.md` at the project root with the coverage summary and feature checklist.
6. Write your handoff.md report summarizing the work, test commands, and results.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
