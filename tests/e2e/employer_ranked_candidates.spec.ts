import { test, expect, Page } from '@playwright/test';
import { setupMocks } from './testHelpers';

const JOB = {
  id: 'job-1', title: 'Senior QA Engineer', description: 'Quality across the platform.',
  requirements: ['Playwright', 'TypeScript'], role_type: 'tech', location: 'Remote', is_remote: true, status: 'active',
};

const CANDIDATES = [
  {
    student_id: 'stu-a', name: 'Asha Rao', department: 'Computer Science', graduation_year: 2026, skills: ['TS'],
    rank: 1, fit_score: 81.5, five_q_score: 78, evidence_score: 85,
    evidence: { Playwright: { level: 3.6, confidence: 0.8 }, TypeScript: { level: 3.2, confidence: 0.7 } },
    status: 'PENDING',
  },
  {
    student_id: 'stu-b', name: 'Vikram Iyer', department: 'ECE', graduation_year: 2025, skills: [],
    rank: 2, fit_score: 70, five_q_score: 70, evidence_score: null, evidence: {}, status: 'PENDING',
  },
];

async function mockJobApis(page: Page, opts: { patchStatus?: number } = {}) {
  const patches: unknown[] = [];
  await page.route('**/api/employer/jobs/job-1', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(JOB) }));
  await page.route('**/api/employer/jobs/job-1/candidates', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CANDIDATES) }));
  await page.route('**/api/employer/jobs/job-1/candidates/*', async (r) => {
    patches.push(r.request().postDataJSON());
    const status = opts.patchStatus ?? 200;
    await r.fulfill({ status, contentType: 'application/json',
      body: JSON.stringify(status === 200 ? { ok: true } : { detail: 'Database unavailable.' }) });
  });
  await page.route('**/api/employer/jobs/job-1/match', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: 12, ranked: 2, evidence_judged: 1 }) }));
  return patches;
}

test.describe('Employer ranked candidates', () => {
  test('opens from the job card and shows ranked candidates with evidence', async ({ page }) => {
    await setupMocks(page, 'employer');
    await mockJobApis(page);

    await page.goto('/employer');
    await page.getByRole('button', { name: /My_Job_Postings/i }).click();
    await page.getByRole('link', { name: 'VIEW_MATCHES' }).first().click();
    await page.waitForURL('**/employer/jobs/job-1');

    await expect(page.getByRole('heading', { name: 'Senior QA Engineer' })).toBeVisible();
    const first = page.getByRole('article', { name: /Rank 1: Asha Rao/ });
    await expect(first.getByTestId('fit-score')).toHaveText('82');
    await expect(first.getByRole('list', { name: 'Evidence per requirement' })).toContainText('Deep');
    await expect(page.getByRole('article', { name: /Rank 2: Vikram Iyer/ }))
      .toContainText('Not judged; ranked on the assessment alone');
  });

  test('shortlisting saves the decision and updates the filter counts', async ({ page }) => {
    await setupMocks(page, 'employer');
    const patches = await mockJobApis(page);
    await page.goto('/employer/jobs/job-1');

    const card = page.getByRole('article', { name: /Rank 1: Asha Rao/ });
    await card.getByRole('button', { name: 'Shortlist' }).click();

    await expect(card.getByRole('button', { name: 'Shortlist' })).toHaveAttribute('aria-pressed', 'true');
    expect(patches).toEqual([{ status: 'SHORTLISTED' }]);
    await page.getByRole('button', { name: /Shortlisted/ }).click();
    await expect(page.getByRole('article')).toHaveCount(1);
  });

  test('a failed save is undone and explained', async ({ page }) => {
    await setupMocks(page, 'employer');
    await mockJobApis(page, { patchStatus: 500 });
    await page.goto('/employer/jobs/job-1');

    const card = page.getByRole('article', { name: /Rank 1: Asha Rao/ });
    await card.getByRole('button', { name: 'Reject' }).click();

    await expect(page.getByRole('status')).toContainText('The change was undone');
    await expect(card.getByRole('button', { name: 'Reject' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('re-running matching reports what was ranked', async ({ page }) => {
    await setupMocks(page, 'employer');
    await mockJobApis(page);
    await page.goto('/employer/jobs/job-1');

    await page.getByRole('button', { name: /RE-RUN_MATCHING/ }).click();

    await expect(page.getByRole('status')).toContainText('Ranked 2 of 12 assessed students');
  });

  test('students are not offered the screen', async ({ page }) => {
    await setupMocks(page, 'student');
    await page.goto('/employer/jobs/job-1');
    await page.waitForURL('**/login');
  });
});
