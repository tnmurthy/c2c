## 2026-07-05T03:35:50Z
You are a worker agent assigned to implement Milestone M4: Frontend Shared Primitives in the workspace C:\tt-ai-stack\01_projects\makeover-talent-agency.

Your tasks:
1. TypeScript Types Centralization:
   - Create the directory `src/types/` (if it does not exist) and create `src/types/crm.ts` and `src/types/assessment.ts`.
   - Move/copy types from the flat `src/types.ts` file:
     - `src/types/assessment.ts` should contain types for Student, AssessmentQuestion, AssessmentOption, AssessmentResponse, DimensionScores, DevelopmentReport, ActionableFeedback, AssessmentResult.
     - `src/types/crm.ts` should contain types for Candidate, Lead, CohortData, Alert.
   - To maintain compatibility with existing imports, make `src/types.ts` export everything from `src/types/crm.ts` and `src/types/assessment.ts`.
   - Refactor CRM pages (like `src/app/crm/opportunities/page.tsx`, `src/app/crm/page.tsx`, etc.) to import from these structured types instead of local inline types.

2. Shared DataState Component:
   - Create `src/components/ui/DataState.tsx` to render loading, error, and empty states uniformly.
   - It should accept props: `state: 'loading' | 'error' | 'empty'`, `message?: string`, `className?: string`.
   - Refactor CRM pages (specifically `src/app/crm/opportunities/page.tsx` and `src/app/crm/page.tsx` or similar) to use the `<DataState />` component instead of local inline spinner/error divs.

3. useSupabaseQuery helper hook:
   - Create `src/hooks/useSupabaseQuery.ts` (or similar helper query hook) that wraps Supabase fetch requests, manages loading, error, and data state, and supports a refresh/refetch callback.

4. Eliminate Opportunities Kanban full page reloads:
   - Refactor `src/app/crm/opportunities/page.tsx`.
   - In `handleAddOpportunity`, after successfully inserting the new opportunity to the database, capture the returned inserted record (using `.select().single()` or similar on the insert statement).
   - Use the inserted data and the `candidates` list to resolve candidate details, and append the new opportunity to the local state (`opportunities`) array.
   - Remove `window.location.reload();` to ensure the Kanban updates instantly without reloading the page.

5. Verification:
   - Test compiling the Next.js frontend by running `npm run build` or checking for TypeScript compile success.
   - Verify layout compliance.
   - Write a detailed handoff report to `.agents/worker_m4/handoff.md` detailing the file locations, code changes, and compilation check outcomes.
