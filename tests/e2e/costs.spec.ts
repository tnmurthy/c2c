import { test, expect, Page } from '@playwright/test';
import { setupMocks } from './testHelpers';

const SUMMARY = {
  today: '2026-10-22',
  today_calls: { featurize_calls: 4, evaluate_calls: 1, match_calls: 0 },
  month_to_date_calls: 120,
  month_error_calls: 0,
  projected_month_calls: 170,
  by_day: [
    { day: '2026-10-21', featurize_calls: 10, evaluate_calls: 2, match_calls: 6 },
    { day: '2026-10-22', featurize_calls: 4, evaluate_calls: 1, match_calls: 0 },
  ],
  account_max_calls_per_day: null,
  featurize_max_calls_per_day: 300,
  evaluate_max_calls_per_day: 200,
  match_max_calls_per_day: 200,
  price_per_call_inr: null,
  monthly_budget_inr: null,
  settings_updated_at: '2026-10-22T10:00:00Z',
  suggested_account_cap: null,
  advice: [
    { id: 'no-account-cap', level: 'act', title: 'No account-wide daily limit', detail: 'The per-feature limits add up.' },
  ],
};

async function asCrmAdmin(page: Page) {
  await setupMocks(page, 'admin');
  // The CRM layout authorises on the server; the demo admin cookie is its accepted test path.
  await page.context().addCookies([
    { name: 'demo_role', value: 'admin', domain: 'localhost', path: '/' },
  ]);
}

test.describe('Costs page', () => {
  test('admin sees spend, advice, and saves limits', async ({ page }) => {
    await asCrmAdmin(page);
    let saved: Record<string, unknown> | null = null;
    await page.route('**/api/costs/summary', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SUMMARY) }));
    await page.route('**/api/costs/settings', async (route) => {
      saved = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ saved: true }) });
    });

    await page.goto('/crm/costs');

    await expect(page.getByRole('heading', { name: 'Costs' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Costs' })).toBeVisible();
    await expect(page.getByText('120')).toBeVisible();
    await expect(page.getByText('No account-wide daily limit')).toBeVisible();

    await page.getByLabel('Account limit per day').fill('-5');
    await expect(page.getByRole('button', { name: 'Save limits' })).toBeDisabled();

    await page.getByLabel('Account limit per day').fill('150');
    await page.getByRole('button', { name: 'Save limits' }).click();

    await expect(page.getByRole('status')).toHaveText(/Limits saved/);
    expect(saved).toMatchObject({ account_max_calls_per_day: 150, featurize_max_calls_per_day: 300 });
  });

  for (const role of ['student', 'employer'] as const) {
    test(`${role} is not offered the Costs page`, async ({ page }) => {
      await setupMocks(page, role);
      await page.goto('/crm/costs');
      await page.waitForURL('**/crm-login');
    });
  }
});
