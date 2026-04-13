import { test, expect } from '@playwright/test';

// Admin pages require auth — unauthenticated requests get 307 redirect to /login.
// We test that they DON'T return 404 (the route exists) and DO redirect to login.

const ADMIN_PAGES = [
  '/admin',
  '/admin/bookings',
  '/admin/bookings/settings',
  '/admin/bookings/settings/store',
  '/admin/inquiries',
  '/admin/tickets',
  '/admin/kpi',
  '/admin/diagnostics',
  '/admin/master',
  '/admin/campaigns',
  '/admin/homepage',
  '/admin/blog',
  '/admin/stores',
  '/admin/hierarchy',
  '/admin/users',
  '/admin/cases',
  '/admin/news',
  '/admin/builder/eniwa',
];

test.describe('Admin Pages — route existence', () => {
  for (const path of ADMIN_PAGES) {
    test(`${path} exists (redirects to login, not 404)`, async ({ page }) => {
      const res = await page.goto(path);
      const status = res?.status();
      const url = page.url();
      // Should either redirect to /login (307→200) or return 200 (if somehow authed)
      // Should NOT be 404 or 500
      expect(status, `${path} returned ${status}`).not.toBe(404);
      expect(status, `${path} returned ${status}`).not.toBe(500);
      // After redirect, should land on /login or the admin page itself
      expect(url).toMatch(/\/(login|admin)/);
    });
  }
});

test.describe('Admin API routes — auth check', () => {
  const API_ROUTES = [
    { method: 'GET', path: '/api/admin/bookings' },
    { method: 'GET', path: '/api/admin/inquiries' },
    { method: 'GET', path: '/api/admin/tickets' },
    { method: 'GET', path: '/api/admin/tickets/count' },
    { method: 'GET', path: '/api/admin/kpi?storeId=eniwa' },
    { method: 'GET', path: '/api/admin/diagnostics' },
    { method: 'GET', path: '/api/admin/template?store=eniwa' },
    { method: 'GET', path: '/api/admin/overrides?store=eniwa' },
    { method: 'GET', path: '/api/admin/store-settings?store=eniwa' },
    { method: 'GET', path: '/api/admin/master/appeal-points' },
    { method: 'GET', path: '/api/admin/master/coating-tiers' },
    { method: 'GET', path: '/api/admin/homepage' },
  ];

  for (const route of API_ROUTES) {
    test(`${route.method} ${route.path} returns 401 (not 404)`, async ({ request }) => {
      const res = await request.get(route.path);
      // Should return 401 (unauthorized), NOT 404 (route missing)
      expect(res.status(), `${route.path} returned ${res.status()}`).not.toBe(404);
      expect(res.status()).toBe(401);
    });
  }
});

test.describe('Public API routes', () => {
  const PUBLIC_ROUTES = [
    '/api/v3/stores',
    '/api/v3/sub-companies',
    '/api/campaign',
    '/api/slots?store=eniwa&date=2026-04-15',
    '/api/slots?store=eniwa&month=2026-04',
  ];

  for (const path of PUBLIC_ROUTES) {
    test(`${path} returns 200`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
    });
  }
});
