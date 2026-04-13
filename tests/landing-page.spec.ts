import { test, expect } from '@playwright/test';

test.describe('Landing Page (/)', () => {
  test('page loads with 200', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('hero section visible with title text', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('h1');
    await expect(hero).toBeVisible();
    await expect(hero).toContainText('洗車だけで、この輝きが続く');
  });

  test('hero has KeePer PRO SHOP subtitle', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=KeePer PRO SHOP').first()).toBeVisible();
  });

  test('hero CTA buttons are visible', async ({ page }) => {
    await page.goto('/');
    const storeFinderBtn = page.locator('a[href="#store-finder"]').first();
    await expect(storeFinderBtn).toBeVisible();
    await expect(storeFinderBtn).toContainText('近くの店舗を探す');

    const servicesBtn = page.locator('a[href="#services"]').first();
    await expect(servicesBtn).toBeVisible();
    await expect(servicesBtn).toContainText('メニューを見る');
  });

  test('services menu section has coating tier group labels', async ({ page }) => {
    await page.goto('/');
    const servicesSection = page.locator('#services');
    await expect(servicesSection).toBeVisible();
    await expect(servicesSection.locator('h2')).toContainText('コーティングメニュー');

    // All four tier groups should appear
    await expect(servicesSection.locator('text=FLAGSHIP')).toBeVisible();
    await expect(servicesSection.locator('text=PREMIUM')).toBeVisible();
    await expect(servicesSection.locator('text=STANDARD')).toBeVisible();
    await expect(servicesSection.locator('text=ENTRY')).toBeVisible();
  });

  test('services section has individual tier cards as links', async ({ page }) => {
    await page.goto('/');
    const servicesSection = page.locator('#services');
    // Cards link to #store-finder
    const tierCards = servicesSection.locator('a[href="#store-finder"]');
    expect(await tierCards.count()).toBeGreaterThanOrEqual(4);
  });

  test('store finder map section exists with heading', async ({ page }) => {
    await page.goto('/');
    const storeFinderSection = page.locator('#store-finder');
    await expect(storeFinderSection).toBeVisible();
    await expect(storeFinderSection.locator('h2')).toContainText('店舗検索');
    await expect(storeFinderSection.locator('text=お近くのKeePer PRO SHOPを探す')).toBeVisible();
  });

  test('store finder has detect location button', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('#store-finder');
    // The "現在地から探す" button or geolocation status text should be present
    const locateBtn = section.locator('button:has-text("現在地から探す")');
    const geoStatus = section.locator('text=位置情報');
    const either = (await locateBtn.count()) > 0 || (await geoStatus.count()) > 0;
    expect(either).toBeTruthy();
  });

  test('gallery section has store images', async ({ page }) => {
    await page.goto('/');
    const galleryHeading = page.locator('h2:has-text("全国の店舗")');
    await expect(galleryHeading).toBeVisible();

    // Gallery contains multiple images
    const gallerySection = galleryHeading.locator('..').locator('..');
    const images = gallerySection.locator('img');
    expect(await images.count()).toBeGreaterThanOrEqual(5);
  });

  test('why KeePer section exists', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h2:has-text("KeePer が選ばれる理由")')).toBeVisible();
  });

  test('blog/columns section exists with articles', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h2:has-text("コラム・お役立ち情報")')).toBeVisible();
    // Should have article links
    const blogLinks = page.locator('a[href^="/blog/"]');
    expect(await blogLinks.count()).toBeGreaterThanOrEqual(1);
  });

  test('news section exists', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h2:has-text("お知らせ")')).toBeVisible();
  });

  test('process steps section exists', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h2:has-text("ご利用の流れ")')).toBeVisible();
  });

  test('bottom CTA section exists', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h2:has-text("コーティングを始めませんか")')).toBeVisible();
  });
});
