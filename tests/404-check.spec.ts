import { test, expect } from '@playwright/test';

test.describe('404 / Dead-end checks', () => {
  test('nonexistent top-level route returns 404', async ({ page }) => {
    const res = await page.goto('/nonexistent');
    expect(res?.status()).toBe(404);
  });

  test('nonexistent store sub-route returns 404', async ({ page }) => {
    const res = await page.goto('/eniwa/nonexistent');
    expect(res?.status()).toBe(404);
  });

  test('old /v3/eniwa route returns 404 or redirects', async ({ page }) => {
    const res = await page.goto('/v3/eniwa');
    const status = res?.status() ?? 0;
    // Should be a 404, or a redirect (3xx -> final page)
    // If it redirected, URL would have changed; if 404, status is 404
    const is404 = status === 404;
    const isRedirect = page.url() !== 'http://localhost:8081/v3/eniwa';
    expect(is404 || isRedirect).toBeTruthy();
  });

  test('random deep nested path returns 404', async ({ page }) => {
    const res = await page.goto('/eniwa/foo/bar/baz');
    expect(res?.status()).toBe(404);
  });

  test('404 page has useful content (not blank)', async ({ page }) => {
    await page.goto('/nonexistent');
    // Page should not be completely empty
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });
});
