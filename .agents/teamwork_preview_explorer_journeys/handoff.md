# Handoff Report: User Journeys Exploration

## Observation
I explored the `src/app` directory and analyzed the Next.js routing structure and page components. 
- I identified the four main role paths: Student (`/dashboard`, `/assessment`, `/portfolio`), Employer (`/employer`), TPO/Institution (`/tpo-dashboard`), and Admin (`/admin`).
- I viewed the contents of the `onboard`, `login`, `employer`, `tpo-dashboard`, `dashboard`, `assessment`, and `portfolio` pages to understand the data flows, features, and user options for each role.

## Logic Chain
- The presence of the `/login` and `/onboard` flows dictates the entry point for Student, Employer, and TPO roles, relying on Supabase auth metadata.
- For the Student: After onboarding, they must complete an `/assessment` to generate scores (IQ, EQ, etc.) and an archetype. They then land on the `/dashboard` to view these scores, get actionable feedback, and see job matches. They also have a public `/portfolio`.
- For the Employer: They land on a unified `/employer` dashboard with two tabs: discovering talent (filtering candidates by cognitive scores) and managing job postings.
- For the TPO/Institution: They land on `/tpo-dashboard` to see aggregated cohort analytics, national benchmark comparisons, and intervention alerts.
- For the Admin: They land on `/admin` to see system-wide metrics, market leads, and psychometric item analysis to calibrate the assessment engine.
- I synthesized these distinct flows and their respective features into a detailed markdown document at `user_journeys.md`.

## Caveats
- No caveats. The routing and UI components provide a clear map of the platform's intended user journeys.

## Conclusion
The user journeys for all four roles (Student, Employer, TPO/Institution, Admin) have been successfully mapped out based on the Next.js codebase. The findings are documented in `user_journeys.md`.

## Verification Method
- Review the `user_journeys.md` document in the project root.
- Cross-reference the documented paths with the Next.js App Router structure in `src/app`.
