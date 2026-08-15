import { test, expect } from '@playwright/test';
import { setupMocks } from './testHelpers';

test.describe('Student Journey - Happy Paths', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page, 'student');
  });

  test('completes onboarding, views dashboard, takes assessment, and views portfolio', async ({ page }) => {
    // 1. Onboarding Form Submission
    await page.goto('/onboard');
    
    // Fill out onboarding form
    await page.fill('input[name="full_name"]', 'John Doe');
    await page.fill('input[name="graduation_year"]', '2026');
    await page.fill('input[name="department"]', 'Computer Science');
    
    // Submit onboarding
    await page.getByRole('button', { name: /FINALIZE_ONBOARDING/i }).click();

    // 2. Viewing Dashboard
    await page.waitForURL('**/dashboard/mock-student-id');
    
    // Check dashboard elements: radar chart/radar container, archetype card, feedback link/button
    await expect(page.getByText(/Builders thrive on creating/i)).toBeVisible();
    await expect(page.getByText(/Optimization_Protocols/i)).toBeVisible();
    await expect(page.getByText(/Get_360_Feedback_Link/i)).toBeVisible();

    // 3. Running the Ordeal Assessment
    await page.goto('/assessment');
    await page.waitForURL('**/assessment');
    
    // Answer the questions
    const isQuestionVisible = await page.waitForSelector('text=Vector_', { timeout: 10000 }).catch(() => null);
    expect(isQuestionVisible).not.toBeNull();
    
    // Answer Q1 (Likert)
    const likertOption = page.locator('button:has-text("1")').first();
    await expect(likertOption).toBeVisible();
    await likertOption.click();
    
    // Transition/Wait
    await page.waitForTimeout(600);
    
    // Answer Q2 (SJT)
    const sjtOption = page.locator('button.group:has(.lucide-chevron-right)').first();
    await expect(sjtOption).toBeVisible();
    await sjtOption.click();

    // Wait for submission flow and redirection to dashboard
    await page.waitForURL('**/dashboard/mock-student-id', { timeout: 15000 });

    // 4. Viewing Windows 95 Retro Portfolio
    const portfolioLink = page.getByRole('link', { name: /Boot_Retro_Portfolio/i });
    await expect(portfolioLink).toBeVisible();
    await portfolioLink.click();
    
    await page.waitForURL('**/portfolio/mock-student-id');
    await expect(page.getByText(/My Computer/i).first()).toBeVisible();
  });
});

test.describe('Student Journey - Boundary & Corner Cases', () => {
  test('onboard empty name validation', async ({ page }) => {
    await setupMocks(page, 'student');
    await page.goto('/onboard');
    
    await page.fill('input[name="full_name"]', '');
    await page.fill('input[name="graduation_year"]', '2026');
    await page.fill('input[name="department"]', 'Computer Science');
    
    await page.getByRole('button', { name: /FINALIZE_ONBOARDING/i }).click();
    
    // Check validation error message
    await expect(page.getByText('Candidate Full Name is required.')).toBeVisible();
  });

  test('onboard invalid graduation year format', async ({ page }) => {
    await setupMocks(page, 'student');
    await page.goto('/onboard');
    
    await page.fill('input[name="full_name"]', 'John Doe');
    await page.fill('input[name="graduation_year"]', '1800'); // invalid year
    await page.fill('input[name="department"]', 'Computer Science');
    
    await page.getByRole('button', { name: /FINALIZE_ONBOARDING/i }).click();
    
    await expect(page.getByText('Please enter a valid graduation year format (e.g. 2026).')).toBeVisible();
  });

  test('unauthenticated user is redirected to login from dashboard', async ({ page }) => {
    await setupMocks(page); // No role/session
    await page.goto('/dashboard/mock-student-id');
    await page.waitForURL('**/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('unauthenticated user is redirected to login from assessment', async ({ page }) => {
    await setupMocks(page); // No role/session
    await page.goto('/assessment');
    await page.waitForURL('**/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
