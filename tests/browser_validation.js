const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const SCREENSHOT_DIR = path.join(__dirname, '..', 'public', 'qa-screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Mock auth token to bypass Supabase redirect blocks
function injectMockAuth(page) {
  return page.addInitScript(() => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const mockToken = {
      access_token: 'mock_access_token_jwt_val',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: expiresAt,
      refresh_token: 'mock_refresh_token_val',
      user: {
        id: 'mock-user-id',
        email: 'student@taliatech.in',
        email_confirmed_at: new Date().toISOString(),
        role: 'authenticated',
        aud: 'authenticated',
        app_metadata: { provider: 'email' },
        user_metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };
    const tokenStr = JSON.stringify(mockToken);
    
    // Inject multiple possible storage keys to cover all bases
    window.localStorage.setItem('sb-aaekwxpqearjnuhjhetd-auth-token', tokenStr);
    window.localStorage.setItem('sb-placeholder-auth-token', tokenStr);
    window.localStorage.setItem('supabase.auth.token', tokenStr);
    
    console.log('[MockAuth] Injected mock tokens with expires_at:', expiresAt);
  });
}

// Setup network interception to respond successfully to ALL API calls
async function interceptApis(page) {
  // Intercept Supabase URL requests (both real and placeholder)
  await page.route('**/auth/v1/user**', async (route) => {
    console.log('[MockAPI] Intercepted Supabase getUser request');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'mock-user-id',
        email: 'student@taliatech.in',
        role: 'authenticated',
        aud: 'authenticated',
        app_metadata: {},
        user_metadata: {},
        created_at: new Date().toISOString(),
      })
    });
  });

  // Mock /api/employer/candidates
  await page.route('**/api/employer/candidates', async (route) => {
    console.log('[MockAPI] Intercepted /api/employer/candidates');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'mock-user-id',
          name: 'Jane Doe',
          primary_profile: 'THE_ARCHITECT',
          tech_fit_index: 92.5,
          sales_fit_index: 78.0,
          dimension_scores: { IQ: 85, EQ: 90, SQ: 80, AQ: 88 }
        }
      ])
    });
  });

  // Mock /api/student/[id]
  await page.route('**/api/student/*', async (route) => {
    console.log('[MockAPI] Intercepted /api/student/*');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        student: {
          full_name: 'Jane Doe',
          department: 'Computer Science'
        },
        assessments: [
          {
            dimension_scores: { Technical: 88, Product: 94, Leadership: 72, Communication: 91, Adaptability: 76 },
            primary_profile: 'THE_ARCHITECT',
            founder_fit: { Builder: 96 },
            development_report: {
              profile_summary: 'EXCEPTIONAL_ADAPTIVE_CAPACITY. ANALYTICAL_RIGOR_MATCHED_BY_STRATEGIC_EMPATHY.',
              actionable_feedback: [
                'OPTIMIZE_NEURAL_EFFICIENCY IN COGNITIVE BLINDSPOTS.',
                'LEVERAGE HIGH EQ FOR STAKEHOLDER SYNCHRONIZATION.'
              ]
            }
          }
        ],
        peer_scores: { Technical: 75, Product: 82, Leadership: 88, Communication: 85, Adaptability: 90 }
      })
    });
  });

  // Mock /api/alerts/student/[id]
  await page.route('**/api/alerts/student/*', async (route) => {
    console.log('[MockAPI] Intercepted /api/alerts/student/*');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'alert-1',
          message: 'Behavioral pattern anomaly detected.',
          severity: 'info',
          timestamp: new Date().toISOString()
        }
      ])
    });
  });

  // Mock /api/cohort/[id]
  await page.route('**/api/cohort/*', async (route) => {
    console.log('[MockAPI] Intercepted /api/cohort/*');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        averages: { IQ: 78.5, EQ: 84.2, SQ: 62.1, AQ: 42.0, SpQ: 75.3 },
        founder_distribution: { Builder: 33, Leader: 26, Rainmaker: 15, Anchor: 26 },
        support_needs: [
          'CS Dept Section D - Low AQ Score detected.',
          'Placement Mismatch: Fintech Stream - 12% mismatch.'
        ]
      })
    });
  });

  // Mock /api/leads
  await page.route('**/api/leads', async (route) => {
    console.log('[MockAPI] Intercepted /api/leads');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'lead-1',
          job_title: 'AI Engineer',
          company: 'TaliaTech Solutions',
          ai_score: 94
        }
      ])
    });
  });

  // Mock /api/assessment/generate
  await page.route('**/api/assessment/generate*', async (route) => {
    console.log('[MockAPI] Intercepted /api/assessment/generate');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'q1',
          text: 'How do you handle critical server failures?',
          item_type: 'situational',
          options: [
            { key: 'A', text: 'Analyze logs and debug', weight: 5 },
            { key: 'B', text: 'Escalate to senior team', weight: 3 }
          ]
        }
      ])
    });
  });

  // Mock /api/assessment/submit
  await page.route('**/api/assessment/submit', async (route) => {
    console.log('[MockAPI] Intercepted /api/assessment/submit');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success' })
    });
  });

  // Mock /api/onboard/student
  await page.route('**/api/onboard/student', async (route) => {
    console.log('[MockAPI] Intercepted /api/onboard/student');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 'mock-student-id' }])
    });
  });

  // Mock any fallback Supabase queries
  await page.route('**/rest/v1/**', async (route) => {
    console.log('[MockSupabase] Intercepted query:', route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });
}

