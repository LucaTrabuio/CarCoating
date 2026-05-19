import { test, expect } from '@playwright/test';

test.describe('Customer API — PII gate (no auth)', () => {
  test('GET /api/admin/customers returns 401 without session', async ({ request }) => {
    const res = await request.get('/api/admin/customers?storeId=eniwa');
    expect(res.status()).toBe(401);
  });

  test('GET /api/admin/customers/[email] returns 401 without session', async ({ request }) => {
    const res = await request.get('/api/admin/customers/test%40example.com?storeId=eniwa');
    expect(res.status()).toBe(401);
  });

  test('GET /api/admin/customers/export returns 401 without session', async ({ request }) => {
    const res = await request.get('/api/admin/customers/export?storeId=eniwa');
    expect(res.status()).toBe(401);
  });
});

test.describe('Customer page — route existence', () => {
  test('/admin/customers exists (redirect to login, not 404)', async ({ page }) => {
    const res = await page.goto('/admin/customers');
    expect(res?.status()).not.toBe(404);
    expect(res?.status()).not.toBe(500);
  });
});
