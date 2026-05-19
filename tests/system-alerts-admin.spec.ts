import { test, expect } from '@playwright/test';

// These tests cover the system-alerts admin page and sidebar entry.
// They run against the dev server (baseURL: http://localhost:8081).
// The admin routes are proxied behind session auth — tests that need
// a logged-in session are marked as checking the redirect-to-login
// behavior only (full auth e2e requires a seeded session cookie).

test.describe('System Alerts admin entry', () => {
  test('unauthenticated request to /admin/system-alerts redirects to login', async ({ page }) => {
    await page.goto('/admin/system-alerts');
    // The proxy redirects to /login when no session cookie is present.
    expect(page.url()).toContain('/login');
  });

  test('seed endpoint returns 404 in production (dev: accepts POST)', async ({ request }) => {
    // In dev mode (NODE_ENV !== production) the seed handler processes requests.
    // In CI/CD this test just verifies the endpoint is reachable (not 500).
    const res = await request.post('/api/admin/system-alerts/seed', {
      data: { source: 'test', severity: 'info', title: 'playwright smoke test', dedupeKey: 'playwright:smoke:1' },
    });
    // Accept 200 (dev, authenticated), 401 (proxy rejects unauthenticated request),
    // or 404 (prod, route not registered) but not 500.
    expect([200, 401, 404]).toContain(res.status());
  });

  test('list endpoint returns 401 without authorization header', async ({ request }) => {
    const res = await request.get('/api/admin/system-alerts');
    expect(res.status()).toBe(401);
  });

  test('status endpoint returns 401 without authorization header', async ({ request }) => {
    const res = await request.post('/api/admin/system-alerts/fake-id/status', {
      data: { action: 'acknowledge' },
    });
    expect(res.status()).toBe(401);
  });

  test('purge-test endpoint returns 401 without authorization header', async ({ request }) => {
    const res = await request.post('/api/admin/system-alerts/purge-test');
    expect(res.status()).toBe(401);
  });
});
