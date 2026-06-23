import { test, expect } from '@playwright/test';

test.describe('Admin Journey', () => {
  const timestamp = Date.now();
  const testEmail = `admin_${timestamp}@taliatech.in`;
  const testPassword = 'adminpassword123';

  test('completes authentication and navigates to the Global Admin Root dashboard', async ({ page }) => {
    page.on('console', msg => console.log(`[BROWSER]: ${msg.text()}`));

    // 1. Authentication
    await page.goto('/login');

    // Switch to Signup
    await page.getByText(/New operator\?/i).click();

    // Fill credentials with @taliatech.in domain
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);

    // Submit signup
    await page.getByRole('button', { name: /INITIALIZE_SIGNUP/i }).click();

    // 2. Navigate to Admin Root
    // Wait for either the dashboard, onboard, or any logged in state.
    // Then navigate to /admin since we have the correct domain.
    // If rate limit hits, this might fail, which is acceptable per requirements.
    await page.waitForResponse(response => response.url().includes('/auth/v1') && response.request().method() === 'POST');

    // Force navigate to admin root to bypass standard routing
    await page.goto('/admin');

    // 3. Verify Global Admin Root Dashboard Features
    await expect(page.getByRole('heading', { name: /Global Admin Root/i })).toBeVisible();

    // Verify Stats Summary elements
    await expect(page.getByText('Active Nodes')).toBeVisible();
    await expect(page.getByText('Market Entities')).toBeVisible();
    await expect(page.getByText('Psychometric Items')).toBeVisible();
    await expect(page.getByText('Flagged (Hard/Easy)')).toBeVisible();

    // Verify Market Leads Stream table
    await expect(page.getByRole('heading', { name: /Market Leads Stream/i })).toBeVisible();
    
    // Verify Psychometric Item Analysis table
    await expect(page.getByRole('heading', { name: /Psychometric Item Analysis/i })).toBeVisible();
  });
});
