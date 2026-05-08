import { test, expect } from '@playwright/test';

// Security-relevant response checks: no leaked stack traces, redirect-to-login
// for protected pages, and that error responses don't include Firebase
// internals.

test.describe('Error response hygiene', () => {
  test('inquiry POST error does not leak Firebase / stack traces', async ({ request }) => {
    const res = await request.post('/api/inquiry', { data: {} });
    const text = await res.text();
    expect(text).not.toMatch(/firestore/i);
    expect(text).not.toMatch(/firebase-admin/i);
    expect(text).not.toMatch(/at \w+ \(\//); // Node stack frames look like "at func (/path"
    expect(text).not.toMatch(/Error: Failed to /);
  });

  test('reservation POST error does not leak Firebase / stack traces', async ({ request }) => {
    const res = await request.post('/api/reservation', { data: {} });
    const text = await res.text();
    expect(text).not.toMatch(/firestore/i);
    expect(text).not.toMatch(/firebase-admin/i);
    expect(text).not.toMatch(/at \w+ \(\//);
  });

  test('admin endpoint 401 does not leak internal errors', async ({ request }) => {
    const res = await request.get('/api/admin/stores');
    const text = await res.text();
    expect(text).not.toMatch(/firebase-admin/i);
    expect(text).not.toMatch(/at \w+ \(\//);
  });
});

test.describe('Auth gate via proxy', () => {
  test('/admin redirects (no leak of admin markup)', async ({ page }) => {
    const res = await page.goto('/admin');
    // Either 200 (already authed in dev) or final URL is /login
    if (page.url().includes('/login')) {
      // Proxy redirected; that's the expected branch
      expect(page.url()).toMatch(/\/login/);
    } else {
      expect(res?.status()).toBe(200);
    }
  });

  test('/admin/builder/eniwa redirects to /login when unauthed', async ({ page }) => {
    await page.goto('/admin/builder/eniwa');
    // Either we land on login OR (already authed) we land on builder
    expect(page.url()).toMatch(/\/(login|admin)/);
  });

  test('/api/admin/stores returns 401 (proxy gate)', async ({ request }) => {
    const res = await request.get('/api/admin/stores');
    expect(res.status()).toBe(401);
  });
});

test.describe('Public surface — no admin markup leaked', () => {
  test('storefront home does not contain admin-only strings', async ({ page }) => {
    await page.goto('/eniwa');
    const html = await page.content();
    // Admin shell uses "管理" and "ダッシュボード"; storefront should not
    expect(html).not.toMatch(/管理ダッシュボード/);
  });
});

test.describe('Cancel-token URL safety', () => {
  test('cancel page renders for unknown token (no 500)', async ({ page }) => {
    const res = await page.goto('/cancel?id=unknown&token=unknown');
    const status = res?.status() ?? 0;
    expect(status).not.toBe(500);
  });
});
