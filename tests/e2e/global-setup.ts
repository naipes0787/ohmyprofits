import { chromium, type FullConfig } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { execSync } from 'node:child_process';

/**
 * Logs in as the demo user once before the suite runs and writes the auth
 * storage to disk. Each spec then re-uses it via `storageState`.
 *
 * Also resets the local Supabase DB to a known state (controlled by the
 * E2E_RESET_DB env var, default: '1' locally, '0' in CI where the DB is
 * already fresh). This keeps test runs deterministic and avoids accumulated
 * E2E rows breaking selectors / scroll positions over time.
 *
 * Demo user lives in supabase/seed.ts. If you reset/reseed the local DB
 * (kirken@ohmyprofits.local), the credentials below stay the same.
 */
const DEMO_EMAIL = 'kirken@ohmyprofits.local';
const DEMO_PASSWORD = 'kirken-demo-passphrase-2026';

const STORAGE_PATH = 'tests/e2e/.auth/demo-user.json';

async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) throw new Error('global-setup: baseURL missing from config');

  // Reset DB so accumulated E2E rows don't leak between runs. Skip with
  // E2E_RESET_DB=0. CI typically opts out (its DB starts clean).
  const shouldReset = (process.env['E2E_RESET_DB'] ?? '1') !== '0';
  if (shouldReset) {
    // eslint-disable-next-line no-console
    console.log('[e2e] resetting Supabase DB + reseeding…');
    execSync('pnpm supabase:seed', { stdio: 'inherit' });
  }

  await mkdir(dirname(STORAGE_PATH), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Set the SW-disable flag before the first navigation so registerSW() in
  // main.tsx skips even on fresh load.
  await page.goto(`${baseURL}/login`);
  await page.evaluate(() => {
    localStorage.setItem('omp.e2e.disable_sw', '1');
  });
  await page.reload();
  await page.getByLabel(/email/i).fill(DEMO_EMAIL);
  await page.getByLabel(/password/i).fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Successful login lands on /clients. Wait for the heading rather than the
  // URL only — the URL flips before the page hydrates.
  await page.waitForURL(/\/clients/, { timeout: 15_000 });
  await page.getByRole('heading', { name: /clients/i }).waitFor({ timeout: 15_000 });

  // Unregister the service worker. In dev mode the SWR runtime cache for
  // /rest/v1/ serves stale Supabase responses to React Query, which masks
  // mutations from refetches and makes E2E flaky. Production builds still
  // get the SW; this only affects the test session.
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return;
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  });

  await context.storageState({ path: STORAGE_PATH });
  await browser.close();
}

export default globalSetup;
export { STORAGE_PATH, DEMO_EMAIL, DEMO_PASSWORD };
