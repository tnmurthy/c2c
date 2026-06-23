import { test, expect } from '@playwright/test';

test.describe('Employer Journey', () => {
  const timestamp = Date.now();
  const testEmail = `employer_${timestamp}@gmail.com`;
  const testPassword = 'testpassword123';

  test('completes authentication, onboarding, discovers talent, and manages jobs', async ({ page }) => {
    page.on('console', msg => console.log(`[BROWSER]: ${msg.text()}`));
    
    // 1. Authentication & Onboarding
    await page.goto('/login');
    
    // Switch to Signup
    await page.getByText(/New operator\?/i).click();
    
    // Select Company Role
    await page.getByRole('button', { name: /Company/i }).click();
    
    // Fill credentials
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    
    // Submit signup
    await page.getByRole('button', { name: /INITIALIZE_SIGNUP/i }).click();

    // 2. Onboarding
    // The role defaults to student, so click the Employer tab
    await page.getByRole('button', { name: /Employer/i }).click();
    
    // Ensure the employer form is loaded
    await page.waitForSelector('input[name="company_name"]');
    
    // Fill out onboarding form
    await page.fill('input[name="company_name"]', 'Acme Corp ' + timestamp);
    await page.fill('input[name="industry"]', 'Technology');
    await page.fill('input[name="contact_person"]', 'John Doe');
    
    // Submit onboarding
    await page.getByRole('button', { name: /FINALIZE_ONBOARDING/i }).click();

    // 3. Recruiter Console (Discover Talent)
    await page.waitForURL('**/employer');
    
    await expect(page.getByText(/NEURAL_RECRUIT/i)).toBeVisible();
    await expect(page.getByText(/CANDIDATES MATCHED/i)).toBeVisible();

    // Toggle Strict Founder Fit
    await page.getByText('Strict Founder Fit', { exact: true }).click();

    // Sort by Tech Fit
    await page.locator('select').selectOption('tech');

    // View Candidate Dossier
    await page.getByRole('button', { name: /VIEW DOSSIER/i }).first().click();
    
    // Verify panel opens
    await expect(page.getByText(/CANDIDATE DOSSIER/i)).toBeVisible();

    // Actions on Dossier
    await page.getByRole('button', { name: /SAVE TO TALENT POOL/i }).click();

    // 4. Job Management
    await page.getByRole('button', { name: /My_Job_Postings/i }).click();
    
    await expect(page.getByRole('heading', { name: /Active Job Postings/i })).toBeVisible();

    // Create New Role
    await page.getByRole('link', { name: /CREATE_NEW_ROLE/i }).first().click();
    
    await page.waitForURL('**/employer/jobs/new');
    
    // Fill job requisition form
    await page.fill('input[placeholder="Senior Full Stack Engineer"]', 'Senior QA Engineer');
    await page.fill('textarea', 'Ensure software quality across the neural net.');
    await page.fill('input[placeholder="React, Node.js, System Design (comma separated)"]', 'Playwright, TypeScript');
    await page.fill('input[placeholder="San Francisco, CA"]', 'Remote');
    await page.fill('input[placeholder="$120k - $160k"]', '$100k - $140k');
    
    // Publish
    await page.getByRole('button', { name: /PUBLISH REQUISITION/i }).click();

    // Verify redirection and new job posting
    await page.waitForURL('**/employer');
    await expect(page.getByText('Senior QA Engineer')).toBeVisible();
  });
});
