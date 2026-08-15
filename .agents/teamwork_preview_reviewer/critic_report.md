# Adversarial Review / Critic Report

**Date**: 2026-07-04
**Verifier**: teamwork_preview_reviewer (Critic Role)

## Challenge Summary

**Overall risk assessment**: LOW to MEDIUM

The E2E test suite is highly robust due to its complete mock route interception system. However, the static nature of the mocks introduces dependencies on environment variables and assumptions about transition timings that could fail in certain CI/CD conditions or system configurations.

---

## Challenges

### [Medium] Challenge 1: Supabase Project Reference Desynchronization

- **Assumption challenged**: The Supabase project reference will always be `onsmkbwqucvbzggugmmn`.
- **Attack scenario**: If the environment configuration (`NEXT_PUBLIC_SUPABASE_URL`) changes to use a local or a different staging Supabase instance, the frontend will attempt to retrieve the auth token from `localStorage` under `sb-<new-ref>-auth-token`. Because the initialization script in `testHelpers.ts` writes session data under the hardcoded key `sb-onsmkbwqucvbzggugmmn-auth-token`, the frontend client will fail to locate the session and treat the browser as unauthenticated, causing all auth-guarded tests to fail by redirecting to `/login`.
- **Blast radius**: Complete suite failure (all authenticated views).
- **Mitigation**: Parse the reference dynamically from `process.env.NEXT_PUBLIC_SUPABASE_URL` in `testHelpers.ts` if available, falling back to the default reference. For example:
  ```typescript
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://onsmkbwqucvbzggugmmn.supabase.co';
  const ref = supabaseUrl.split('//')[1]?.split('.')[0] || 'onsmkbwqucvbzggugmmn';
  const tokenKey = `sb-${ref}-auth-token`;
  ```

### [Low] Challenge 2: Arbitrary Sleep Durations in Question Transitions

- **Assumption challenged**: Question transition animations and state updates always finish within 600ms.
- **Attack scenario**: On resource-constrained runners (e.g. shared CI workers), the rendering loop or state update for the Next.js assessment component could take longer than 600ms. If `await page.waitForTimeout(600)` fires before the next question is interactive, Playwright will attempt to click the next option before the UI is ready, leading to false-negative test failures.
- **Blast radius**: Flaky test failures on assessment-based scenarios.
- **Mitigation**: Replace static timeouts with element-specific wait conditions (e.g., waiting for the question stem text to change or for a new list of choices to be rendered).

### [Low] Challenge 3: Blanket Empty Array for Database REST Endpoints

- **Assumption challenged**: Returning an empty array (`[]`) for any database query to `**/rest/v1/**` is safe.
- **Attack scenario**: If new frontend features perform client-side joins or expect profile details/settings records to load via the Supabase client directly, returning an empty list will succeed at the network layer but might trigger frontend runtime errors or empty state renders.
- **Blast radius**: False-negative/positive test outcomes when actual DB values are expected.
- **Mitigation**: Restrict mock responses in `testHelpers.ts` to return mock profile metadata or mock tables based on request URL query parameters.

---

## Stress Test Results

- **Scenario 1: Supabase URL project ref change** → **Expected**: Session injected successfully and auth checks pass → **Predicted**: Session injection fails because local storage key is hardcoded to the old project ref, resulting in redirect to `/login` → **FAIL**
- **Scenario 2: Slow runner (>1s transition time between questions)** → **Expected**: Wait for next question and proceed → **Predicted**: Playwright attempts to click the next option too early and throws selector/element-not-visible error → **FAIL**
- **Scenario 3: PDF export returns error or empty body** → **Expected**: Client handles missing content types → **Predicted**: The test correctly expects 200 and `application/pdf`, and will fail if the server returns empty or error status → **PASS**

---

## Unchallenged Areas

- **Backend FastAPI DB queries** — reason not challenged:
  - The FastAPI backend router endpoints are fully mocked at the boundary (e.g. `/api/student/*` and `/api/employer/*`), hence database connectivity/RLS checks in PostgreSQL are completely out of scope for these network-isolated tests.
