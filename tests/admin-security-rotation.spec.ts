import { test, expect } from '@playwright/test';

test.describe('Admin security — public pages reachable without auth', () => {
  test('/admin/forgot-password is accessible without session', async ({ page }) => {
    const res = await page.goto('/admin/forgot-password');
    expect(res?.status()).not.toBe(404);
    expect(res?.status()).not.toBe(500);
    await expect(page.locator('form')).toBeVisible();
  });

  test('/admin/reset-password is accessible without session', async ({ page }) => {
    const res = await page.goto('/admin/reset-password?token=invalid-token');
    expect(res?.status()).not.toBe(404);
    expect(res?.status()).not.toBe(500);
  });
});

test.describe('Forgot-password API — anti-enumeration', () => {
  test('always returns 200 regardless of email existence', async ({ request }) => {
    const res = await request.post('/api/admin/security/forgot-password', {
      data: { email: 'nonexistent-user-12345@example.com' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('returns 200 for invalid email format (graceful)', async ({ request }) => {
    const res = await request.post('/api/admin/security/forgot-password', {
      data: { email: 'not-an-email' },
    });
    expect(res.status()).toBe(200);
  });
});

test.describe('Reset-password token validation', () => {
  test('GET with invalid token returns valid:false', async ({ request }) => {
    const res = await request.get('/api/admin/security/reset-password?token=definitely-not-a-real-token');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  test('GET with missing token returns 400', async ({ request }) => {
    const res = await request.get('/api/admin/security/reset-password');
    expect(res.status()).toBe(400);
  });
});

test.describe('Admin security pages — route existence', () => {
  const PAGES = [
    '/admin/change-password',
    '/admin/security',
    '/admin/customers',
  ];

  for (const path of PAGES) {
    test(`${path} exists (redirect to login, not 404)`, async ({ page }) => {
      const res = await page.goto(path);
      const status = res?.status();
      expect(status).not.toBe(404);
      expect(status).not.toBe(500);
    });
  }
});

test.describe('Admin security API routes — auth check', () => {
  const ROUTES = [
    { method: 'POST', path: '/api/admin/security/step-up' },
    { method: 'POST', path: '/api/admin/security/change-password' },
    { method: 'POST', path: '/api/admin/users/me/password-changed' },
    { method: 'GET', path: '/api/admin/customers?storeId=eniwa' },
  ];

  for (const route of ROUTES) {
    test(`${route.method} ${route.path} returns 401 without auth`, async ({ request }) => {
      let res;
      if (route.method === 'POST') {
        res = await request.post(route.path, { data: {} });
      } else {
        res = await request.get(route.path);
      }
      expect(res.status()).toBe(401);
    });
  }
});

test.describe('Password expiry cron — CRON_SECRET gate', () => {
  test('returns 401 without secret', async ({ request }) => {
    const res = await request.get('/api/admin/security/password-expiry-cron');
    expect(res.status()).toBe(401);
  });
});
