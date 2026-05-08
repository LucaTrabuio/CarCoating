import { test, expect } from '@playwright/test';

// Sub-store hierarchy: a sub-company like /ichihara has child stores.
// Try to discover one and verify the per-child page loads.

test.describe('Sub-store routes (/{parent}/{subSlug})', () => {
  test('parent /ichihara renders a store list', async ({ page }) => {
    await page.goto('/ichihara');
    // The multi-store sub-company page lists store entries
    await expect(page.locator('text=店舗一覧・アクセス').first()).toBeVisible();
  });

  test('parent /ichihara has links to child stores', async ({ page }) => {
    await page.goto('/ichihara');
    // Any link of the shape /ichihara/<slug>
    const childLinks = await page
      .locator('a[href^="/ichihara/"]')
      .evaluateAll((els) =>
        els
          .map((e) => (e as HTMLAnchorElement).getAttribute('href') ?? '')
          .filter((h) => /^\/ichihara\/[a-z0-9-]+$/.test(h)),
      );
    expect(childLinks.length).toBeGreaterThan(0);
  });

  test('a child store page loads with 200 (if any exists)', async ({ page }) => {
    await page.goto('/ichihara');
    const childHref = await page
      .locator('a[href^="/ichihara/"]')
      .first()
      .getAttribute('href');
    if (!childHref || !/^\/ichihara\/[a-z0-9-]+$/.test(childHref)) {
      test.skip(true, 'No discoverable child store on /ichihara');
      return;
    }
    const res = await page.goto(childHref);
    expect(res?.status()).toBe(200);
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });
});

test.describe('Public sub-companies API', () => {
  test('GET /api/v3/sub-companies returns a list', async ({ request }) => {
    const res = await request.get('/api/v3/sub-companies');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
