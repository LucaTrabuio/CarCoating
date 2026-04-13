import { test, expect } from '@playwright/test';

test.describe('Inquiry Form (/eniwa/inquiry)', () => {
  test.describe('Form structure', () => {
    test('page loads with inquiry heading', async ({ page }) => {
      await page.goto('/eniwa/inquiry');
      await expect(page.locator('text=お問い合わせ').first()).toBeVisible();
    });

    test('form has name input', async ({ page }) => {
      await page.goto('/eniwa/inquiry');
      const nameInput = page.locator('input[type="text"]').first();
      await expect(nameInput).toBeVisible();
      await expect(nameInput).toHaveAttribute('required', '');
    });

    test('form has phone input (required)', async ({ page }) => {
      await page.goto('/eniwa/inquiry');
      const phoneInput = page.locator('input[type="tel"]');
      await expect(phoneInput).toBeVisible();
      await expect(phoneInput).toHaveAttribute('required', '');
    });

    test('form has two email inputs (email + confirm)', async ({ page }) => {
      await page.goto('/eniwa/inquiry');
      const emailInputs = page.locator('input[type="email"]');
      expect(await emailInputs.count()).toBe(2);
      await expect(emailInputs.nth(0)).toHaveAttribute('required', '');
      await expect(emailInputs.nth(1)).toHaveAttribute('required', '');
    });

    test('form has vehicle info input', async ({ page }) => {
      await page.goto('/eniwa/inquiry');
      // Vehicle info field (text input, not the first one which is name)
      const textInputs = page.locator('input[type="text"]');
      expect(await textInputs.count()).toBeGreaterThanOrEqual(2);
    });

    test('form has message textarea (required)', async ({ page }) => {
      await page.goto('/eniwa/inquiry');
      const textarea = page.locator('textarea');
      await expect(textarea).toBeVisible();
      await expect(textarea).toHaveAttribute('required', '');
    });

    test('form has Google auto-fill button', async ({ page }) => {
      await page.goto('/eniwa/inquiry');
      await expect(page.locator('text=Googleで自動入力')).toBeVisible();
    });
  });

  test.describe('Tier dropdown', () => {
    test('tier dropdown exists with options', async ({ page }) => {
      await page.goto('/eniwa/inquiry');
      const select = page.locator('select').first();
      await expect(select).toBeVisible();
      const options = await select.locator('option').count();
      expect(options).toBeGreaterThan(1);
    });

    test('tier dropdown has crystal option', async ({ page }) => {
      await page.goto('/eniwa/inquiry');
      const select = page.locator('select').first();
      await expect(select.locator('option[value="crystal"]')).toHaveCount(1);
    });
  });

  test.describe('Query parameter pre-fill', () => {
    test('?tier=crystal pre-selects the tier', async ({ page }) => {
      await page.goto('/eniwa/inquiry?tier=crystal');
      const select = page.locator('select').first();
      await expect(select).toHaveValue('crystal');
    });

    test('?prefill=price pre-fills message with pricing text', async ({ page }) => {
      await page.goto('/eniwa/inquiry?tier=crystal&prefill=price');
      const textarea = page.locator('textarea');
      await expect(textarea).toContainText('料金について');
    });

    test('?tier=diamond pre-selects diamond', async ({ page }) => {
      await page.goto('/eniwa/inquiry?tier=diamond');
      const select = page.locator('select').first();
      await expect(select).toHaveValue('diamond');
    });
  });

  test.describe('Validation', () => {
    test('email mismatch shows error message', async ({ page }) => {
      await page.goto('/eniwa/inquiry');
      const emailInputs = page.locator('input[type="email"]');
      await emailInputs.nth(0).fill('a@b.com');
      await emailInputs.nth(1).fill('x@y.com');
      await expect(page.locator('text=メールアドレスが一致しません')).toBeVisible();
    });

    test('matching emails do not show error', async ({ page }) => {
      await page.goto('/eniwa/inquiry');
      const emailInputs = page.locator('input[type="email"]');
      await emailInputs.nth(0).fill('same@test.com');
      await emailInputs.nth(1).fill('same@test.com');
      await expect(page.locator('text=メールアドレスが一致しません')).not.toBeVisible();
    });

    test('email confirm field turns red on mismatch', async ({ page }) => {
      await page.goto('/eniwa/inquiry');
      const emailInputs = page.locator('input[type="email"]');
      await emailInputs.nth(0).fill('a@b.com');
      await emailInputs.nth(1).fill('x@y.com');
      // The confirm input should have a red border class
      await expect(emailInputs.nth(1)).toHaveClass(/border-red-400/);
    });
  });

  test.describe('Store phone number', () => {
    test('shows store phone number', async ({ page }) => {
      await page.goto('/eniwa/inquiry');
      // Inquiry form shows a phone link for the store
      const phoneLink = page.locator('a[href^="tel:"]');
      expect(await phoneLink.count()).toBeGreaterThanOrEqual(1);
    });
  });
});
