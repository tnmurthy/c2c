const { test, expect } = require('@playwright/test');
const { setupMocks } = require('./e2e/testHelpers');

test.describe('CV Tailor Journey (JS)', () => {
  test.beforeEach(async ({ page }) => {
    // Set up standard mocks for the student role
    await setupMocks(page, 'student');

    // Mock student details with embedded assessments
    await page.route('**/rest/v1/students*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'mock-student-id',
            full_name: 'Test Student',
            email: 'student_test@example.com',
            department: 'Computer Science',
            graduation_year: 2026,
            skills: ['TypeScript', 'Playwright'],
            location: 'San Francisco',
            assessments: [
              {
                id: 'mock-assessment-id',
                student_id: 'mock-student-id',
                primary_profile: 'Builder',
                dimension_scores: {
                  IQ: 85,
                  EQ: 90,
                  SQ: 75,
                  AQ: 80,
                  SpQ: 70,
                  Technical: 88,
                  Product: 94,
                  Leadership: 72,
                  Communication: 91,
                  Adaptability: 76
                }
              }
            ]
          }
        ])
      });
    });

    // Mocks specifically for CV Tailor endpoints
    await page.route('**/api/alerts/student/mock-student-id', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'alert-1',
            student_id: 'mock-student-id',
            score: 95.0,
            created_at: '2026-07-13T09:00:00Z',
            market_leads: {
              id: '123',
              company: 'Stark Industries',
              name: 'Quantum Software Engineer',
              location: 'New York, NY',
              ai_summary: 'Develop quantum systems for arc reactors.',
              ai_notes: 'Requires Python and Quantum computing knowledge.'
            }
          }
        ])
      });
    });

    await page.route('**/api/market/generate/resume', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidate_name: 'Test Student',
          department: 'Computer Science',
          role_title: 'Quantum Software Engineer',
          company: 'Stark Industries',
          location: 'New York, NY',
          voice_hook: 'Quantum computing pioneer',
          archetype_summary: 'Customized summary for Stark Industries',
          top_skills: ['TypeScript', 'Playwright', 'Quantum Computing'],
          matched_tech: ['Python', 'Qiskit']
        })
      });
    });

    await page.route('**/api/market/generate/cover-letter', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidate_name: 'Test Student',
          company: 'Stark Industries',
          opener: 'I am thrilled to apply for the Quantum Software Engineer position',
          strength: 'building scalable quantum software architectures',
          skills_str: 'TypeScript, Playwright, and Python',
          hook: 'I have previously simulated arc reactor thermodynamics',
          follow_up_note: 'I look forward to discussing how my skills align with your goals.'
        })
      });
    });

    await page.route('**/api/market/generate/outreach', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cold_email: 'Subject: Quantum Software Engineer role\n\nDear Stark Industries team...',
          linkedin_note: 'Hi, I am interested in the Quantum role...',
          founder_message: 'Hey Tony, I can help build the new reactor UI...'
        })
      });
    });

    await page.route('**/api/market/download/resume', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        headers: {
          'Content-Disposition': 'attachment; filename="tailored_resume_Test_Student.pdf"'
        },
        body: Buffer.from('%PDF-1.4 ... mock tailored pdf ...')
      });
    });
  });

  test('opens CV Tailor from Start Menu, loads alerts, and tailors a resume', async ({ page }) => {
    // 1. Navigate to the retro portfolio page
    await page.goto('/portfolio/mock-student-id');
    await page.waitForLoadState('networkidle');

    // 2. Open Start Menu
    const startButton = page.locator('button:has-text("Start")');
    await expect(startButton).toBeVisible();
    await startButton.click();

    // 3. Hover/Click Programs, then click CV Tailor
    const programsItem = page.locator('span:has-text("Programs")');
    await expect(programsItem).toBeVisible();
    await programsItem.hover();

    const cvTailorProgram = page.locator('.start-submenu div:has-text("CV Tailor")').first();
    await expect(cvTailorProgram).toBeVisible();
    await cvTailorProgram.click();

    // 4. Confirm CV Tailor window opens
    const windowTitle = page.locator('.win95-title:has-text("CV Tailor")');
    await expect(windowTitle).toBeVisible();

    // 5. Verify the Alert selection dropdown has Stark Industries
    const dropdown = page.locator('select');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.locator('option')).toHaveCount(3); // Choose Alert, Stark Industries, Custom JD

    // 6. Select Stark Industries and check description is populated
    await dropdown.selectOption({ label: 'Stark Industries - Quantum Software Engineer (Score: 95%)' });
    const textarea = page.locator('textarea');
    await expect(textarea).toHaveValue('Develop quantum systems for arc reactors.');

    // 7. Click Tailor CV and verify results render
    const tailorBtn = page.locator('button:has-text("Tailor CV")');
    await expect(tailorBtn).toBeEnabled();
    await tailorBtn.click();

    // Verify loading and then results
    const resultsPane = page.locator('div:has-text("1. Tailored Resume Preview")').first();
    await expect(resultsPane).toBeVisible({ timeout: 15000 });

    await expect(page.locator('div:has-text("Quantum computing pioneer")').first()).toBeVisible();
    await expect(page.locator('p:has-text("Dear Hiring Team at Stark Industries")').first()).toBeVisible();
    await expect(page.locator('pre:has-text("Subject: Quantum Software Engineer role")').first()).toBeVisible();

    // 8. Assert that downloading tailored PDF works
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("Download tailored PDF")').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('tailored_resume');
  });
});
