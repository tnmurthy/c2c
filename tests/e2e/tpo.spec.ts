import { test, expect } from '@playwright/test';

test.describe('TPO / Institution Journey', () => {
  const timestamp = Date.now();
  const testEmail = `tpo_${timestamp}@university.edu`;
  const testPassword = 'testpassword123';

  test('completes authentication, onboarding, and navigates TPO dashboard', async ({ page }) => {
    page.on('console', msg => console.log(`[BROWSER]: ${msg.text()}`));
    
    // 1. Authentication & Onboarding
    await page.goto('/login');
    
    // Switch to Signup
    await page.getByText(/New operator\?/i).click();
    
    // Select Institution / TPO Role
    await page.getByRole('button', { name: /Institution \/ TPO/i }).click();
    
    // Fill credentials
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    
    // Submit signup
    // Known issue: this may fail with 429 Too Many Requests if rate limited, which is acceptable
    await page.getByRole('button', { name: /INITIALIZE_SIGNUP/i }).click();

    // 2. Onboarding
    // Wait for the URL to change to /onboard
    await page.waitForURL('**/onboard');
    
    // Switch to Institution tab on onboard page
    await page.getByRole('button', { name: /Institution\/TPO/i }).click();
    
    // Ensure the form is loaded
    await page.waitForSelector('input[name="name"]');
    
    // Fill out onboarding form
    await page.fill('input[name="name"]', `Global Tech University ${timestamp}`);
    await page.selectOption('select[name="type"]', 'University');
    // Domain is pre-filled based on email, but let's make sure
    await page.fill('input[name="domain"]', 'university.edu');
    await page.fill('input[name="location"]', 'San Francisco, CA');
    
    // Submit onboarding
    await page.getByRole('button', { name: /FINALIZE_ONBOARDING/i }).click();

    // 3. TPO Command Center Dashboard
    await page.waitForURL('**/tpo-dashboard/**');
    
    // Verify dashboard elements
    await expect(page.getByRole('heading', { name: /Institutional Analytics/i })).toBeVisible();
    await expect(page.getByText(/Total Enrolled Students/i)).toBeVisible();
    await expect(page.getByText(/Founder Profile Distribution/i)).toBeVisible();
    await expect(page.getByText(/National Benchmarks Comparison/i)).toBeVisible();
    
    // Verify intervention feed
    await expect(page.getByRole('heading', { name: /Intervention Required/i })).toBeVisible();
    
    // Verify sidebar links
    await expect(page.getByRole('link', { name: /Student Tracking/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Talent Pool/i })).toBeVisible();
  });
});
