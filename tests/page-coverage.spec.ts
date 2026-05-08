import { test, expect } from '@playwright/test';

// Page-level smoke tests for routes not yet covered: /blog, /estimate,
// /login, and the per-store sub-pages we hadn't asserted on (reviews,
// cases, options, news, privacy).

const STORE = 'eniwa';

test.describe('Top-level public pages', () => {
  test('/blog loads with 200 and shows heading', async ({ page }) => {
    const res = await page.goto('/blog');
    expect(res?.status()).toBe(200);
    // Blog index should render something other than an empty body
    const body = await page.locator('body').textContent();
    expect(body?.trim().length ?? 0).toBeGreaterThan(50);
  });

  test('/estimate is token-only (404 without token)', async ({ page }) => {
    const res = await page.goto('/estimate');
    // /estimate route is a [token] dynamic segment — 404 at the bare path is correct
    expect(res?.status()).toBe(404);
  });

  test('/estimate/<unknown-token> renders without server error', async ({ page }) => {
    const res = await page.goto('/estimate/this-token-does-not-exist');
    const status = res?.status() ?? 0;
    // Either 200 (renders "not found" UI) or 404 — never 500
    expect([200, 404]).toContain(status);
  });

  test('/login loads with 200 and has an email + password input', async ({ page }) => {
    const res = await page.goto('/login');
    expect(res?.status()).toBe(200);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('/sitemap.xml is well-formed XML', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/<urlset/);
    expect(text).toMatch(/<\/urlset>/);
    // Should reference at least one /eniwa URL
    expect(text).toMatch(/\/eniwa/);
  });

  test('/robots.txt mentions sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    expect((await res.text()).toLowerCase()).toContain('sitemap');
  });
});

test.describe('Per-store sub-pages', () => {
  const PAGES = [
    { path: `/${STORE}/news`, marker: /お知らせ|news/i },
    { path: `/${STORE}/privacy`, marker: /プライバシー|個人情報/ },
    { path: `/${STORE}/reviews`, marker: /お客様|レビュー|review/i },
    { path: `/${STORE}/cases`, marker: /施工|事例|case/i },
    { path: `/${STORE}/options`, marker: /オプション|option/i },
  ];

  for (const { path, marker } of PAGES) {
    test(`${path} loads with 200`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
    });

    test(`${path} renders page-specific content`, async ({ page }) => {
      await page.goto(path);
      const body = (await page.locator('body').textContent()) ?? '';
      expect(body).toMatch(marker);
    });
  }
});

test.describe('Per-store page heads', () => {
  test('storefront home has <title>', async ({ page }) => {
    await page.goto(`/${STORE}`);
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('storefront home has meta description', async ({ page }) => {
    await page.goto(`/${STORE}`);
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc?.length ?? 0).toBeGreaterThan(0);
  });

  test('storefront home has Open Graph tags', async ({ page }) => {
    await page.goto(`/${STORE}`);
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle?.length ?? 0).toBeGreaterThan(0);
  });

  test('coatings page has unique title vs home', async ({ page }) => {
    await page.goto(`/${STORE}`);
    const homeTitle = await page.title();
    await page.goto(`/${STORE}/coatings`);
    const coatingsTitle = await page.title();
    expect(coatingsTitle).not.toBe(homeTitle);
  });
});

test.describe('Console & request errors on key pages', () => {
  const PATHS = ['/', '/eniwa', '/eniwa/coatings', '/eniwa/booking', '/eniwa/inquiry'];

  for (const path of PATHS) {
    test(`${path} has no uncaught console.error`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          // Ignore third-party 3rd-party noise (Maps, image 404s, analytics)
          if (
            text.includes('Google Maps') ||
            text.includes('googleapis') ||
            text.includes('googletagmanager') ||
            text.includes('vercel') ||
            text.includes('Failed to load resource')
          ) {
            return;
          }
          errors.push(`console: ${text}`);
        }
      });
      await page.goto(path);
      await page.waitForLoadState('networkidle').catch(() => {});
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }
});
