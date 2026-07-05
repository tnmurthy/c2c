import { test, expect } from '@playwright/test';
import { setupMocks } from './testHelpers';

test.describe('Admin Journey - Happy Paths', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page, 'admin');
  });

  test('accesses admin dashboard with stats and tables', async ({ page }) => {
    // Navigate to Admin Root
    await page.goto('/admin');

    // Verify Admin Dashboard features
    await expect(page.getByRole('heading', { name: /Global Admin Root/i })).toBeVisible();

    // Verify Stats cards
    await expect(page.getByText('Active Nodes')).toBeVisible();
    await expect(page.getByText('Market Entities')).toBeVisible();
    await expect(page.getByText('Psychometric Items')).toBeVisible();

    // Verify tables
    await expect(page.getByRole('heading', { name: /Market Leads Stream/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Psychometric Item Analysis/i })).toBeVisible();
  });
});

test.describe('Admin Journey - Boundary & RBAC Cases', () => {
  test('restricting non-admin domain from admin root', async ({ page }) => {
    // Setup session as student (email does not end with @taliatech.in)
    await setupMocks(page, 'student');
    
    await page.goto('/admin');
    
    // Should be redirected back to /login because student domain is not authorized
    await page.waitForURL('**/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('restricting employer role from admin root', async ({ page }) => {
    // Setup session as employer
    await setupMocks(page, 'employer');
    
    await page.goto('/admin');
    
    // Should be redirected back to /login
    await page.waitForURL('**/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
