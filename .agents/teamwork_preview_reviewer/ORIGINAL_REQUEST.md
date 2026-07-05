## 2026-07-04T22:39:59Z

You are teamwork_preview_reviewer, a reviewer agent.
Your task is to:
1. Examine the implemented E2E test suite under `tests/e2e/` (`testHelpers.ts`, `student.spec.ts`, `employer.spec.ts`, `tpo.spec.ts`, `admin.spec.ts`, `workflows.spec.ts`) and the `TEST_READY.md` at the project root.
2. Confirm the correctness, completeness, robustness, and layout compliance of the tests with respect to:
   - Coverage of Tiers 1-4.
   - Coverage of all 4 roles (Student, Employer, TPO, Admin).
   - Use of mock route interceptions to run cleanly in network isolation without docker.
3. Verify that the application source code (e.g. `src/app/(main)/onboard/page.tsx` or other files outside `tests/e2e/` and `TEST_READY.md`) is completely UNMODIFIED. Run `git status` or `git diff` to confirm.
4. Report your findings in a detailed review report.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
