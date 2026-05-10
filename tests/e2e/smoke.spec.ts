import { test, expect } from '@playwright/test';

/**
 * Cheap signed-in smoke. Confirms the app shell renders for an authenticated
 * user and the primary nav lands on /clients. Used as a quick canary before
 * the heavier happy-path runs.
 */
test('signed-in home redirects to /clients', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/clients/);
  await expect(page.getByRole('heading', { name: /^clients$/i })).toBeVisible();
});
