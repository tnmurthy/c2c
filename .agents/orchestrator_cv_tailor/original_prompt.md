## 2026-07-13T08:56:59Z
You are the CV Tailor Implementer. Your task is to implement the "CV Tailor" feature and its E2E verification test.

Please follow these instructions:

1. Setup Agent Files:
   Create the directory `.agents/orchestrator_cv_tailor` if it doesn't exist.
   In it, create `progress.md` with:
   ```markdown
   ## Current Status
   Last visited: 2026-07-13T08:47:00Z
   - [x] Initialized progress and briefing
   - [/] Implementing Backend Integration
   - [/] Implementing Frontend Integration
   - [ ] Implementing E2E Verification Test
   - [ ] Run E2E tests and verify build/startup
   ```
   And `BRIEFING.md` using the standard BRIEFING template.
   Also, create/update `PROJECT.md` at the project root to include the CV Tailor feature milestones and architecture details.

2. Backend Integration:
   - File: `api/routers/market_router.py`
     - Modify `GenerateResumeRequest` schema to include `posting: str = ""` field.
     - Update `/generate/resume` to read `posting` and feed it into `build_resume_context`. If `posting` is blank and `lead_id` is provided (and not "custom"), retrieve the lead from the database (handling `bigint` cast safely).
     - Add `/download/resume` endpoint that generates the tailored resume context and calls `generate_tailored_resume_pdf` (from `api.pdf_generator`), returning the PDF file stream with correct `Content-Disposition` headers.
   - File: `api/pdf_generator.py`
     - Implement `generate_tailored_resume_pdf(context: dict) -> bytes` using the FPDF2 library (`FPDF`). Include: Title, Candidate Name, Department, Location, Professional Profile & Strategy (voice hook), Primary Skills & Competency Vectors, and Role Alignment Insights. Return the bytes of the generated PDF.

3. Frontend Integration:
   - File: `src/app/portfolio/[id]/page.tsx`
     - Add the `cv_tailor` window config to the initialized `windows` state array:
       `{ id: 'cv_tailor', title: 'CV Tailor', icon: '👔', isOpen: false, isMinimized: false, isMaximized: false, zIndex: 10, x: 220, y: 180, width: 550, height: 480 }`
     - Add necessary React state variables: `alerts`, `selectedLeadId`, `jobDescription`, `isCustomJd`, `tailorLoading`, `tailoredResults`.
     - In a `useEffect`, fetch the student's opportunity alerts using `GET /api/alerts/student/{id}` and populate `alerts`.
     - Implement the change handlers and API call trigger handlers:
       - `handleLeadChange(leadId)`
       - `handleTailorCV()` which does parallel fetch to `/api/market/generate/resume`, `/api/market/generate/cover-letter`, and `/api/market/generate/outreach`.
       - `handleDownloadPDF()` which triggers PDF generation and initiates a file download in the browser.
     - Add the desktop shortcut with icon `👔` and label `CV Tailor` (on double-click, opens `cv_tailor` window).
     - Add the Start Menu item `👔 CV Tailor` under Programs.
     - Add the window body layout for `cv_tailor` which renders a lead selection dropdown (with "Paste Custom JD" toggle), a textarea for job description details, a "Tailor CV" button, and (when results are loaded) a single scrollable pane rendering the tailored resume context, cover letter, and outreach email/LinkedIn drafts vertically, plus a "Download tailored PDF" button. Make sure it uses Win95 styles and classes.

4. E2E Verification Test:
   - Create `tests/test_cv_tailor_journey.js` using Playwright.
   - In the test, use `setupMocks(page, 'student')` to mock the Supabase and student profile API calls.
   - Intercept the backend endpoints:
     - `/api/market/generate/resume` (returning mock resume context)
     - `/api/market/generate/cover-letter` (returning mock cover letter)
     - `/api/market/generate/outreach` (returning mock outreach drafts)
     - `/api/market/download/resume` (returning mock PDF bytes)
   - Perform the E2E steps:
     - Navigate to `/portfolio/mock-student-id`.
     - Open the "CV Tailor" window (via double-click or start menu).
     - Enter/paste a job description.
     - Click "Tailor CV".
     - Assert that the tailored resume context key (e.g. `top_skills`) and outreach templates are visible in the window.
     - Click "Download tailored PDF" and verify that a PDF download is triggered.

5. Verification & Validation:
   - Run the E2E test using Playwright: `npx playwright test tests/test_cv_tailor_journey.js`.
   - Verify that the frontend builds without errors: `npm run build`.
   - Verify that the FastAPI backend starts without syntax or import errors.
   - Write a detailed handoff report when complete.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
