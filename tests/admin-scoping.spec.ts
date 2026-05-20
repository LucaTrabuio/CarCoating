import { test, expect } from '@playwright/test';

// These tests assert unauthenticated boundary behavior (401 from the proxy)
// and route existence (not 404/500) for admin and API routes.
//
// Full role-level assertions (store_admin foreign-store → 403, super_admin
// sees all stores) require a seeded session cookie and are documented as the
// intended server behavior:
//   - GET /api/v3/stores/<storeId> with a store_admin session for a foreign
//     store returns 403 (enforced by canManageStore in the GET handler).
//   - GET /api/v3/stores is intentionally public (used by the public homepage
//     store-finder map); no auth required.

test.describe('Store detail API — unauthenticated boundary', () => {
  test('GET /api/v3/stores/<id> without session returns 401', async ({ request }) => {
    const res = await request.get('/api/v3/stores/eniwa');
    expect(res.status()).toBe(401);
  });
});

test.describe('Store list API — public endpoint', () => {
  test('GET /api/v3/stores without session returns 200 (public)', async ({ request }) => {
    const res = await request.get('/api/v3/stores');
    expect(res.status()).toBe(200);
  });

  test('GET /api/v3/stores?all=true requires auth (inactive stores not public)', async ({ request }) => {
    // ?all=true includes inactive/unpublished drafts — must not be public.
    const res = await request.get('/api/v3/stores?all=true');
    expect(res.status()).toBe(401);
  });
});

test.describe('HQ APIs — unauthenticated boundary', () => {
  test('GET /api/v3/campaign is public (storefronts read campaign defaults)', async ({ request }) => {
    // GET /api/v3/* is public at the proxy (only writes are gated); campaign
    // defaults are consumed by public storefronts. Only the PUT is super_admin.
    const res = await request.get('/api/v3/campaign');
    expect([200, 304]).toContain(res.status());
  });

  test('GET /api/admin/master/coating-tiers without session returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/master/coating-tiers');
    expect(res.status()).toBe(401);
  });

  test('GET /api/admin/homepage without session returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/homepage');
    expect(res.status()).toBe(401);
  });

  test('GET /api/admin/diagnostics without session returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/diagnostics');
    expect(res.status()).toBe(401);
  });

  test('GET /api/admin/system-alerts without session returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/system-alerts');
    expect(res.status()).toBe(401);
  });

  test('GET /api/admin/keeper-surveys without session returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/keeper-surveys');
    expect(res.status()).toBe(401);
  });
});

test.describe('Hierarchy page — route existence', () => {
  test('/admin/hierarchy redirects to login unauthenticated (not 404)', async ({ page }) => {
    const res = await page.goto('/admin/hierarchy');
    expect(res?.status()).not.toBe(404);
    expect(res?.status()).not.toBe(500);
    // Proxy redirects to /login when no session cookie is present
    expect(page.url()).toContain('/login');
  });
});
