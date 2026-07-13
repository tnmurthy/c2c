## 2026-07-13T03:13:18Z

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
