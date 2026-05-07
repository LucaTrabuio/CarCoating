import { test, expect } from '@playwright/test';

// The visibility PATCH endpoint lives at /api/v3/stores/:storeId/visibility.
// These tests verify auth guardrails without requiring a live Firebase — they
// only need the dev server to be running (baseURL: http://localhost:8081).

test.describe('Store visibility API — auth guardrails', () => {
  test('unauthenticated PATCH returns 401', async ({ request }) => {
    // No session cookie → proxy / handler should reject with 401
    const res = await request.patch('/api/v3/stores/eniwa/visibility', {
      data: { hide_mode: 'manual' },
    });
    expect(res.status()).toBe(401);
  });

  test('PATCH with invalid body returns 400', async ({ request }) => {
    // Still unauthenticated, but we can confirm the route exists (not 404)
    // even though auth will fire first.
    const res = await request.patch('/api/v3/stores/eniwa/visibility', {
      data: { hide_mode: 'unknown_value' },
    });
    // 401 (auth before body parse) or 400 (body fails Zod) — not 404
    expect(res.status()).not.toBe(404);
    expect([400, 401]).toContain(res.status());
  });

  test('visibility route exists (not 404)', async ({ request }) => {
    const res = await request.patch('/api/v3/stores/eniwa/visibility', {
      data: { hide_mode: null },
    });
    // Any auth/validation response is fine; 404 means the route is missing
    expect(res.status()).not.toBe(404);
  });
});

test.describe('Store visibility — public store list filtering', () => {
  test('GET /api/v3/stores returns a list (base-case)', async ({ request }) => {
    const res = await request.get('/api/v3/stores');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('GET /api/v3/stores does not include manually-hidden stores', async ({ request }) => {
    // We cannot guarantee a specific store is hidden in the test environment,
    // but we can assert that any store returned by the public endpoint does NOT
    // carry hide_mode='manual' (the filter strips them server-side).
    const res = await request.get('/api/v3/stores');
    expect(res.status()).toBe(200);
    const stores: Array<{ hide_mode?: string }> = await res.json();
    const manuallyHidden = stores.filter(s => s.hide_mode === 'manual');
    expect(manuallyHidden).toHaveLength(0);
  });
});

test.describe('Admin hierarchy page — route exists', () => {
  test('/admin/hierarchy redirects to login (not 404)', async ({ page }) => {
    const res = await page.goto('/admin/hierarchy');
    const status = res?.status();
    expect(status).not.toBe(404);
    expect(status).not.toBe(500);
    expect(page.url()).toMatch(/\/(login|admin)/);
  });
});

test.describe('Admin stores page — route exists', () => {
  test('/admin/stores redirects to login (not 404)', async ({ page }) => {
    const res = await page.goto('/admin/stores');
    const status = res?.status();
    expect(status).not.toBe(404);
    expect(status).not.toBe(500);
    expect(page.url()).toMatch(/\/(login|admin)/);
  });
});
