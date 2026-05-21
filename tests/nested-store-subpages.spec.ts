import { test, expect } from '@playwright/test';

const AREA = 'akita';
const STORE_SLUG = 'akita-joyful-rinkai';

const SUB_PAGES = [
  'coatings', 'price', 'guide', 'access', 'inquiry',
  'booking', 'options', 'news', 'privacy', 'reviews', 'cases',
] as const;

test.describe('Nested store sub-pages (/{area}/{store_slug}/*)', () => {
  for (const sub of SUB_PAGES) {
    test(`/${AREA}/${STORE_SLUG}/${sub} returns 200`, async ({ page }) => {
      const res = await page.goto(`/${AREA}/${STORE_SLUG}/${sub}`);
      expect(res?.status()).toBe(200);
    });
  }

  test('single store chrome: one header and one footer on coatings', async ({ page }) => {
    await page.goto(`/${AREA}/${STORE_SLUG}/coatings`);
    await expect(page.locator('header')).toHaveCount(1);
    await expect(page.locator('footer')).toHaveCount(1);
  });

  test('unknown sub-page under nested store returns 404', async ({ request }) => {
    const res = await request.get(`/${AREA}/${STORE_SLUG}/not-a-real-subpage`, { maxRedirects: 0 });
    expect(res.status()).toBe(404);
  });

  test('area sub-page and nested store sub-page coexist (both 200)', async ({ page }) => {
    const areaRes = await page.goto(`/${AREA}/guide`);
    expect(areaRes?.status()).toBe(200);

    const storeRes = await page.goto(`/${AREA}/${STORE_SLUG}/guide`);
    expect(storeRes?.status()).toBe(200);
  });

  test('reviews page threads basePath: booking CTA links to nested path', async ({ page }) => {
    await page.goto(`/${AREA}/${STORE_SLUG}/reviews`);
    await expect(
      page.locator(`a[href*="/${AREA}/${STORE_SLUG}/booking"]`).first()
    ).toBeAttached();
  });
});
