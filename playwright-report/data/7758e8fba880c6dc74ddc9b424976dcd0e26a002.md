# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: student.spec.ts >> Student Journey >> completes authentication, onboarding, assessment, and views portfolio
- Location: tests\e2e\student.spec.ts:9:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 60000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/onboard" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - navigation "Main Navigation" [ref=e3]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - link "C2C .SYST" [ref=e7] [cursor=pointer]:
            - /url: /
            - text: C2C
            - generic [ref=e8]: .SYST
          - generic [ref=e9]:
            - link "Onboard" [ref=e10] [cursor=pointer]:
              - /url: /onboard
            - link "The_Ordeal" [ref=e11] [cursor=pointer]:
              - /url: /assessment
        - link "LOGIN.EXE" [ref=e13] [cursor=pointer]:
          - /url: /login
          - img [ref=e14]
          - generic [ref=e17]: LOGIN.EXE
    - main [ref=e18]:
      - generic [ref=e20]:
        - generic [ref=e21]:
          - heading "SYSTEM.ACCESS" [level=1] [ref=e22]
          - paragraph [ref=e23]: Initialize new profile
        - generic [ref=e24]:
          - generic [ref=e26]:
            - generic [ref=e27]:
              - text: Select_Role
              - generic [ref=e28]:
                - button "Student" [ref=e29] [cursor=pointer]:
                  - img [ref=e30]
                  - generic [ref=e33]: Student
                - button "Institution / TPO" [ref=e34] [cursor=pointer]:
                  - img [ref=e35]
                  - generic [ref=e40]: Institution / TPO
                - button "Company" [ref=e41] [cursor=pointer]:
                  - img [ref=e42]
                  - generic [ref=e45]: Company
              - paragraph [ref=e46]: Take assessments & get placed
            - generic [ref=e47]:
              - text: Email_Address
              - generic [ref=e48]:
                - generic:
                  - img
                - textbox "Email address" [ref=e49]:
                  - /placeholder: you@example.com
                  - text: student_1781842298871@gmail.com
            - generic [ref=e50]:
              - text: Access_Key
              - generic [ref=e51]:
                - generic:
                  - img
                - textbox "Access key password" [ref=e52]:
                  - /placeholder: ••••••••
                  - text: testpassword123
            - generic [ref=e53]:
              - img [ref=e54]
              - paragraph [ref=e56]: Failed to fetch
            - button "INITIALIZE_SIGNUP" [ref=e57] [cursor=pointer]:
              - generic [ref=e58]:
                - text: INITIALIZE_SIGNUP
                - img [ref=e59]
            - generic [ref=e65]: Or_Use_External_Provider
            - button "AUTHENTICATE_WITH_GOOGLE" [ref=e66] [cursor=pointer]:
              - img [ref=e67]
              - text: AUTHENTICATE_WITH_GOOGLE
          - button "Existing operator? Verify Credentials" [ref=e73] [cursor=pointer]
        - generic [ref=e74]:
          - link "Privacy_Protocols" [ref=e75] [cursor=pointer]:
            - /url: "#"
          - link "Terms_of_Service" [ref=e76] [cursor=pointer]:
            - /url: "#"
    - contentinfo [ref=e77]:
      - generic [ref=e80]:
        - generic [ref=e81]:
          - generic [ref=e82]: C2C.SYST
          - paragraph [ref=e83]: Neural_Recruitment_Infrastructure
        - generic [ref=e84]:
          - link "Documentation" [ref=e85] [cursor=pointer]:
            - /url: "#"
          - link "Privacy_Protocol" [ref=e86] [cursor=pointer]:
            - /url: "#"
          - link "Security_Audit" [ref=e87] [cursor=pointer]:
            - /url: "#"
        - paragraph [ref=e88]: © 2026 C2C.OS_BUILD_v2.0.4. All rights reserved.
  - alert [ref=e89]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Student Journey', () => {
  4   |   // Use a unique email for each test run to avoid "already exists" errors
  5   |   const timestamp = Date.now();
  6   |   const testEmail = `student_${timestamp}@gmail.com`;
  7   |   const testPassword = 'testpassword123';
  8   | 
  9   |   test('completes authentication, onboarding, assessment, and views portfolio', async ({ page }) => {
  10  |     page.on('console', msg => console.log(`[BROWSER]: ${msg.text()}`));
  11  |     
  12  |     // 1. Authentication & Onboarding
  13  |     await page.goto('/login');
  14  |     
  15  |     // Switch to Signup
  16  |     await page.getByText(/New operator\?/i).click();
  17  |     
  18  |     // Select Student Role (default, but let's be sure)
  19  |     await page.getByRole('button', { name: /Student/i }).click();
  20  |     
  21  |     // Fill credentials
  22  |     await page.locator('input[type="email"]').fill(testEmail);
  23  |     await page.locator('input[type="password"]').fill(testPassword);
  24  |     
  25  |     // Submit signup
  26  |     await page.getByRole('button', { name: /INITIALIZE_SIGNUP/i }).click();
  27  | 
  28  |     // 2. Onboarding
  29  |     // Wait for the URL to change to /onboard
> 30  |     await page.waitForURL('**/onboard');
      |                ^ Error: page.waitForURL: Test timeout of 60000ms exceeded.
  31  |     
  32  |     // Ensure the form is loaded
  33  |     await page.waitForSelector('input[name="full_name"]');
  34  |     
  35  |     // Fill out onboarding form
  36  |     await page.fill('input[name="full_name"]', 'Test Student ' + timestamp);
  37  |     await page.fill('input[name="graduation_year"]', '2026');
  38  |     await page.fill('input[name="department"]', 'Computer Science');
  39  |     
  40  |     // Submit onboarding
  41  |     await page.getByRole('button', { name: /FINALIZE_ONBOARDING/i }).click();
  42  | 
  43  |     // 3. Dashboard -> Check Assessment
  44  |     // We should either go straight to dashboard or be prompted
  45  |     await page.waitForURL('**/dashboard/**');
  46  |     
  47  |     // Look for "Initialize_The_Ordeal" button if assessment is needed
  48  |     const ordealButton = page.getByRole('link', { name: /Initialize_The_Ordeal/i });
  49  |     if (await ordealButton.isVisible()) {
  50  |       await ordealButton.click();
  51  |       
  52  |       // 4. Assessment (The Ordeal)
  53  |       await page.waitForURL('**/assessment');
  54  |       
  55  |       // Wait for syncing animation to finish
  56  |       // The first question should appear
  57  |       
  58  |       // Loop answering questions until we're back at the dashboard
  59  |       while (page.url().includes('assessment')) {
  60  |         try {
  61  |           // Wait for either Likert buttons, multiple choice buttons, or text input
  62  |           const isQuestionVisible = await page.waitForSelector('text=Vector_', { timeout: 10000 }).catch(() => null);
  63  |           if (!isQuestionVisible) {
  64  |              // If we're redirected, break
  65  |              if (page.url().includes('dashboard')) break;
  66  |           }
  67  | 
  68  |           // check what type of question it is
  69  |           const likertOption = page.locator('button:has-text("1")').first();
  70  |           const mcqOption = page.locator('button.group:has(.lucide-chevron-right)').first();
  71  |           const textInput = page.locator('input[placeholder="WAITING_FOR_CANDIDATE_INPUT_"]');
  72  |           
  73  |           if (await textInput.isVisible()) {
  74  |             await textInput.fill('Test Answer');
  75  |             await textInput.press('Enter');
  76  |           } else if (await likertOption.isVisible()) {
  77  |             await likertOption.click();
  78  |           } else if (await mcqOption.isVisible()) {
  79  |             await mcqOption.click();
  80  |           }
  81  |           
  82  |           // Wait a bit for the transition (400ms defined in handleResponse)
  83  |           await page.waitForTimeout(500);
  84  |         } catch (e) {
  85  |           // If error occurs, we might have transitioned
  86  |           if (page.url().includes('dashboard')) break;
  87  |         }
  88  |       }
  89  |     }
  90  | 
  91  |     // 5. Back on Dashboard -> Portfolio
  92  |     await page.waitForURL('**/dashboard/**');
  93  |     
  94  |     // Check for "Boot_Retro_Portfolio" link
  95  |     const portfolioLink = page.getByRole('link', { name: /Boot_Retro_Portfolio/i });
  96  |     await expect(portfolioLink).toBeVisible();
  97  |     
  98  |     // Click portfolio
  99  |     await portfolioLink.click();
  100 |     
  101 |     // 6. Portfolio
  102 |     await page.waitForURL('**/portfolio/**');
  103 |     // Verify Windows 95 aesthetic element
  104 |     await expect(page.getByText(/My Computer/i).first()).toBeVisible();
  105 |   });
  106 | });
  107 | 
```