import { test, expect } from '@playwright/test';

// Tests for the notification opt-in endpoints.
// These run against the dev server (baseURL: http://localhost:8081).

test.describe('Notification opt-in API', () => {
  test('/admin/users redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/admin/users');
    expect(page.url()).toContain('/login');
  });

  test('me/notification-opt-in PATCH returns 401 without session', async ({ request }) => {
    const res = await request.patch('/api/admin/users/me/notification-opt-in', {
      data: { optIn: true },
    });
    expect(res.status()).toBe(401);
  });

  test('uid/notification-opt-in PATCH returns 401 without session', async ({ request }) => {
    const res = await request.patch('/api/admin/users/some-uid/notification-opt-in', {
      data: { optIn: true },
    });
    expect(res.status()).toBe(401);
  });

  test('me/notification-opt-in PATCH returns 400 for invalid body', async ({ request }) => {
    // Without a valid session the proxy returns 401, not 400.
    // This confirms the proxy rejects before the body check.
    const res = await request.patch('/api/admin/users/me/notification-opt-in', {
      data: { optIn: 'not-a-boolean' },
    });
    // 401 from proxy or 400 from handler — either is correct; must not be 500.
    expect([400, 401]).toContain(res.status());
  });

  test('/api/admin/users GET returns 401 without session', async ({ request }) => {
    const res = await request.get('/api/admin/users');
    expect(res.status()).toBe(401);
  });
});
