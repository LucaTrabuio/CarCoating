import { test, expect } from '@playwright/test';

// Unauthenticated route-existence checks for /admin/area-hub and /admin/homepage.
// Authenticated heading / nav assertions are covered by the Vitest unit test
// (src/__tests__/admin-nav.test.ts) — no login helper exists in this suite.

const ROUTES = ['/admin/area-hub', '/admin/homepage'];

test.describe('Admin area-hub and homepage — route existence', () => {
  for (const path of ROUTES) {
    test(`${path} exists (redirects to login, not 404 or 500)`, async ({ page }) => {
      const res = await page.goto(path);
      const status = res?.status();
      const url = page.url();
      expect(status, `${path} returned ${status}`).not.toBe(404);
      expect(status, `${path} returned ${status}`).not.toBe(500);
      expect(url).toMatch(/\/(login|admin)/);
    });
  }
});
