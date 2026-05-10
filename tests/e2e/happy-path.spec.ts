import { test, expect } from '@playwright/test';

/**
 * The §6 critical-path E2E: signed-in user creates a client, then a product
 * (with a fresh category), then an order off both, then marks it Paid.
 *
 * Names are suffixed with a per-run timestamp so the suite is rerunnable
 * against a long-lived local DB without colliding on unique constraints
 * (categories(owner, name)).
 */

const stamp = () => Date.now().toString(36);

test('happy path: client → product → order → paid', async ({ page }) => {
  test.setTimeout(60_000);
  const tag = stamp();
  const clientName = `E2E Client ${tag}`;
  const categoryName = `E2E Category ${tag}`;
  const productName = `E2E Product ${tag}`;

  // ---- Clients: create ----
  await page.goto('/clients');
  await page.getByRole('button', { name: /^new$/i }).click();
  await page.getByLabel(/^name$/i).fill(clientName);
  await page.getByLabel(/^email$/i).fill(`e2e-${tag}@ohmyprofits.local`);
  await page.getByRole('button', { name: /add client/i }).click();
  // The row name is duplicated across the row button + edit/remove icons; pick
  // the first match (the row's main click target).
  await expect(
    page.getByRole('button', { name: new RegExp(clientName) }).first(),
  ).toBeVisible();

  // ---- Categories: open manager and add one ----
  await page.goto('/products');
  // The page either shows the two-step empty state or the toolbar.
  // Both expose a way to manage categories — pick whichever is visible.
  const setupCats = page.getByRole('button', { name: /set up categories/i });
  const manageCats = page.getByRole('button', { name: /^categories$/i });
  if (await setupCats.isVisible().catch(() => false)) {
    await setupCats.click();
  } else {
    await manageCats.click();
  }
  // The Categories sheet has two `Name` inputs in DOM (the new-category form
  // and the inline-edit form for whichever row may be in edit mode). The
  // section-scoped one is reliably the first.
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/^name$/i).first().fill(categoryName);

  // Wait for a categories GET whose response body actually contains the just-
  // added name. A naive response listener would race with the initial fetch
  // already in flight when the manager opens.
  const catRefetch = page.waitForResponse(
    async (r) => {
      if (!r.url().includes('/rest/v1/categories')) return false;
      if (r.request().method() !== 'GET') return false;
      if (r.status() !== 200) return false;
      const body = await r.text().catch(() => '');
      return body.includes(categoryName);
    },
    { timeout: 15_000 },
  );
  await page.getByRole('button', { name: /add category/i }).click();
  await expect(page.getByText(/category added/i).first()).toBeVisible();
  await catRefetch;
  await page.getByRole('button', { name: /^done$/i }).click();

  // ---- Products: create one in the new category ----
  // The empty state has a "Skip — add product" button, otherwise toolbar "New".
  const newProductBtn = page.getByRole('button', { name: /^new$/i });
  const skipBtn = page.getByRole('button', { name: /skip — add product/i });
  if (await skipBtn.isVisible().catch(() => false)) {
    await skipBtn.click();
  } else {
    await newProductBtn.click();
  }
  await page.getByLabel(/^name$/i).fill(productName);
  // Open the category select (Radix) and pick our new category.
  await page.getByRole('combobox', { name: /category/i }).click();
  await page.getByRole('option', { name: categoryName }).click();
  await page.getByLabel(/base price/i).fill('12.50');
  await page.getByRole('button', { name: /add product/i }).click();
  await expect(
    page.getByRole('button', { name: new RegExp(productName, 'i') }).first(),
  ).toBeVisible();

  // ---- Orders: create using the new client + product ----
  await page.goto('/orders');
  await page.getByRole('button', { name: /^new$/i }).click();

  // Pick the client.
  await page.getByRole('combobox', { name: /^client$/i }).click();
  await page.getByRole('option', { name: clientName }).click();

  // Single line item: pick our product, qty 2, leave unit_price as default.
  await page.getByRole('combobox', { name: /^product$/i }).click();
  await page.getByRole('option', { name: new RegExp(productName, 'i') }).click();
  // Default fixture starts at qty 1, unit_price 0.00. Override to verifiable values.
  await page.getByLabel(/^qty$/i).fill('2');
  await page.getByLabel(/^unit price$/i).fill('12.50');

  await page.getByRole('button', { name: /create order/i }).click();
  // Form closes; toast announces success. Order appears in the list.
  await expect(page.getByText(/order created/i).first()).toBeVisible();

  // The newest order sits at the top — find its row by client name.
  const newRow = page
    .getByRole('button', { name: new RegExp(clientName, 'i') })
    .first();
  await expect(newRow).toBeVisible();

  // ---- Mark the order Paid ----
  await newRow.click();
  await page.getByRole('combobox', { name: /^payment$/i }).click();
  await page.getByRole('option', { name: /^paid$/i }).click();
  await page.getByRole('button', { name: /save order/i }).click();
  await expect(page.getByText(/order updated/i).first()).toBeVisible();

  // Pill on the row should now read PAID.
  await expect(
    newRow.getByText(/paid/i, { exact: false }).first(),
  ).toBeVisible();
});
