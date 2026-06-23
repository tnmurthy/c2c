# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tpo.spec.ts >> TPO / Institution Journey >> completes authentication, onboarding, and navigates TPO dashboard
- Location: tests\e2e\tpo.spec.ts:8:7

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
              - paragraph [ref=e46]: Manage cohorts & placements
            - generic [ref=e47]:
              - text: Email_Address
              - generic [ref=e48]:
                - generic:
                  - img
                - textbox "Email address" [ref=e49]:
                  - /placeholder: you@example.com
                  - text: tpo_1781842363639@university.edu
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
  3  | test.describe('TPO / Institution Journey', () => {
  4  |   const timestamp = Date.now();
  5  |   const testEmail = `tpo_${timestamp}@university.edu`;
  6  |   const testPassword = 'testpassword123';
  7  | 
  8  |   test('completes authentication, onboarding, and navigates TPO dashboard', async ({ page }) => {
  9  |     page.on('console', msg => console.log(`[BROWSER]: ${msg.text()}`));
  10 |     
  11 |     // 1. Authentication & Onboarding
  12 |     await page.goto('/login');
  13 |     
  14 |     // Switch to Signup
  15 |     await page.getByText(/New operator\?/i).click();
  16 |     
  17 |     // Select Institution / TPO Role
  18 |     await page.getByRole('button', { name: /Institution \/ TPO/i }).click();
  19 |     
  20 |     // Fill credentials
  21 |     await page.locator('input[type="email"]').fill(testEmail);
  22 |     await page.locator('input[type="password"]').fill(testPassword);
  23 |     
  24 |     // Submit signup
  25 |     // Known issue: this may fail with 429 Too Many Requests if rate limited, which is acceptable
  26 |     await page.getByRole('button', { name: /INITIALIZE_SIGNUP/i }).click();
  27 | 
  28 |     // 2. Onboarding
  29 |     // Wait for the URL to change to /onboard
> 30 |     await page.waitForURL('**/onboard');
     |                ^ Error: page.waitForURL: Test timeout of 60000ms exceeded.
  31 |     
  32 |     // Switch to Institution tab on onboard page
  33 |     await page.getByRole('button', { name: /Institution\/TPO/i }).click();
  34 |     
  35 |     // Ensure the form is loaded
  36 |     await page.waitForSelector('input[name="name"]');
  37 |     
  38 |     // Fill out onboarding form
  39 |     await page.fill('input[name="name"]', `Global Tech University ${timestamp}`);
  40 |     await page.selectOption('select[name="type"]', 'University');
  41 |     // Domain is pre-filled based on email, but let's make sure
  42 |     await page.fill('input[name="domain"]', 'university.edu');
  43 |     await page.fill('input[name="location"]', 'San Francisco, CA');
  44 |     
  45 |     // Submit onboarding
  46 |     await page.getByRole('button', { name: /FINALIZE_ONBOARDING/i }).click();
  47 | 
  48 |     // 3. TPO Command Center Dashboard
  49 |     await page.waitForURL('**/tpo-dashboard/**');
  50 |     
  51 |     // Verify dashboard elements
  52 |     await expect(page.getByRole('heading', { name: /Institutional Analytics/i })).toBeVisible();
  53 |     await expect(page.getByText(/Total Enrolled Students/i)).toBeVisible();
  54 |     await expect(page.getByText(/Founder Profile Distribution/i)).toBeVisible();
  55 |     await expect(page.getByText(/National Benchmarks Comparison/i)).toBeVisible();
  56 |     
  57 |     // Verify intervention feed
  58 |     await expect(page.getByRole('heading', { name: /Intervention Required/i })).toBeVisible();
  59 |     
  60 |     // Verify sidebar links
  61 |     await expect(page.getByRole('link', { name: /Student Tracking/i })).toBeVisible();
  62 |     await expect(page.getByRole('link', { name: /Talent Pool/i })).toBeVisible();
  63 |   });
  64 | });
  65 | 
```