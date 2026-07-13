import { Page } from '@playwright/test';

/**
 * Setup mocks and interceptors for Supabase (Auth, DB) and FastAPI backend endpoints
 * using Playwright's page.route() API.
 */
export async function setupMocks(
  page: Page,
  role?: 'student' | 'employer' | 'institution' | 'admin'
) {
  // Inject mock supabase session to localStorage before page loads
  const ref = 'onsmkbwqucvbzggugmmn';
  const tokenKey = `sb-${ref}-auth-token`;

  page.on('console', msg => {
    console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.error(`BROWSER UNCAUGHT ERROR: ${err.message}`);
  });

  const mockUser = {
    id: role === 'student' ? 'mock-student-id' :
        role === 'employer' ? 'mock-employer-id' :
        role === 'institution' ? 'mock-institution-id' :
        role === 'admin' ? 'mock-admin-id' : 'mock-user-id',
    aud: 'authenticated',
    role: 'authenticated',
    email: role === 'admin' ? 'admin_test@taliatech.in' :
           role === 'institution' ? 'tpo_test@university.edu' :
           role === 'employer' ? 'employer_test@example.com' : 'student_test@example.com',
    email_confirmed_at: '2026-07-04T22:05:00Z',
    phone: '',
    confirmed_at: '2026-07-04T22:05:00Z',
    last_sign_in_at: '2026-07-04T22:05:00Z',
    app_metadata: {
      provider: 'email',
      providers: ['email'],
      role: role || 'student',
      profile_id: role === 'student' ? 'mock-student-id' :
                  role === 'employer' ? 'mock-employer-id' :
                  role === 'institution' ? 'mock-institution-id' :
                  role === 'admin' ? 'mock-admin-id' : 'mock-profile-id'
    },
    user_metadata: {
      role: role || 'student',
      profile_id: role === 'student' ? 'mock-student-id' :
                  role === 'employer' ? 'mock-employer-id' :
                  role === 'institution' ? 'mock-institution-id' :
                  role === 'admin' ? 'mock-admin-id' : 'mock-profile-id'
    },
    identities: [],
    created_at: '2026-07-04T22:05:00Z',
    updated_at: '2026-07-04T22:05:00Z'
  };

  const mockSession = {
    access_token: 'mock-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'mock-refresh-token',
    user: mockUser,
    expires_at: Math.floor(Date.now() / 1000) + 3600
  };

  if (role) {
    const cookieValue = encodeURIComponent(JSON.stringify(mockSession));
    await page.context().addCookies([
      {
        name: tokenKey,
        value: cookieValue,
        domain: 'localhost',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 3600,
        sameSite: 'Lax',
      }
    ]);

    await page.addInitScript(({ key, session }) => {
      window.localStorage.setItem(key, JSON.stringify(session));
      // Also write to document.cookie to synchronize with server-side middleware immediately
      const cookieValue = encodeURIComponent(JSON.stringify(session));
      document.cookie = `${key}=${cookieValue}; path=/; max-age=3600; SameSite=Lax`;

      if (session.user.user_metadata.role === 'student') {
        window.localStorage.setItem('student_id', 'mock-student-id');
      }
    }, { key: tokenKey, session: mockSession });
  }

  // 1. Intercept Supabase Auth APIs
  await page.route('**/auth/v1/signup', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSession)
    });
  });

  await page.route(url => url.href.includes('/auth/v1/token'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSession)
    });
  });

  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUser)
    });
  });

  // 2. Intercept Supabase DB Rest queries
  await page.route('**/rest/v1/**', async (route) => {
    // Return empty list or basic mock rows
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  // 3. Intercept Backend Onboarding API
  await page.route('**/api/onboard/student', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = req.postDataJSON() || {};
      const gradYear = Number(body.graduation_year);
      if (!body.full_name || !body.full_name.trim()) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Candidate Full Name is required.' })
        });
        return;
      }
      if (isNaN(gradYear) || gradYear < 1900 || gradYear > 2100) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Please enter a valid graduation year format (e.g. 2026).' })
        });
        return;
      }
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 'mock-student-id' }])
    });
  });

  await page.route('**/api/onboard/institution', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = req.postDataJSON() || {};
      const domain = (body.domain || '').trim().toLowerCase();
      const isAcademic = domain.endsWith('.edu') || domain.endsWith('.ac.in') || domain.endsWith('.edu.in');
      if (!isAcademic) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Only academic email domains (.edu, .ac.in) are authorized for TPO onboarding.' })
        });
        return;
      }
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 'mock-institution-id' }])
    });
  });

  await page.route('**/api/onboard/employer', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = req.postDataJSON() || {};
      if (!body.company_name || !body.company_name.trim()) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Company Name is required.' })
        });
        return;
      }
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 'mock-employer-id' }])
    });
  });

  // 4. Intercept Student API
  await page.route(url => url.pathname.includes('/api/student/'), async (route, request) => {
    const urlStr = request.url();
    if (urlStr.includes('/applications')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'app-1',
            job_id: 'job-1',
            student_id: 'mock-student-id',
            status: 'Applied',
            created_at: '2026-07-04T22:05:00Z',
            job_posting: {
              title: 'Senior QA Engineer',
              company_name: 'Acme Corp'
            }
          }
        ])
      });
    } else if (urlStr.includes('/apply')) {
      const postData = request.postDataJSON() || {};
      const jobId = postData.job_id || 'lead-1';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'app-1',
          job_id: jobId,
          student_id: 'mock-student-id',
          status: 'Applied',
          created_at: '2026-07-04T22:05:00Z'
        })
      });
    } else if (urlStr.includes('/profile')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          student: {
            id: 'mock-student-id',
            full_name: 'Test Student',
            email: 'student_test@example.com',
            graduation_year: 2026,
            department: 'Computer Science',
            bio: 'Mock student bio',
            skills: ['TypeScript', 'Playwright'],
            phone: '1234567890',
            linkedin_url: 'https://linkedin.com',
            resume_url: 'https://resume.com'
          },
          assessments: [
            {
              id: 'mock-assessment-id',
              student_id: 'mock-student-id',
              dimension_scores: {
                IQ: 85,
                EQ: 90,
                SQ: 75,
                AQ: 80,
                SpQ: 70,
                Technical: 88,
                Product: 94,
                Leadership: 72,
                Communication: 91,
                Adaptability: 76
              },
              founder_fit: {
                Builder: 165,
                Leader: 165,
                Rainmaker: 155,
                Anchor: 175
              },
              primary_profile: 'Builder',
              development_report: {
                profile_summary: 'Builders thrive on creating and optimizing systems. They combine high cognitive and adversity quotients to solve complex problems.',
                actionable_feedback: [
                  'Your AQ is below 50. Consider engaging in resilience-building exercises and taking on challenging projects with mentorship.'
                ]
              },
              created_at: '2026-07-04T22:05:00Z'
            }
          ],
          peer_scores: {
            IQ: 80,
            EQ: 85,
            SQ: 70,
            AQ: 75,
            SpQ: 75,
            Technical: 80,
            Product: 85,
            Leadership: 70,
            Communication: 85,
            Adaptability: 80
          }
        })
      });
    }
  });

  // 5. Intercept Alerts API
  await page.route(url => url.pathname.includes('/api/alerts/student/'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'alert-1',
          student_id: 'mock-student-id',
          score: 92.5,
          created_at: '2026-07-04T22:05:00Z',
          market_leads: {
            id: 'lead-1',
            company_name: 'Stark Industries',
            title: 'Quantum Software Engineer',
            location: 'New York, NY',
            salary: '$150k - $200k'
          }
        }
      ])
    });
  });

  // 6. Intercept leads API
  await page.route('**/api/leads', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'lead-1',
          company_name: 'Stark Industries',
          title: 'Quantum Software Engineer',
          location: 'New York, NY',
          salary: '$150k - $200k',
          ai_score: 95.0,
          status: 'Open'
        },
        {
          id: 'lead-2',
          company_name: 'Wayne Enterprises',
          title: 'Defense Systems Architect',
          location: 'Gotham',
          salary: '$200k - $250k',
          ai_score: 88.0,
          status: 'Open'
        }
      ])
    });
  });

  // 7. Intercept item-analysis API
  await page.route('**/api/admin/item-analysis', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'item-1',
          stem: 'Vector_1: When faced with high adversity...',
          item_type: 'likert',
          dimension: 'AQ',
          attempts: 10,
          success_rate: 80.0,
          status: 'Optimal'
        },
        {
          id: 'item-2',
          stem: 'Vector_2: A client is angry...',
          item_type: 'sjt',
          dimension: 'EQ',
          attempts: 15,
          success_rate: 60.0,
          status: 'Optimal'
        }
      ])
    });
  });

  // 8. Intercept cohort API
  await page.route(url => url.pathname.includes('/api/cohort/'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        averages: { IQ: 82, EQ: 78, SQ: 74, AQ: 80, SpQ: 70 },
        founder_distribution: { Builder: 40, Leader: 30, Rainmaker: 20, Anchor: 10 },
        support_needs: ['Low AQ detected - Implement resilience workshops.']
      })
    });
  });

  // 9. Intercept employer candidates API
  await page.route('**/api/employer/candidates', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'mock-student-id',
          name: 'Test Student',
          role: 'Computer Science',
          cohort: '2026',
          match: 92.5,
          dimension_scores: {
            IQ: 85,
            EQ: 90,
            AQ: 88,
            SQ: 75
          },
          tech_fit_index: 88,
          sales_fit_index: 72,
          skills: ['TypeScript', 'Playwright'],
          image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Test Student',
          status: 'online',
          summary: 'Builders thrive on creating and optimizing systems.'
        }
      ])
    });
  });

  // 10. Intercept employer jobs APIs
  await page.route('**/api/employer/jobs/new', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, id: 'job-1' })
    });
  });

  await page.route('**/api/employer/jobs', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = req.postDataJSON() || {};
      if (!body.title || !body.title.trim()) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Job title is required.' })
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: 'job-1' })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'job-1',
          title: 'Senior QA Engineer',
          description: 'Ensure software quality across the neural net.',
          requirements: ['Playwright', 'TypeScript'],
          location: 'Remote',
          is_remote: true,
          salary_range: '$100k - $140k',
          role_type: 'tech',
          created_at: '2026-07-04T22:05:00Z'
        }
      ])
    });
  });

  // 11. Intercept assessment generate API
  await page.route(url => url.pathname.includes('/api/assessment/generate'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'q1',
          stem: 'Vector_1: Rate your ability to handle difficult challenges.',
          item_type: 'likert',
          primary_dimension: 'AQ'
        },
        {
          id: 'q2',
          stem: 'Vector_2: A conflict occurs in your team. How do you respond?',
          item_type: 'sjt',
          primary_dimension: 'EQ',
          options: [
            { id: 'A', text: 'Address the conflict immediately' },
            { id: 'B', text: 'Ignore it and focus on work' },
            { id: 'C', text: 'Report to supervisor' }
          ]
        }
      ])
    });
  });

  // 12. Intercept assessment submit API
  await page.route('**/api/assessment/submit', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        primary_profile: 'Builder',
        dimension_scores: { IQ: 85, EQ: 90, SQ: 75, AQ: 80, SpQ: 70 },
        founder_fit: { Builder: 165, Leader: 165, Rainmaker: 155, Anchor: 175 }
      })
    });
  });

  // 13. TPO specific endpoints
  await page.route(url => url.pathname.includes('/api/institution/') && url.pathname.includes('/cohort'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'mock-student-id',
          full_name: 'Test Student',
          email: 'student@test.com',
          department: 'Computer Science',
          graduation_year: 2026,
          skills: ['React', 'Node', 'TypeScript'],
          is_verified: false,
          resume_url: null,
          tech_fit_index: 85,
          sales_fit_index: 75,
          created_at: '2026-07-04T22:05:00Z'
        }
      ])
    });
  });

  await page.route(url => url.pathname.includes('/api/institution/') && url.pathname.includes('/verify'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    });
  });

  // 14. PDF Export endpoints
  await page.route('**/api/export/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      body: Buffer.from('%PDF-1.4 ... mock pdf content ...')
    });
  });
}
