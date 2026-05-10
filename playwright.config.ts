import { defineConfig, devices } from '@playwright/test';

const BASE_URL =
  process.env['E2E_BASE_URL'] ??
  (process.env['CI'] ? 'http://127.0.0.1:4173' : 'http://localhost:5173');

const STORAGE_STATE = 'tests/e2e/.auth/demo-user.json';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  // Tests touch the same demo user; running them in parallel against one
  // Supabase instance creates ordering races. Serial keeps state predictable
  // and the suite is small enough that the runtime hit doesn't matter.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? [['github'], ['html']] : 'html',
  use: {
    baseURL: BASE_URL,
    storageState: STORAGE_STATE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
  // In CI we build and serve the production preview. Locally we expect the
  // dev server (and `pnpm supabase:start`) to already be running.
  webServer: process.env['CI']
    ? {
        command: 'pnpm build && pnpm preview --host 127.0.0.1',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});
