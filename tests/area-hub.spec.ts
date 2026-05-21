import { test, expect } from '@playwright/test';

// Uses the same multi-store sub-company slug as sub-company.spec.ts
const AREA_SLUG = 'ichihara';

test.describe('Area Hub (ichihara)', () => {
  test('loads with 200', async ({ page }) => {
    const res = await page.goto(`/${AREA_SLUG}`);
    expect(res?.status()).toBe(200);
  });

  test('has header and footer', async ({ page }) => {
    await page.goto(`/${AREA_SLUG}`);
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('area_store_map default block renders store list heading', async ({ page }) => {
    await page.goto(`/${AREA_SLUG}`);
    await expect(page.locator('text=店舗一覧・アクセス').first()).toBeVisible();
  });

  test('aggregated_coatings section is present', async ({ page }) => {
    await page.goto(`/${AREA_SLUG}`);
    await expect(page.locator('text=コーティングメニュー').first()).toBeVisible();
  });

  test('aggregated_options section is present', async ({ page }) => {
    await page.goto(`/${AREA_SLUG}`);
    await expect(page.locator('text=オプションメニュー').first()).toBeVisible();
  });
});

test.describe('Area layout API auth', () => {
  test('PUT /api/admin/sub-companies/<id>/layout without session → 401', async ({ request }) => {
    const res = await request.put('/api/admin/sub-companies/test-area-id/layout', {
      data: { blocks: [] },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /api/admin/sub-companies/<id>/layout without session → 401', async ({ request }) => {
    const res = await request.get('/api/admin/sub-companies/test-area-id/layout');
    expect(res.status()).toBe(401);
  });
});
