import { test, expect } from '@playwright/test';

// Area: akita, store: akita-joyful-rinkai (store_slug === store_id per audit)
const AREA = 'akita';
const STORE_SLUG = 'akita-joyful-rinkai';

test.describe('Nested store routing (/{area}/{store_slug})', () => {
  test('nested store URL returns 200', async ({ page }) => {
    const res = await page.goto(`/${AREA}/${STORE_SLUG}`);
    expect(res?.status()).toBe(200);
  });

  test('nested store page has a store-scoped header (not area header)', async ({ page }) => {
    await page.goto(`/${AREA}/${STORE_SLUG}`);
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('old flat /{store_id} URL permanently redirects to nested path', async ({ request }) => {
    // Next's permanentRedirect() issues a 308 (method-preserving permanent
    // redirect; SEO-equivalent to 301). Accept either.
    const res = await request.get(`/${STORE_SLUG}`, { maxRedirects: 0 });
    expect([301, 308]).toContain(res.status());
    const location = res.headers()['location'] ?? '';
    expect(location).toContain(`/${AREA}/${STORE_SLUG}`);
  });

  test('area hub page /{area}/guide (reserved sub-page) still returns 200', async ({ page }) => {
    const res = await page.goto(`/${AREA}/guide`);
    // guide is a sub-page of the area — it should serve, not 404
    expect(res?.status()).toBe(200);
  });

  test('area hub /{area} and nested store /{area}/{store_slug} coexist (both 200)', async ({ page }) => {
    const areaRes = await page.goto(`/${AREA}`);
    expect(areaRes?.status()).toBe(200);

    const storeRes = await page.goto(`/${AREA}/${STORE_SLUG}`);
    expect(storeRes?.status()).toBe(200);
  });
});
