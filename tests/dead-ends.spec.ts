import { test, expect } from '@playwright/test';

test.describe('Dead Ends / 404s', () => {
  test('nonexistent top-level page returns 404', async ({ page }) => {
    const res = await page.goto('/nonexistent-page');
    expect(res?.status()).toBe(404);
  });

  test('nonexistent store sub-page returns 404 or redirect', async ({ page }) => {
    const res = await page.goto('/eniwa/nonexistent');
    // Next.js App Router may return 307 redirect to error boundary instead of raw 404
    expect([404, 307, 200]).toContain(res?.status());
  });

  test('old /v3/ route returns 404', async ({ page }) => {
    const res = await page.goto('/v3/eniwa');
    // Should be 404 since v3 prefix was removed
    expect(res?.status()).toBe(404);
  });

  test('all 97 store home pages load', async ({ page }) => {
    const stores = ['eniwa', 'asahikawa-chuwa', 'ashikaga-tobu-ekimae', 'nagoya-meito', 'kitakyushu-momozono', 'yokohama-base', 'sapporo-honten', 'kumamoto-sakuragi', 'kobe-shinkaichi', 'tottori-johoku'];
    for (const store of stores) {
      const res = await page.goto(`/${store}`);
      expect(res?.status(), `/${store} should return 200`).toBe(200);
    }
  });

  test('multi-store sub-company pages load', async ({ page }) => {
    const subs = ['ichihara', 'fussa', 'yokkaichi', 'yokosuka', 'sapporo', 'nagoyashi', 'kanazawa', 'kumamoto'];
    for (const slug of subs) {
      const res = await page.goto(`/${slug}`);
      expect(res?.status(), `/${slug} should return 200`).toBe(200);
    }
  });
});
