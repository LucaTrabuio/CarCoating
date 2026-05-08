import { test, expect } from '@playwright/test';

// Responsive breakpoint sanity checks for the storefront.

const BREAKPOINTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

for (const bp of BREAKPOINTS) {
  test.describe(`Storefront — ${bp.name} (${bp.width}x${bp.height})`, () => {
    test.use({ viewport: { width: bp.width, height: bp.height } });

    test('home renders header + footer', async ({ page }) => {
      await page.goto('/eniwa');
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    });

    test('no horizontal overflow', async ({ page }) => {
      await page.goto('/eniwa');
      const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      // Allow 1px rounding tolerance
      expect(docWidth).toBeLessThanOrEqual(viewportWidth + 1);
    });

    test('coatings page has visible heading', async ({ page }) => {
      await page.goto('/eniwa/coatings');
      await expect(
        page.locator('text=カーコーティングメニュー').first(),
      ).toBeVisible();
    });

    test('booking page has visible calendar header', async ({ page }) => {
      await page.goto('/eniwa/booking');
      await expect(
        page.locator('text=/\\d{4}年\\d{1,2}月/').first(),
      ).toBeVisible();
    });
  });
}

test.describe('Mobile-only — hamburger menu', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('mobile menu is keyboard-operable', async ({ page }) => {
    await page.goto('/eniwa');
    const hamburger = page.locator('button[aria-label="メニュー"]');
    await hamburger.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('nav.md\\:hidden')).toBeVisible();
  });
});
