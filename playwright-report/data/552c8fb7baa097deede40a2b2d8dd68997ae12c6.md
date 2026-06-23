# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: employer.spec.ts >> Employer Journey >> completes authentication, onboarding, discovers talent, and manages jobs
- Location: tests\e2e\employer.spec.ts:8:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Employer/i })

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
              - paragraph [ref=e46]: Recruit verified talent
            - generic [ref=e47]:
              - text: Email_Address
              - generic [ref=e48]:
                - generic:
                  - img
                - textbox "Email address" [ref=e49]:
                  - /placeholder: you@example.com
                  - text: employer_1781842235877@gmail.com
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
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Employer Journey', () => {
  4  |   const timestamp = Date.now();
  5  |   const testEmail = `employer_${timestamp}@gmail.com`;
  6  |   const testPassword = 'testpassword123';
  7  | 
  8  |   test('completes authentication, onboarding, discovers talent, and manages jobs', async ({ page }) => {
  9  |     page.on('console', msg => console.log(`[BROWSER]: ${msg.text()}`));
  10 |     
  11 |     // 1. Authentication & Onboarding
  12 |     await page.goto('/login');
  13 |     
  14 |     // Switch to Signup
  15 |     await page.getByText(/New operator\?/i).click();
  16 |     
  17 |     // Select Company Role
  18 |     await page.getByRole('button', { name: /Company/i }).click();
  19 |     
  20 |     // Fill credentials
  21 |     await page.locator('input[type="email"]').fill(testEmail);
  22 |     await page.locator('input[type="password"]').fill(testPassword);
  23 |     
  24 |     // Submit signup
  25 |     await page.getByRole('button', { name: /INITIALIZE_SIGNUP/i }).click();
  26 | 
  27 |     // 2. Onboarding
  28 |     // The role defaults to student, so click the Employer tab
> 29 |     await page.getByRole('button', { name: /Employer/i }).click();
     |                                                           ^ Error: locator.click: Test timeout of 60000ms exceeded.
  30 |     
  31 |     // Ensure the employer form is loaded
  32 |     await page.waitForSelector('input[name="company_name"]');
  33 |     
  34 |     // Fill out onboarding form
  35 |     await page.fill('input[name="company_name"]', 'Acme Corp ' + timestamp);
  36 |     await page.fill('input[name="industry"]', 'Technology');
  37 |     await page.fill('input[name="contact_person"]', 'John Doe');
  38 |     
  39 |     // Submit onboarding
  40 |     await page.getByRole('button', { name: /FINALIZE_ONBOARDING/i }).click();
  41 | 
  42 |     // 3. Recruiter Console (Discover Talent)
  43 |     await page.waitForURL('**/employer');
  44 |     
  45 |     await expect(page.getByText(/NEURAL_RECRUIT/i)).toBeVisible();
  46 |     await expect(page.getByText(/CANDIDATES MATCHED/i)).toBeVisible();
  47 | 
  48 |     // Toggle Strict Founder Fit
  49 |     await page.getByText('Strict Founder Fit', { exact: true }).click();
  50 | 
  51 |     // Sort by Tech Fit
  52 |     await page.locator('select').selectOption('tech');
  53 | 
  54 |     // View Candidate Dossier
  55 |     await page.getByRole('button', { name: /VIEW DOSSIER/i }).first().click();
  56 |     
  57 |     // Verify panel opens
  58 |     await expect(page.getByText(/CANDIDATE DOSSIER/i)).toBeVisible();
  59 | 
  60 |     // Actions on Dossier
  61 |     await page.getByRole('button', { name: /SAVE TO TALENT POOL/i }).click();
  62 | 
  63 |     // 4. Job Management
  64 |     await page.getByRole('button', { name: /My_Job_Postings/i }).click();
  65 |     
  66 |     await expect(page.getByRole('heading', { name: /Active Job Postings/i })).toBeVisible();
  67 | 
  68 |     // Create New Role
  69 |     await page.getByRole('link', { name: /CREATE_NEW_ROLE/i }).first().click();
  70 |     
  71 |     await page.waitForURL('**/employer/jobs/new');
  72 |     
  73 |     // Fill job requisition form
  74 |     await page.fill('input[placeholder="Senior Full Stack Engineer"]', 'Senior QA Engineer');
  75 |     await page.fill('textarea', 'Ensure software quality across the neural net.');
  76 |     await page.fill('input[placeholder="React, Node.js, System Design (comma separated)"]', 'Playwright, TypeScript');
  77 |     await page.fill('input[placeholder="San Francisco, CA"]', 'Remote');
  78 |     await page.fill('input[placeholder="$120k - $160k"]', '$100k - $140k');
  79 |     
  80 |     // Publish
  81 |     await page.getByRole('button', { name: /PUBLISH REQUISITION/i }).click();
  82 | 
  83 |     // Verify redirection and new job posting
  84 |     await page.waitForURL('**/employer');
  85 |     await expect(page.getByText('Senior QA Engineer')).toBeVisible();
  86 |   });
  87 | });
  88 | 
```