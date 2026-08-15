import { test, expect } from '@playwright/test';
import { setupMocks } from './testHelpers';

test.describe('TPO / Institution Journey - Happy Paths', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page, 'institution');
  });

  test('completes onboarding and navigates TPO dashboard', async ({ page }) => {
    // 1. Onboarding
    await page.goto('/onboard');
    await page.getByRole('button', { name: /Institution\/TPO/i }).click();
    
    // Fill out onboarding form
    await page.fill('input[name="name"]', 'Global Tech University');
    await page.selectOption('select[name="type"]', 'University');
    await page.fill('input[name="domain"]', 'university.edu');
    await page.fill('input[name="location"]', 'San Francisco, CA');
    
    // Submit onboarding
    await page.getByRole('button', { name: /FINALIZE_ONBOARDING/i }).click();

    // 2. TPO Command Center Dashboard
    await page.waitForURL('**/tpo-dashboard/mock-institution-id');
    
    // Verify dashboard elements
    await expect(page.getByRole('heading', { name: /Institutional Analytics/i })).toBeVisible();
    await expect(page.getByText(/Total Enrolled Students/i)).toBeVisible();
    await expect(page.getByText(/Founder Profile Distribution/i)).toBeVisible();
    
    // Verify intervention feed
    await expect(page.getByRole('heading', { name: /Intervention Required/i })).toBeVisible();
  });
});

test.describe('TPO / Institution Journey - Boundary Cases', () => {
  test('non-academic email domain validation on onboard', async ({ page }) => {
    await setupMocks(page, 'institution');
    await page.goto('/onboard');
    await page.getByRole('button', { name: /Institution\/TPO/i }).click();
    
    await page.fill('input[name="name"]', 'Global Tech University');
    await page.selectOption('select[name="type"]', 'University');
    await page.fill('input[name="domain"]', 'gmail.com'); // non-academic
    await page.fill('input[name="location"]', 'San Francisco, CA');
    
    await page.getByRole('button', { name: /FINALIZE_ONBOARDING/i }).click();
    
    await expect(page.getByText('Only academic email domains (.edu, .ac.in) are authorized for TPO onboarding.')).toBeVisible();
  });

  test('unauthenticated user is redirected to login from TPO dashboard', async ({ page }) => {
    await setupMocks(page); // No role/session
    await page.goto('/tpo-dashboard/mock-institution-id');
    await page.waitForURL('**/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
