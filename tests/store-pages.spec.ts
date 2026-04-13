import { test, expect } from '@playwright/test';

const STORE = 'eniwa';

test.describe('Store Pages', () => {
  test.describe('Store home (/{storeId})', () => {
    test('loads with 200', async ({ page }) => {
      const res = await page.goto(`/${STORE}`);
      expect(res?.status()).toBe(200);
    });

    test('has header with store name', async ({ page }) => {
      await page.goto(`/${STORE}`);
      await expect(page.locator('header')).toBeVisible();
    });

    test('has footer', async ({ page }) => {
      await page.goto(`/${STORE}`);
      await expect(page.locator('footer')).toBeVisible();
    });
  });

  test.describe('Coatings page (/{storeId}/coatings)', () => {
    test('loads with 200', async ({ page }) => {
      const res = await page.goto(`/${STORE}/coatings`);
      expect(res?.status()).toBe(200);
    });

    test('has coating menu heading', async ({ page }) => {
      await page.goto(`/${STORE}/coatings`);
      await expect(page.locator('text=カーコーティングメニュー').first()).toBeVisible();
    });

    test('has pricing information', async ({ page }) => {
      await page.goto(`/${STORE}/coatings`);
      // Pricing table should show yen amounts
      await expect(page.locator('text=¥').first()).toBeVisible();
    });
  });

  test.describe('Booking page (/{storeId}/booking)', () => {
    test('loads with 200', async ({ page }) => {
      const res = await page.goto(`/${STORE}/booking`);
      expect(res?.status()).toBe(200);
    });

    test('has booking heading', async ({ page }) => {
      await page.goto(`/${STORE}/booking`);
      await expect(page.locator('h1:has-text("ご予約")').first()).toBeVisible();
    });

    test('renders calendar with month navigation', async ({ page }) => {
      await page.goto(`/${STORE}/booking`);
      // Calendar prev/next buttons
      await expect(page.locator('button:has-text("<")').first()).toBeVisible();
      await expect(page.locator('button:has-text(">")').first()).toBeVisible();
      // Calendar shows year/month
      await expect(page.locator('text=/\\d{4}年\\d{1,2}月/').first()).toBeVisible();
    });
  });

  test.describe('Guide page (/{storeId}/guide)', () => {
    test('loads with 200', async ({ page }) => {
      const res = await page.goto(`/${STORE}/guide`);
      expect(res?.status()).toBe(200);
    });

    test('has guide heading', async ({ page }) => {
      await page.goto(`/${STORE}/guide`);
      await expect(page.locator('text=コーティングガイド').first()).toBeVisible();
    });
  });

  test.describe('Inquiry page (/{storeId}/inquiry)', () => {
    test('loads with 200', async ({ page }) => {
      const res = await page.goto(`/${STORE}/inquiry`);
      expect(res?.status()).toBe(200);
    });

    test('has inquiry heading', async ({ page }) => {
      await page.goto(`/${STORE}/inquiry`);
      await expect(page.locator('text=お問い合わせ').first()).toBeVisible();
    });

    test('has form inputs', async ({ page }) => {
      await page.goto(`/${STORE}/inquiry`);
      // Name, phone, email, emailConfirm, vehicle, message
      await expect(page.locator('input[type="text"]').first()).toBeVisible();
      await expect(page.locator('input[type="tel"]')).toBeVisible();
      await expect(page.locator('input[type="email"]').first()).toBeVisible();
      await expect(page.locator('textarea')).toBeVisible();
    });
  });

  test.describe('Access page (/{storeId}/access)', () => {
    test('loads with 200', async ({ page }) => {
      const res = await page.goto(`/${STORE}/access`);
      expect(res?.status()).toBe(200);
    });

    test('has store address or map content', async ({ page }) => {
      await page.goto(`/${STORE}/access`);
      // Access page should show address info or a map
      const hasAddress = (await page.locator('text=住所').count()) > 0 ||
                         (await page.locator('text=アクセス').count()) > 0 ||
                         (await page.locator('text=店舗情報').count()) > 0;
      expect(hasAddress).toBeTruthy();
    });
  });

  test.describe('Price simulator (/{storeId}/price)', () => {
    test('loads with 200', async ({ page }) => {
      const res = await page.goto(`/${STORE}/price`);
      expect(res?.status()).toBe(200);
    });

    test('has price simulator content', async ({ page }) => {
      await page.goto(`/${STORE}/price`);
      // Price page should have some interactive pricing content
      const hasContent = (await page.locator('text=見積もり').count()) > 0 ||
                         (await page.locator('text=料金').count()) > 0 ||
                         (await page.locator('text=シミュレーター').count()) > 0 ||
                         (await page.locator('select').count()) > 0;
      expect(hasContent).toBeTruthy();
    });
  });
});
