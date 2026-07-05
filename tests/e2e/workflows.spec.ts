import { test, expect } from '@playwright/test';
import { setupMocks } from './testHelpers';

test.describe('Tier 3: Cross-Role Workflow', () => {
  test('Complete student assessment and TPO verification flow', async ({ page }) => {
    // 1. Student completes assessment
    await setupMocks(page, 'student');
    await page.goto('/assessment');
    await page.waitForURL('**/assessment');
    
    // Answer questions
    await page.waitForSelector('text=Vector_');
    await page.locator('button:has-text("1")').first().click();
    await page.waitForTimeout(600);
    await page.locator('button.group:has(.lucide-chevron-right)').first().click();
    
    // Redirect to dashboard
    await page.waitForURL('**/dashboard/mock-student-id');
    
    // 2. Switch to TPO and verify student
    await setupMocks(page, 'institution');
    await page.goto('/tpo-dashboard/mock-institution-id/students');
    await page.waitForURL('**/tpo-dashboard/mock-institution-id/students');
    
    // Click verify on mock-student-id
    const verifyBtn = page.locator('#verify-btn-mock-student-id');
    await expect(verifyBtn).toBeVisible();
    await verifyBtn.click();
    
    // Status updates
    await expect(page.getByText('Verified').first()).toBeVisible();
  });
});

test.describe('Tier 4: Scenario 1 - Student Lifecycle', () => {
  test('Student Onboard -> Assessment -> Dashboard -> Job Matching -> Apply', async ({ page }) => {
    await setupMocks(page, 'student');
    
    // Onboard
    await page.goto('/onboard');
    await page.fill('input[name="full_name"]', 'Student Lifecycle User');
    await page.fill('input[name="graduation_year"]', '2026');
    await page.fill('input[name="department"]', 'Computer Science');
    await page.getByRole('button', { name: /FINALIZE_ONBOARDING/i }).click();
    
    // Redirect to Dashboard
    await page.waitForURL('**/dashboard/mock-student-id');
    
    // Go to Assessment
    await page.goto('/assessment');
    await page.waitForURL('**/assessment');
    await page.waitForSelector('text=Vector_');
    await page.locator('button:has-text("1")').first().click();
    await page.waitForTimeout(600);
    await page.locator('button.group:has(.lucide-chevron-right)').first().click();
    
    // Redirect back to Dashboard
    await page.waitForURL('**/dashboard/mock-student-id');
    
    // Job Matching and Apply
    // We verify the match alerts are visible and can express interest/apply
    await expect(page.getByText('Market_Scout_Sync')).toBeVisible();
    const applyBtn = page.locator('#apply-btn-lead-1');
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();
    
    // Verification of application pipeline update
    await expect(applyBtn).toBeDisabled();
    await expect(applyBtn).toContainText('Applied');
  });
});

test.describe('Tier 4: Scenario 2 - Employer Recruiter Flow', () => {
  test('Employer Onboard -> Post Job -> Run Match -> View Candidates -> Dossier PDF Export', async ({ page }) => {
    await setupMocks(page, 'employer');
    
    // Onboard
    await page.goto('/onboard');
    await page.getByRole('button', { name: /Employer/i }).click();
    await page.fill('input[name="company_name"]', 'Stark Industries');
    await page.fill('input[name="industry"]', 'Defense');
    await page.fill('input[name="contact_person"]', 'Pepper Potts');
    await page.getByRole('button', { name: /FINALIZE_ONBOARDING/i }).click();
    
    // Redirect to Employer Console
    await page.waitForURL('**/employer');
    
    // Post Job
    await page.getByRole('button', { name: /My_Job_Postings/i }).click();
    await page.getByRole('link', { name: /CREATE_NEW_ROLE/i }).first().click();
    await page.waitForURL('**/employer/jobs/new');
    
    await page.fill('#job-title', 'Quantum Dev');
    await page.fill('#job-description', 'Design next-gen AI systems.');
    await page.fill('#requirements-input', 'Python');
    await page.click('#add-tag-btn');
    await page.click('#submit-job-btn');
    
    await page.waitForURL('**/employer');
    
    // Run Match & View Candidate Dossier
    await expect(page.getByText(/NEURAL_RECRUIT/i)).toBeVisible();
    await page.getByRole('button', { name: /VIEW DOSSIER/i }).first().click();
    await expect(page.getByText(/CANDIDATE DOSSIER/i)).toBeVisible();
    
    // PDF Export test via API fetch (evaluated inside the browser page to trigger route interception)
    const pdfResponse = await page.evaluate(async () => {
      const res = await fetch('/api/export/student/mock-student-id');
      return {
        status: res.status,
        contentType: res.headers.get('content-type')
      };
    });
    expect(pdfResponse.status).toBe(200);
    expect(pdfResponse.contentType).toBe('application/pdf');
  });
});

test.describe('Tier 4: Scenario 3 - Institution Verification Flow', () => {
  test('Student onboard -> TPO Whitelist Verify -> Student completes assessment -> TPO views verified cohort', async ({ page }) => {
    // 1. Student onboards
    await setupMocks(page, 'student');
    await page.goto('/onboard');
    await page.fill('input[name="full_name"]', 'Institution Student');
    await page.fill('input[name="graduation_year"]', '2026');
    await page.fill('input[name="department"]', 'Information Technology');
    await page.getByRole('button', { name: /FINALIZE_ONBOARDING/i }).click();
    await page.waitForURL('**/dashboard/mock-student-id');
    
    // 2. TPO Whitelist verify
    await setupMocks(page, 'institution');
    await page.goto('/tpo-dashboard/mock-institution-id/students');
    await page.waitForURL('**/tpo-dashboard/mock-institution-id/students');
    
    const verifyBtn = page.locator('#verify-btn-mock-student-id');
    await expect(verifyBtn).toBeVisible();
    await verifyBtn.click();
    await expect(page.getByText('Verified').first()).toBeVisible();
    
    // 3. Student completes assessment
    await setupMocks(page, 'student');
    await page.goto('/assessment');
    await page.waitForURL('**/assessment');
    await page.waitForSelector('text=Vector_');
    await page.locator('button:has-text("1")').first().click();
    await page.waitForTimeout(600);
    await page.locator('button.group:has(.lucide-chevron-right)').first().click();
    await page.waitForURL('**/dashboard/mock-student-id');
    
    // 4. TPO views verified cohort
    await setupMocks(page, 'institution');
    await page.goto('/tpo-dashboard/mock-institution-id');
    await page.waitForURL('**/tpo-dashboard/mock-institution-id');
    await expect(page.getByRole('heading', { name: /Institutional Analytics/i })).toBeVisible();
    await expect(page.getByText(/Total Enrolled Students/i)).toBeVisible();
  });
});
