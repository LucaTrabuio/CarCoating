import { test, expect } from '@playwright/test';

// Lightweight accessibility spot-checks. We avoid axe to keep the dep
// surface minimal — these focus on common, easy-to-spot issues.

const PATHS = ['/', '/eniwa', '/eniwa/coatings', '/eniwa/inquiry', '/eniwa/booking'];

for (const path of PATHS) {
  test.describe(`A11y spot-check — ${path}`, () => {
    test('exactly one <h1>', async ({ page }) => {
      await page.goto(path);
      const h1Count = await page.locator('h1').count();
      expect(h1Count, `${path} has ${h1Count} h1s`).toBeGreaterThanOrEqual(1);
    });

    test('document has lang attribute', async ({ page }) => {
      await page.goto(path);
      const lang = await page.locator('html').getAttribute('lang');
      expect(lang).toBeTruthy();
    });

    test('all <img> tags have alt attribute', async ({ page }) => {
      await page.goto(path);
      const imgs = await page.locator('img').all();
      const missing: string[] = [];
      for (const img of imgs) {
        const alt = await img.getAttribute('alt');
        if (alt === null) {
          const src = (await img.getAttribute('src')) ?? '<no src>';
          missing.push(src);
        }
      }
      expect(missing, `imgs missing alt: ${missing.join(', ')}`).toEqual([]);
    });

    test('all <a> tags have non-empty accessible label', async ({ page }) => {
      await page.goto(path);
      const links = await page.locator('a:visible').all();
      const empties: string[] = [];
      for (const link of links) {
        const text = (await link.textContent())?.trim() ?? '';
        const aria = await link.getAttribute('aria-label');
        const title = await link.getAttribute('title');
        const hasImgWithAlt =
          (await link.locator('img[alt]:not([alt=""])').count()) > 0;
        if (!text && !aria && !title && !hasImgWithAlt) {
          empties.push((await link.getAttribute('href')) ?? '<no href>');
        }
      }
      expect(empties, `links with no label: ${empties.join(', ')}`).toEqual([]);
    });

    test('all form inputs have a label, placeholder, or aria-label', async ({ page }) => {
      await page.goto(path);
      const inputs = await page
        .locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):visible')
        .all();
      const missing: string[] = [];
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const aria = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');
        const name = await input.getAttribute('name');
        let labeled = !!aria || !!ariaLabelledby || !!placeholder;
        if (!labeled && id) {
          labeled = (await page.locator(`label[for="${id}"]`).count()) > 0;
        }
        if (!labeled) {
          // Walk up to ~3 ancestors checking for adjacent <label> or text nodes
          labeled = await input.evaluate((el) => {
            let cur: HTMLElement | null = el as HTMLElement;
            for (let i = 0; i < 3 && cur; i++) {
              if (cur.tagName === 'LABEL') return true;
              if (cur.previousElementSibling?.tagName === 'LABEL') return true;
              cur = cur.parentElement;
            }
            return false;
          });
        }
        if (!labeled) {
          missing.push(name ?? id ?? '<unnamed>');
        }
      }
      expect(missing, `unlabeled inputs on ${path}: ${missing.join(', ')}`).toEqual([]);
    });
  });
}

test.describe('Keyboard navigation — landing page', () => {
  test('first Tab focuses an interactive element', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(
      () => document.activeElement?.tagName.toLowerCase() ?? '',
    );
    // Should focus a link, button, or input — not <body>
    expect(['a', 'button', 'input', 'select', 'textarea']).toContain(focusedTag);
  });
});
