import { test, expect } from '@playwright/test';

// Smoke tests for the admin shell. Full sidebar/drawer behaviour
// requires a seeded admin session, which CI doesn't have, so these
// tests deliberately stay at the unauthed boundary.

test('admin root redirects unauthenticated users to /login', async ({ page }) => {
  await page.goto('/admin');
  expect(page.url()).toMatch(/\/login(\?|$)/);
});

test('login page renders without 500 at mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const res = await page.goto('/login');
  expect(res?.status()).not.toBe(500);
  await expect(page.locator('body')).toBeVisible();
});
