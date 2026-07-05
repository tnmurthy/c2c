import { test, expect } from '@playwright/test';
import { setupMocks } from './testHelpers';

test.describe('Employer Journey - Happy Paths', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page, 'employer');
  });

  test('completes onboarding, discovers talent, and manages job postings', async ({ page }) => {
    // 1. Onboarding
    await page.goto('/onboard');
    await page.getByRole('button', { name: /Employer/i }).click();
    
    // Fill out onboarding form
    await page.fill('input[name="company_name"]', 'Acme Corp');
    await page.fill('input[name="industry"]', 'Technology');
    await page.fill('input[name="contact_person"]', 'John Doe');
    
    // Submit onboarding
    await page.getByRole('button', { name: /FINALIZE_ONBOARDING/i }).click();

    // 2. Discovering candidates
    await page.waitForURL('**/employer');
    await expect(page.getByText(/NEURAL_RECRUIT/i)).toBeVisible();
    await expect(page.getByText(/CANDIDATES MATCHED/i)).toBeVisible();

    // Toggle Strict Founder Fit
    await page.getByText('Strict Founder Fit', { exact: true }).click();

    // Sort candidates
    await page.locator('select').selectOption('tech');

    // Viewing Candidate Dossier modal
    await page.getByRole('button', { name: /VIEW DOSSIER/i }).first().click();
    await expect(page.getByText(/CANDIDATE DOSSIER/i)).toBeVisible();

    // saving/bookmarking candidate
    await page.getByRole('button', { name: /SAVE TO TALENT POOL/i }).click();

    // 3. Creating a new job role
    await page.getByRole('button', { name: /My_Job_Postings/i }).click();
    await expect(page.getByRole('heading', { name: /Active Job Postings/i })).toBeVisible();

    await page.getByRole('link', { name: /CREATE_NEW_ROLE/i }).first().click();
    await page.waitForURL('**/employer/jobs/new');

    // Fill job requisition form
    await page.fill('#job-title', 'Senior QA Engineer');
    await page.fill('#job-description', 'Ensure software quality across the neural net.');
    await page.fill('#requirements-input', 'Playwright');
    await page.click('#add-tag-btn');
    await page.fill('#job-location', 'Remote');
    await page.fill('#salary-range', '$100k - $140k');

    // Publish
    await page.click('#submit-job-btn');

    // Verify redirection and new job posting
    await page.waitForURL('**/employer');
    await page.getByRole('button', { name: /My_Job_Postings/i }).click();
    await expect(page.getByText('Senior QA Engineer')).toBeVisible();
  });
});

test.describe('Employer Journey - Boundary Cases', () => {
  test('onboard empty company name validation', async ({ page }) => {
    await setupMocks(page, 'employer');
    await page.goto('/onboard');
    await page.getByRole('button', { name: /Employer/i }).click();
    
    await page.fill('input[name="company_name"]', '');
    await page.fill('input[name="industry"]', 'Technology');
    await page.fill('input[name="contact_person"]', 'John Doe');
    
    await page.getByRole('button', { name: /FINALIZE_ONBOARDING/i }).click();
    await expect(page.getByText('Company Name is required.')).toBeVisible();
  });

  test('job creation empty title validation', async ({ page }) => {
    await setupMocks(page, 'employer');
    await page.goto('/employer/jobs/new');
    
    await page.fill('#job-title', '');
    await page.fill('#job-description', 'Ensure software quality across the neural net.');
    await page.fill('#requirements-input', 'Playwright');
    await page.click('#add-tag-btn');
    
    await page.click('#submit-job-btn');
    await expect(page.getByText('Job title is required.')).toBeVisible();
  });

  test('unauthenticated user is redirected to login from employer dashboard', async ({ page }) => {
    await setupMocks(page); // No role/session
    await page.goto('/employer');
    await page.waitForURL('**/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
