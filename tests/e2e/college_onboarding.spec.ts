import { test, expect, Page, Route } from '@playwright/test';
import { setupMocks } from './testHelpers';

/**
 * M4 screens: /admin/tenancy, /invite/[token], /tpo-dashboard/[id]/departments, /tpo-dashboard/[id]/roster.
 * The API is mocked per test (registered after setupMocks, so these routes win).
 */

const INST = 'mock-institution-id';
const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function acceptDialogs(page: Page, answer?: string) {
  page.on('dialog', (d) => (d.type() === 'prompt' ? d.accept(answer) : d.accept()));
}

test.describe('M4 college onboarding screens', () => {
  test('admin activates a prospect and invites its TPO', async ({ page }) => {
    await setupMocks(page, 'admin');
    let status = 'prospect';
    const calls: string[] = [];
    await page.route((u) => u.pathname === '/api/tenancy/overview', (r) => json(r, {
      tenants: [{ tenant_id: 't1', name: 'CBIT Group', kind: 'college_group', status: 'active', institutions: [{
        id: 7, name: 'CBIT', domain: 'cbit.ac.in', status, tenant_id: 't1', affiliating_university: 'Osmania',
        agreement_ref: status === 'active' ? 'LoI-1' : null, activated_at: null, roster_import_enabled: false, roster_dpa_ref: null,
      }] }],
      staff: [{ id: 'm1', role: 'tpo', institution_id: 7, tenant_id: 't1', source: 'legacy_backfill', email: 'old@cbit.ac.in', verified_at: null }],
    }));
    await page.route((u) => u.pathname === '/api/tenancy/invites', (r) => {
      if (r.request().method() === 'POST') {
        calls.push(`invite:${r.request().postDataJSON().email}`);
        return json(r, { id: 'i1', email: 'tpo@cbit.ac.in', state: 'open', emailed: false, accept_url: 'https://c2c.test/invite/tok123' }, 201);
      }
      return json(r, []);
    });
    await page.route((u) => u.pathname.endsWith('/activate'), (r) => {
      calls.push(`activate:${r.request().postDataJSON().agreement_ref}`);
      status = 'active';
      return json(r, { id: 7, status: 'active' });
    });
    await acceptDialogs(page, 'LoI-1');

    await page.goto('/admin/tenancy');
    await expect(page.getByRole('heading', { name: /Colleges & staff/i })).toBeVisible();
    await expect(page.getByText(/Unverified staff \(1\)/)).toBeVisible();
    await page.getByRole('button', { name: 'Activate' }).click();
    await expect(page.getByText(/CBIT is active/)).toBeVisible();

    await page.getByPlaceholder('tpo@cbit.ac.in').fill('tpo@cbit.ac.in');
    await page.getByRole('button', { name: 'Invite TPO' }).click();
    await expect(page.locator('input[readonly]')).toHaveValue('https://c2c.test/invite/tok123');
    expect(calls).toEqual(['activate:LoI-1', 'invite:tpo@cbit.ac.in']);
  });

  test('signed-out invitee is asked to sign in and comes back to the invite', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/invite/tok123');
    await expect(page.getByRole('heading', { name: /You have a c2c invite/i })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('c2c_pending_invite'))).toContain('tok123');
    await page.getByRole('button', { name: /Sign in to continue/i }).click();
    await page.waitForURL('**/login');
  });

  test('signed-in invitee accepts and lands on the TPO dashboard', async ({ page }) => {
    await setupMocks(page, 'institution');
    await page.route((u) => u.pathname === '/api/tenancy/invites/lookup', (r) => json(r, {
      email: 'tpo_test@university.edu', role: 'tpo', role_label: 'Training & Placement Officer', state: 'open',
      expires_at: new Date(Date.now() + 3600e3).toISOString(), institution: 'CBIT', department: null, tenant: 'CBIT Group', email_matches: true,
    }));
    await page.route((u) => u.pathname === '/api/tenancy/invites/accept', (r) =>
      json(r, { membership_id: 'm9', role: 'tpo', institution_id: INST, refresh_session: false }));
    await page.goto('/invite/tok123');
    await expect(page.getByRole('heading', { name: /Join CBIT/i })).toBeVisible();
    await page.getByRole('button', { name: /Accept invite/i }).click();
    await page.waitForURL(`**/tpo-dashboard/${INST}`);
  });

  test('TPO assigns a review-queue spelling and sees department staff controls', async ({ page }) => {
    await setupMocks(page, 'institution');
    const posted: unknown[] = [];
    await page.route((u) => u.pathname.endsWith('/me'), (r) => json(r, {
      institution: { id: INST, name: 'CBIT', status: 'active', domain: 'cbit.ac.in' },
      scope: 'college', department_ids: null, can_manage: true, can_invite: true, roster_enabled: true,
    }));
    await page.route((u) => u.pathname.endsWith('/departments/summary'), (r) => json(r, [
      { id: 'd1', name: 'CSE', short_code: 'CSE', discipline_code: 'CSE', discipline_name: 'Computer Science & Engineering', students: 120, needs_mapping: false },
      { id: 'd2', name: 'Mtech', short_code: null, discipline_code: null, discipline_name: null, students: 4, needs_mapping: true },
    ]));
    await page.route((u) => u.pathname === '/api/tenancy/disciplines', (r) => json(r, [
      { code: 'CSE', name: 'Computer Science & Engineering', level: 'ug' }, { code: 'ECE', name: 'Electronics & Communication Engineering', level: 'ug' },
    ]));
    await page.route((u) => u.pathname.endsWith('/review-queue'), (r) => json(r, {
      groups: [{ alias_norm: 'm tech vlsi', students: 2, examples: ['M.Tech (VLSI)', 'm tech vlsi'] }], blank: 1,
      unmapped_departments: [{ id: 'd2', name: 'Mtech' }],
    }));
    await page.route((u) => u.pathname.endsWith('/review-queue/assign'), (r) => {
      posted.push(r.request().postDataJSON());
      return json(r, { students_linked: 2, cohort_links: 2 });
    });
    await page.route((u) => u.pathname === '/api/tenancy/invites', (r) => json(r, []));

    await page.goto(`/tpo-dashboard/${INST}/departments`);
    await expect(page.getByRole('heading', { name: /Departments & staff/i })).toBeVisible();
    await expect(page.getByText(/typed “M.Tech \(VLSI\)”/)).toBeVisible();
    await page.locator('select').filter({ hasText: 'Assign to department' }).selectOption('d2');
    await expect(page.getByText(/2 students linked/)).toBeVisible();
    expect(posted).toEqual([{ alias_norm: 'm tech vlsi', department_id: 'd2' }]);
    await expect(page.getByRole('button', { name: /Invite/ })).toBeVisible();
  });

  test('TPO uploads a roster, reviews the check and imports', async ({ page }) => {
    await setupMocks(page, 'institution');
    await page.route((u) => u.pathname.endsWith('/me'), (r) => json(r, {
      institution: { id: INST, name: 'CBIT' }, scope: 'college', can_manage: true, roster_enabled: true,
    }));
    await page.route((u) => u.pathname.endsWith('/imports'), (r) => json(r, []));
    await page.route((u) => u.pathname.endsWith('/preview'), (r) => json(r, {
      id: 'imp1', expires_at: new Date(Date.now() + 86400e3).toISOString(),
      summary: { rows: 3, new: 2, update: 0, error: 1, warnings: 1, unresolved_department: 1 },
      rows: [
        { line: 2, action: 'new', full_name: 'Asha Reddy', email: 'asha@cbit.ac.in', graduation_year: 2027, department: 'CSE', department_name: 'CSE', errors: [], warnings: [] },
        { line: 3, action: 'new', full_name: 'Kiran Rao', email: 'kiran@cbit.ac.in', graduation_year: 2027, department: 'Mechanical', department_name: null, errors: [], warnings: ['Department "Mechanical" not recognised; it will appear in the review queue'] },
        { line: 4, action: 'error', full_name: 'Ravi', email: 'ravi@other.edu.in', graduation_year: 2027, department: 'CSE', department_name: 'CSE', errors: ['This email is already registered at another college'], warnings: [] },
      ],
    }, 201));
    await page.route((u) => u.pathname.endsWith('/imports/imp1/commit'), (r) =>
      json(r, { created: 2, updated: 0, skipped_errors: 1, conflicts: 0 }));
    await acceptDialogs(page);

    await page.goto(`/tpo-dashboard/${INST}/roster`);
    await expect(page.getByRole('heading', { name: /Roster import/i })).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'cbit.csv', mimeType: 'text/csv',
      buffer: Buffer.from('name,email,department,year\nAsha Reddy,asha@cbit.ac.in,CSE,2027\n'),
    });
    await expect(page.getByText('This email is already registered at another college')).toBeVisible();
    await page.locator('select').selectOption('error');
    await expect(page.getByText('Asha Reddy')).toHaveCount(0);
    await page.getByRole('button', { name: /Import 2 students/i }).click();
    await expect(page.getByText(/2 added, 0 updated, 1 skipped/)).toBeVisible();
  });

  test('roster import explains when it is not switched on', async ({ page }) => {
    await setupMocks(page, 'institution');
    await page.route((u) => u.pathname.endsWith('/me'), (r) => json(r, {
      institution: { id: INST, name: 'CBIT' }, scope: 'college', can_manage: true, roster_enabled: false,
    }));
    await page.route((u) => u.pathname.endsWith('/imports'), (r) => json(r, []));
    await page.goto(`/tpo-dashboard/${INST}/roster`);
    await expect(page.getByText(/isn.t switched on for your college yet/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Upload CSV/i })).toHaveCount(0);
  });
});
