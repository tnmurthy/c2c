# E2E Test Infra: C2C Talent Platform

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on internal implementation details.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 |
|---|---------|--------|:------:|:------:|:------:|
| 1 | Student Onboarding & Dashboard | ORIGINAL_REQUEST §R2, §R3 | 5 | 5 | ✓ |
| 2 | Student Assessment Flow | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 3 | Employer Job Posting & Matches | ORIGINAL_REQUEST §R1, §R3 | 5 | 5 | ✓ |
| 4 | TPO Cohort Management | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 5 | Admin Item Analysis & Health | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |

## Test Architecture
- Test runner: Playwright (`npx playwright test`)
- Expected: All tests pass with exit code 0.
- Directory layout: `tests/e2e/` for test cases, `tests/fixtures/` for seed data.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Complete Candidate Lifecyle | Student onboard -> Assessment -> Dashboard -> Job Matching -> Apply | High |
| 2 | Employer Recruiter Flow | Employer onboard -> Post Job -> Run Match -> View Candidates -> Dossier PDF Export | High |
| 3 | Institution Verification Flow | Student onboard -> whitelist verify by TPO -> Student completes assessment -> TPO views verified cohort | Medium |

## Coverage Thresholds
- Tier 1: Feature coverage (Happy path) >= 5 per feature
- Tier 2: Boundary & Corner cases >= 5 per feature (empty inputs, invalid domains, RLS checks)
- Tier 3: Cross-feature combinations (Student-Employer-TPO workflows)
- Tier 4: Real-world application scenarios (E2E workflows)
