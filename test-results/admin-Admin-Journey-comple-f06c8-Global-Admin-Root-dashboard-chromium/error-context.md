# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> Admin Journey >> completes authentication and navigates to the Global Admin Root dashboard
- Location: tests\e2e\admin.spec.ts:8:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.waitForResponse: Test timeout of 60000ms exceeded.
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
                  - text: admin_1781842173254@taliatech.in
            - generic [ref=e50]:
              - text: Access_Key
              - generic [ref=e51]:
                - generic:
                  - img
                - textbox "Access key password" [ref=e52]:
                  - /placeholder: ••••••••
                  - text: adminpassword123
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
  3  | test.describe('Admin Journey', () => {
  4  |   const timestamp = Date.now();
  5  |   const testEmail = `admin_${timestamp}@taliatech.in`;
  6  |   const testPassword = 'adminpassword123';
  7  | 
  8  |   test('completes authentication and navigates to the Global Admin Root dashboard', async ({ page }) => {
  9  |     page.on('console', msg => console.log(`[BROWSER]: ${msg.text()}`));
  10 | 
  11 |     // 1. Authentication
  12 |     await page.goto('/login');
  13 | 
  14 |     // Switch to Signup
  15 |     await page.getByText(/New operator\?/i).click();
  16 | 
  17 |     // Fill credentials with @taliatech.in domain
  18 |     await page.locator('input[type="email"]').fill(testEmail);
  19 |     await page.locator('input[type="password"]').fill(testPassword);
  20 | 
  21 |     // Submit signup
  22 |     await page.getByRole('button', { name: /INITIALIZE_SIGNUP/i }).click();
  23 | 
  24 |     // 2. Navigate to Admin Root
  25 |     // Wait for either the dashboard, onboard, or any logged in state.
  26 |     // Then navigate to /admin since we have the correct domain.
  27 |     // If rate limit hits, this might fail, which is acceptable per requirements.
> 28 |     await page.waitForResponse(response => response.url().includes('/auth/v1') && response.request().method() === 'POST');
     |                ^ Error: page.waitForResponse: Test timeout of 60000ms exceeded.
  29 | 
  30 |     // Force navigate to admin root to bypass standard routing
  31 |     await page.goto('/admin');
  32 | 
  33 |     // 3. Verify Global Admin Root Dashboard Features
  34 |     await expect(page.getByRole('heading', { name: /Global Admin Root/i })).toBeVisible();
  35 | 
  36 |     // Verify Stats Summary elements
  37 |     await expect(page.getByText('Active Nodes')).toBeVisible();
  38 |     await expect(page.getByText('Market Entities')).toBeVisible();
  39 |     await expect(page.getByText('Psychometric Items')).toBeVisible();
  40 |     await expect(page.getByText('Flagged (Hard/Easy)')).toBeVisible();
  41 | 
  42 |     // Verify Market Leads Stream table
  43 |     await expect(page.getByRole('heading', { name: /Market Leads Stream/i })).toBeVisible();
  44 |     
  45 |     // Verify Psychometric Item Analysis table
  46 |     await expect(page.getByRole('heading', { name: /Psychometric Item Analysis/i })).toBeVisible();
  47 |   });
  48 | });
  49 | 
```