import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Axe sweep across the primary screens, both themes. Fails on any "critical"
 * or "serious" violation; "moderate"/"minor" are reported but don't block.
 * Per §4.8: WCAG 2.2 AA in light AND dark.
 */

const PRIMARY_PATHS = ['/clients', '/products', '/orders', '/account'] as const;
type Theme = 'light' | 'dark';

async function setTheme(page: Page, theme: Theme): Promise<void> {
  // The UI store persists `theme` under localStorage key `omp.ui.v1`. Set it
  // directly + apply the class so we don't have to click through Account.
  await page.evaluate((t) => {
    const html = document.documentElement;
    html.classList.remove('theme-light', 'theme-dark', 'theme-system');
    html.classList.add(`theme-${t}`);
    const persisted = JSON.stringify({
      state: { theme: t, currency: 'USD', sidebarCollapsed: false },
      version: 1,
    });
    localStorage.setItem('omp.ui.v1', persisted);
  }, theme);
}

async function expectNoCriticalAxe(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    // Radix portals can render dialogs/menus outside #root; include them.
    .disableRules([])
    .analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );

  if (blocking.length > 0) {
    // Print a compact summary so failures are diagnosable from CI logs,
    // including the failing selectors and (for color-contrast) the offending
    // foreground/background pair.
    const summary = blocking
      .map((v) => {
        const nodeLines = v.nodes
          .map((n) => {
            const sel = n.target.join(' >> ');
            const fail = n.failureSummary?.split('\n')[1]?.trim() ?? '';
            return `      • ${sel}\n        ${fail}`;
          })
          .join('\n');
        return `  [${v.impact}] ${v.id}: ${v.help}\n    ${v.helpUrl}\n${nodeLines}`;
      })
      .join('\n');
    throw new Error(`Axe violations on ${label}:\n${summary}`);
  }
  // Surface non-blocking issues without failing the test.
  if (results.violations.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[axe] ${label}: ${results.violations.length} non-blocking issue(s)`,
    );
  }
  expect(blocking.length).toBe(0);
}

for (const theme of ['light', 'dark'] as const) {
  for (const path of PRIMARY_PATHS) {
    test(`a11y: ${path} (${theme})`, async ({ page }) => {
      await page.goto(path);
      await setTheme(page, theme);
      // Re-navigate so the persisted theme is read on a fresh boot — some
      // components only read it once on mount.
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expectNoCriticalAxe(page, `${path} (${theme})`);
    });
  }
}

// Login is the only public surface; covered separately because it has its own
// layout and color contrast story.
test('a11y: /login (light)', async ({ page, context }) => {
  // Drop the auth cookies/storage so we land on the actual /login.
  await context.clearCookies();
  await page.goto('/login');
  await setTheme(page, 'light');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expectNoCriticalAxe(page, '/login (light)');
});

test('a11y: /login (dark)', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/login');
  await setTheme(page, 'dark');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expectNoCriticalAxe(page, '/login (dark)');
});
