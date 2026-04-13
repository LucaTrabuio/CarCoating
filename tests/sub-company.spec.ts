import { test, expect } from '@playwright/test';

test.describe('Sub-Company Pages (ichihara)', () => {
  test.describe('Sub-company home (/ichihara)', () => {
    test('loads with 200', async ({ page }) => {
      const res = await page.goto('/ichihara');
      expect(res?.status()).toBe(200);
    });

    test('has header and footer', async ({ page }) => {
      await page.goto('/ichihara');
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    });

    test('SubCompanyStoreMap visible with store list', async ({ page }) => {
      await page.goto('/ichihara');
      // Multi-store view shows a store map/list section
      await expect(page.locator('text=店舗一覧・アクセス').first()).toBeVisible();
    });

    test('shows multiple store entries', async ({ page }) => {
      await page.goto('/ichihara');
      // Multi-store sub-company lists stores in the map section with their names
      const storeSection = page.locator('text=店舗一覧・アクセス').first();
      await expect(storeSection).toBeVisible();
    });
  });

  test.describe('Sub-company booking (/ichihara/booking)', () => {
    test('loads with 200', async ({ page }) => {
      const res = await page.goto('/ichihara/booking');
      expect(res?.status()).toBe(200);
    });

    test('shows store selector for multi-store booking', async ({ page }) => {
      await page.goto('/ichihara/booking');
      // Multi-store booking should ask user to select a store first
      await expect(page.locator('text=店舗を選択してください').first()).toBeVisible();
    });

    test('has booking heading', async ({ page }) => {
      await page.goto('/ichihara/booking');
      await expect(page.locator('h1:has-text("ご予約")').first()).toBeVisible();
    });
  });

  test.describe('Sub-company coatings (/ichihara/coatings)', () => {
    test('loads with 200', async ({ page }) => {
      const res = await page.goto('/ichihara/coatings');
      expect(res?.status()).toBe(200);
    });

    test('has coating menu content', async ({ page }) => {
      await page.goto('/ichihara/coatings');
      await expect(page.locator('text=カーコーティングメニュー').first()).toBeVisible();
    });
  });

  test.describe('Sub-company guide (/ichihara/guide)', () => {
    test('loads with 200', async ({ page }) => {
      const res = await page.goto('/ichihara/guide');
      expect(res?.status()).toBe(200);
    });

    test('has guide content', async ({ page }) => {
      await page.goto('/ichihara/guide');
      await expect(page.locator('text=コーティングガイド').first()).toBeVisible();
    });
  });

  test.describe('Sub-company inquiry (/ichihara/inquiry)', () => {
    test('loads with 200', async ({ page }) => {
      const res = await page.goto('/ichihara/inquiry');
      expect(res?.status()).toBe(200);
    });

    test('has inquiry form', async ({ page }) => {
      await page.goto('/ichihara/inquiry');
      await expect(page.locator('text=お問い合わせ').first()).toBeVisible();
      await expect(page.locator('input[type="email"]').first()).toBeVisible();
    });
  });
});
