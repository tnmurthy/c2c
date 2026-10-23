import { test, expect } from '@playwright/test';
import { setupMocks } from './testHelpers';

test.describe('Candidate Portfolio, Socials & TypeSafe AI Features', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page, 'student');
  });

  test('loads retro portfolio and verifies desktop social shortcuts', async ({ page }) => {
    await page.goto('/portfolio/mock-student-id');

    // Wait for boot screen animation to finish and desktop to load
    await page.waitForSelector('.desktop-shortcut', { timeout: 15000 });

    // Verify core retro desktop icons
    await expect(page.getByText('My Computer').first()).toBeVisible();
    await expect(page.getByText('My Resume').first()).toBeVisible();
    await expect(page.getByText('CV Tailor').first()).toBeVisible();

    // Verify dynamic social media shortcuts on desktop
    await expect(page.getByText('GitHub').first()).toBeVisible();
    await expect(page.getByText('LinkedIn').first()).toBeVisible();
    await expect(page.getByText('X / Twitter').first()).toBeVisible();
    await expect(page.locator('.desktop-shortcut-label', { hasText: /^Meta$/ })).toBeVisible();
  });

  test('opens About window and validates social badges and archetype details', async ({ page }) => {
    await page.goto('/portfolio/mock-student-id');

    // Wait for desktop icons
    await page.waitForSelector('.desktop-shortcut', { timeout: 15000 });

    // Open About Candidate window
    const aboutShortcut = page.locator('.desktop-shortcut').filter({ hasText: 'My Computer' });
    await expect(aboutShortcut).toBeVisible();
    await aboutShortcut.dblclick();

    // Verify About window opened
    await expect(page.locator('.win95-title-bar').filter({ hasText: 'About Candidate' })).toBeVisible();

    // Verify candidate details in About window
    await expect(page.getByText('Aarav Sharma')).toBeVisible();
    await expect(page.getByText('Computer Science')).toBeVisible();
    await expect(page.getByText('BUILDER')).toBeVisible();

    // Verify social connection action buttons inside About window
    await expect(page.getByRole('button', { name: /GitHub/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /LinkedIn/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /X \/ Twitter/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Meta/i })).toBeVisible();
  });

  test('opens CV Tailor window and verifies tailored intelligence workspace', async ({ page }) => {
    await page.goto('/portfolio/mock-student-id');

    await page.waitForSelector('.desktop-shortcut', { timeout: 15000 });

    // Open CV Tailor window
    const cvTailorShortcut = page.locator('.desktop-shortcut').filter({ hasText: 'CV Tailor' });
    await expect(cvTailorShortcut).toBeVisible();
    await cvTailorShortcut.dblclick();

    // Verify CV Tailor window is open
    await expect(page.locator('.win95-title-bar').filter({ hasText: 'CV Tailor' })).toBeVisible();
    await expect(page.getByText(/Select Opportunity Alert/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Tailor CV/i })).toBeVisible();
  });

  test('renders cyber platform footer with social media links', async ({ page }) => {
    await page.goto('/onboard');

    // Scroll to footer
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Verify brand copyright and slogan
    await expect(footer.getByText(/C2C\.OS_BUILD/i)).toBeVisible();

    // Verify social links exist in footer
    const twitterLink = footer.locator('a[aria-label="X / Twitter"]');
    await expect(twitterLink).toBeVisible();
    await expect(twitterLink).toHaveAttribute('href', 'https://x.com');

    const metaLink = footer.locator('a[aria-label="Meta"]');
    await expect(metaLink).toBeVisible();
    await expect(metaLink).toHaveAttribute('href', 'https://instagram.com');

    const linkedinLink = footer.locator('a[aria-label="LinkedIn"]');
    await expect(linkedinLink).toBeVisible();
    await expect(linkedinLink).toHaveAttribute('href', 'https://linkedin.com');

    const githubLink = footer.locator('a[aria-label="GitHub"]');
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute('href', /^https:\/\/github\.com\//);
  });
});
