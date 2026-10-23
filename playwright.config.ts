import { defineConfig, devices } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

// Load the same .env files Next.js uses, so tests derive the Supabase cookie
// name from the same NEXT_PUBLIC_SUPABASE_URL as the app under test.
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3011',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev:test',
    url: 'http://127.0.0.1:3011',
    reuseExistingServer: false,
    timeout: 120 * 1000,
    // The test backend accepts the mock/demo tokens used by tests/e2e; production never sets this.
    env: { ALLOW_DEMO_AUTH: 'true', NEXT_PUBLIC_ALLOW_DEMO_AUTH: 'true' },
  },
});
