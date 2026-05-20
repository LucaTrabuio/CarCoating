import { test, expect } from '@playwright/test';

test.describe('keeper-surveys admin — unauthenticated guards', () => {
  test('GET /api/admin/keeper-surveys returns 401 without session', async ({
    request,
  }) => {
    const res = await request.get('/api/admin/keeper-surveys');
    expect(res.status()).toBe(401);
  });

  test('POST /api/admin/keeper-surveys/sync returns 401 without session', async ({
    request,
  }) => {
    const res = await request.post('/api/admin/keeper-surveys/sync', {
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  test('GET /admin/keeper-surveys redirects unauthenticated users', async ({
    page,
  }) => {
    const res = await page.goto('/admin/keeper-surveys');
    // The proxy gates /admin/** — unauthenticated users are redirected to /login
    expect(
      res?.status() === 302 ||
        res?.status() === 307 ||
        page.url().includes('/login'),
    ).toBe(true);
  });
});
