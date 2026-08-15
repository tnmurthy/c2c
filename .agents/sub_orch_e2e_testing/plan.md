# E2E Testing Track Plan

## Objectives
- Design and implement automated Playwright E2E tests covering Tiers 1-4 for all four roles (Student, Employer, TPO, Admin) under `tests/e2e/`.
- Verify layout compliance as defined in `PROJECT.md`.
- Once tests pass and are ready, publish `TEST_READY.md` at the project root with the coverage summary and feature checklist.

## Complexity Assessment
- **Scope**: Multi-role E2E testing, requiring deep user journey verification and real-world scenario testing.
- **Abundance**: Low (requires writing TypeScript tests/fixtures).
- **Ambiguity**: Low (features and user journeys are well-documented in `user_journeys.md` and `TEST_INFRA.md`).
- **Verdict**: Medium complexity. We will spawn a `teamwork_preview_worker` to write and verify the tests.

## Steps

### Step 1: Initial Discovery & Environment Verification
- Spawn a worker to:
  - Run the current test suite (`npm run test:e2e` or `npx playwright test`) to establish a baseline.
  - Report any issues with starting the dev server or existing tests.

### Step 2: Implementation of Tier 1 & Tier 2 Tests
- Spawn a worker to:
  - Implement Tier 1 (Happy-path tests) for each of the 5 features (Onboarding, Assessment, Job Posting, Cohort Management, Admin Analysis).
  - Implement Tier 2 (Boundary & Corner cases) such as:
    - Empty inputs in forms.
    - Invalid email domains (e.g. non-institutional email for Student, non-@taliatech.in for Admin).
    - Accessing dashboard/admin page without authentication (unauthorized redirects).
    - Error/empty states verification.
  - Run the tests to ensure they execute and pass.

### Step 3: Implementation of Tier 3 & Tier 4 Tests
- Spawn a worker to:
  - Implement Tier 3 (Cross-feature interactions).
  - Implement Tier 4 (Real-world scenarios):
    - Complete Candidate Lifecycle: Student onboard -> Assessment -> Dashboard -> Job Matching -> Apply.
    - Employer Recruiter Flow: Employer onboard -> Post Job -> Run Match -> View Candidates -> Dossier PDF Export.
    - Institution Verification Flow: Student onboard -> whitelist verify by TPO -> Student completes assessment -> TPO views verified cohort.
  - Verify all tests pass.

### Step 4: Final Validation, Audit & Handoff
- Spawn a reviewer to review the test quality, coverage, and layout compliance.
- Spawn a challenger to verify test robustness (e.g., that tests don't flake, wait for elements correctly).
- Spawn a Forensic Auditor to ensure no cheating (e.g. mock test results).
- Write `TEST_READY.md` to the project root.
- Present final report to the parent.