async function runTests() {
  console.log(`Starting Browser Validation Tests against ${BASE_URL}...`);
  const browser = await chromium.launch({ headless: true });
  const results = [];

  const pagesToTest = [
    {
      name: 'Landing Page',
      path: '/',
      requireAuth: false,
      expectedText: 'campus and corporate'
    },
    {
      name: 'Login Page',
      path: '/login',
      requireAuth: false,
      expectedText: 'SYSTEM.ACCESS'
    },
    {
      name: 'Employer Portal',
      path: '/employer',
      requireAuth: false,
      expectedText: 'Recruiter Console'
    },
    {
      name: 'Onboard Page',
      path: '/onboard',
      requireAuth: true,
      expectedText: 'Create your Legend_Profile'
    },
    {
      name: 'Assessment Page',
      path: '/assessment',
      requireAuth: true,
      expectedText: 'ESTABLISHING_SECURE_LINK'
    },
    {
      name: 'Student Dashboard',
      path: '/dashboard/mock-user-id',
      requireAuth: true,
      expectedText: 'Cognitive_Archetype_Unlocked'
    },
    {
      name: 'TPO Dashboard',
      path: '/tpo-dashboard/mock-user-id',
      requireAuth: true,
      expectedText: 'TPO Command'
    },
    {
      name: 'Admin Panel',
      path: '/admin',
      requireAuth: true,
      expectedText: 'Global Admin Root'
    }
  ];

  for (const t of pagesToTest) {
    console.log(`\n==============================================\nTesting page: ${t.name} (${t.path})...`);
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 }
    });
    const page = await context.newPage();

    // Console listeners
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

    // Request interception logging
    page.on('request', req => {
      const url = req.url();
      if (!url.includes('_next') && !url.includes('.png') && !url.includes('.js')) {
        console.log(`>> REQUEST: ${req.method()} ${url}`);
      }
    });

    if (t.requireAuth) {
      await injectMockAuth(page);
    }
    await interceptApis(page);

    try {
      const response = await page.goto(`${BASE_URL}${t.path}`, {
        waitUntil: 'load',
        timeout: 10000
      });

      const statusCode = response.status();
      const title = await page.title();
      
      // Wait for transitions/renders to finish
      await page.waitForTimeout(3000);

      // Get page visible text
      const bodyText = await page.innerText('body');
      const hasExpectedText = bodyText.toLowerCase().includes(t.expectedText.toLowerCase());

      const screenshotName = `${t.name.toLowerCase().replace(/\s+/g, '_')}.png`;
      const screenshotPath = path.join(SCREENSHOT_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const success = statusCode >= 200 && statusCode < 400 && hasExpectedText;

      console.log(`- Status: ${statusCode}`);
      console.log(`- Title: "${title}"`);
      console.log(`- Current URL: ${page.url()}`);
      console.log(`- Contains expected text "${t.expectedText}": ${hasExpectedText ? 'YES' : 'NO'}`);
      if (!hasExpectedText) {
        console.log(`- Page Text Snippet:\n---\n${bodyText.substring(0, 500)}\n---`);
      }
      console.log(`- Screenshot saved to: ${screenshotPath}`);

      results.push({
        name: t.name,
        path: t.path,
        statusCode,
        title,
        hasExpectedText,
        screenshotName,
        success
      });
    } catch (err) {
      console.error(`Error testing page ${t.name}:`, err.message);
      results.push({
        name: t.name,
        path: t.path,
        statusCode: 0,
        title: 'ERROR',
        hasExpectedText: false,
        screenshotName: null,
        success: false,
        error: err.message
      });
    } finally {
      await context.close();
    }
  }

  await browser.close();

  console.log('\n================ TEST SUMMARY ================');
  let allPassed = true;
  for (const res of results) {
    const statusStr = res.success ? 'PASSED' : 'FAILED';
    if (!res.success) allPassed = false;
    console.log(`[${statusStr}] ${res.name} (${res.path}) - Status: ${res.statusCode}`);
  }
  console.log('==============================================');

  // Write summary file
  fs.writeFileSync(
    path.join(__dirname, '..', 'public', 'qa-screenshots', 'summary.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), allPassed, results }, null, 2)
  );

  process.exit(allPassed ? 0 : 1);
}

runTests();
