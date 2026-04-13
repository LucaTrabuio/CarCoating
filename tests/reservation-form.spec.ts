import { test, expect } from '@playwright/test';

test.describe('Reservation Form (/eniwa/booking)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/eniwa/booking');
  });

  test('calendar renders with month and year', async ({ page }) => {
    // Calendar should show current or next month in format YYYY年M月
    await expect(page.locator('text=/\\d{4}年\\d{1,2}月/').first()).toBeVisible();
  });

  test('calendar has month navigation buttons', async ({ page }) => {
    await expect(page.locator('button:has-text("<")').first()).toBeVisible();
    await expect(page.locator('button:has-text(">")').first()).toBeVisible();
  });

  test('calendar has day-of-week labels', async ({ page }) => {
    // Japanese day labels: 日, 月, 火, 水, 木, 金, 土
    await expect(page.locator('text=日').first()).toBeVisible();
    await expect(page.locator('text=土').first()).toBeVisible();
  });

  test('calendar shows date buttons', async ({ page }) => {
    // Wait for calendar dates to load (may show loading state first)
    await page.waitForTimeout(2000);
    // Calendar grid should contain numbered day buttons
    const dayButtons = page.locator('button').filter({ hasText: /^\d{1,2}$/ });
    expect(await dayButtons.count()).toBeGreaterThanOrEqual(20);
  });

  test('can click a date and see time slots section', async ({ page }) => {
    await page.waitForTimeout(2000);
    // Find an available (green) date button and click it
    const availableDate = page.locator('button.bg-green-50').first();
    if (await availableDate.count() > 0) {
      await availableDate.click();
      // After selecting a date, time slots section should appear with "の空き時間"
      await expect(page.locator('text=の空き時間').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('can select a time slot and see next button', async ({ page }) => {
    await page.waitForTimeout(2000);
    const availableDate = page.locator('button.bg-green-50').first();
    if (await availableDate.count() > 0) {
      await availableDate.click();
      await page.waitForTimeout(2000);
      // Click first time slot button if available
      const timeSlot = page.locator('text=/^\\d{1,2}:\\d{2}$/').first();
      if (await timeSlot.count() > 0) {
        await timeSlot.click();
        // "Next" button to info step should appear
        await expect(page.locator('text=お客様情報の入力へ')).toBeVisible();
      }
    }
  });

  test('can navigate to info step', async ({ page }) => {
    await page.waitForTimeout(2000);
    const availableDate = page.locator('button.bg-green-50').first();
    if (await availableDate.count() > 0) {
      await availableDate.click();
      await page.waitForTimeout(2000);
      const timeSlot = page.locator('text=/^\\d{1,2}:\\d{2}$/').first();
      if (await timeSlot.count() > 0) {
        await timeSlot.click();
        await page.locator('text=お客様情報の入力へ').click();
        // Info step should show service selection or customer info form
        await expect(page.locator('text=ご希望のサービス').first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('info step has Google auto-fill button', async ({ page }) => {
    await page.waitForTimeout(2000);
    const availableDate = page.locator('button.bg-green-50').first();
    if (await availableDate.count() > 0) {
      await availableDate.click();
      await page.waitForTimeout(2000);
      const timeSlot = page.locator('text=/^\\d{1,2}:\\d{2}$/').first();
      if (await timeSlot.count() > 0) {
        await timeSlot.click();
        await page.locator('text=お客様情報の入力へ').click();
        await expect(page.locator('text=Googleで自動入力')).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('info step email mismatch shows error', async ({ page }) => {
    await page.waitForTimeout(2000);
    const availableDate = page.locator('button.bg-green-50').first();
    if (await availableDate.count() > 0) {
      await availableDate.click();
      await page.waitForTimeout(2000);
      const timeSlot = page.locator('text=/^\\d{1,2}:\\d{2}$/').first();
      if (await timeSlot.count() > 0) {
        await timeSlot.click();
        await page.locator('text=お客様情報の入力へ').click();
        await page.waitForTimeout(1000);
        // Fill email fields with mismatched values
        const emailInputs = page.locator('input[type="email"]');
        await emailInputs.nth(0).fill('test@example.com');
        await emailInputs.nth(1).fill('wrong@example.com');
        // Error message should appear
        await expect(page.locator('text=メールアドレスが一致しません')).toBeVisible();
      }
    }
  });

  test('selection summary shows "未選択" initially', async ({ page }) => {
    await expect(page.locator('text=未選択')).toBeVisible();
  });

  test('can navigate to next month in calendar', async ({ page }) => {
    // Get current month text
    const monthText = await page.locator('text=/\\d{4}年\\d{1,2}月/').first().textContent();
    // Click next month
    await page.locator('button:has-text(">")').first().click();
    await page.waitForTimeout(500);
    // Month text should change
    const newMonthText = await page.locator('text=/\\d{4}年\\d{1,2}月/').first().textContent();
    expect(newMonthText).not.toBe(monthText);
  });
});
