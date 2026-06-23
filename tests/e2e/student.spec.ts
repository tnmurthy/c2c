import { test, expect } from '@playwright/test';

test.describe('Student Journey', () => {
  // Use a unique email for each test run to avoid "already exists" errors
  const timestamp = Date.now();
  const testEmail = `student_${timestamp}@gmail.com`;
  const testPassword = 'testpassword123';

  test('completes authentication, onboarding, assessment, and views portfolio', async ({ page }) => {
    page.on('console', msg => console.log(`[BROWSER]: ${msg.text()}`));
    
    // 1. Authentication & Onboarding
    await page.goto('/login');
    
    // Switch to Signup
    await page.getByText(/New operator\?/i).click();
    
    // Select Student Role (default, but let's be sure)
    await page.getByRole('button', { name: /Student/i }).click();
    
    // Fill credentials
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    
    // Submit signup
    await page.getByRole('button', { name: /INITIALIZE_SIGNUP/i }).click();

    // 2. Onboarding
    // Wait for the URL to change to /onboard
    await page.waitForURL('**/onboard');
    
    // Ensure the form is loaded
    await page.waitForSelector('input[name="full_name"]');
    
    // Fill out onboarding form
    await page.fill('input[name="full_name"]', 'Test Student ' + timestamp);
    await page.fill('input[name="graduation_year"]', '2026');
    await page.fill('input[name="department"]', 'Computer Science');
    
    // Submit onboarding
    await page.getByRole('button', { name: /FINALIZE_ONBOARDING/i }).click();

    // 3. Dashboard -> Check Assessment
    // We should either go straight to dashboard or be prompted
    await page.waitForURL('**/dashboard/**');
    
    // Look for "Initialize_The_Ordeal" button if assessment is needed
    const ordealButton = page.getByRole('link', { name: /Initialize_The_Ordeal/i });
    if (await ordealButton.isVisible()) {
      await ordealButton.click();
      
      // 4. Assessment (The Ordeal)
      await page.waitForURL('**/assessment');
      
      // Wait for syncing animation to finish
      // The first question should appear
      
      // Loop answering questions until we're back at the dashboard
      while (page.url().includes('assessment')) {
        try {
          // Wait for either Likert buttons, multiple choice buttons, or text input
          const isQuestionVisible = await page.waitForSelector('text=Vector_', { timeout: 10000 }).catch(() => null);
          if (!isQuestionVisible) {
             // If we're redirected, break
             if (page.url().includes('dashboard')) break;
          }

          // check what type of question it is
          const likertOption = page.locator('button:has-text("1")').first();
          const mcqOption = page.locator('button.group:has(.lucide-chevron-right)').first();
          const textInput = page.locator('input[placeholder="WAITING_FOR_CANDIDATE_INPUT_"]');
          
          if (await textInput.isVisible()) {
            await textInput.fill('Test Answer');
            await textInput.press('Enter');
          } else if (await likertOption.isVisible()) {
            await likertOption.click();
          } else if (await mcqOption.isVisible()) {
            await mcqOption.click();
          }
          
          // Wait a bit for the transition (400ms defined in handleResponse)
          await page.waitForTimeout(500);
        } catch (e) {
          // If error occurs, we might have transitioned
          if (page.url().includes('dashboard')) break;
        }
      }
    }

    // 5. Back on Dashboard -> Portfolio
    await page.waitForURL('**/dashboard/**');
    
    // Check for "Boot_Retro_Portfolio" link
    const portfolioLink = page.getByRole('link', { name: /Boot_Retro_Portfolio/i });
    await expect(portfolioLink).toBeVisible();
    
    // Click portfolio
    await portfolioLink.click();
    
    // 6. Portfolio
    await page.waitForURL('**/portfolio/**');
    // Verify Windows 95 aesthetic element
    await expect(page.getByText(/My Computer/i).first()).toBeVisible();
  });
});
