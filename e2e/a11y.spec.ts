import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures.ts';

// PHILOSOPHY §4: accessibility is a feature. Any axe violation fails CI.
for (const theme of ['dark', 'light'] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('md-share:theme', t), theme);
    });

    test('empty state has no accessibility violations', async ({ page }) => {
      await page.goto('./');
      await expect(page.locator('.preview-empty')).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });

    for (const sample of ['gfm', 'obsidian', 'academic', 'atlassian']) {
      test(`${sample} sample has no accessibility violations`, async ({ page }) => {
        await page.goto('./');
        await page.locator('#sample-select').selectOption(sample);
        await expect(page.locator('#preview h1').first()).toBeVisible();
        await page.waitForTimeout(500); // mermaid + KaTeX settle
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      });
    }

    test('document-check menu has no accessibility violations', async ({ page }) => {
      await page.goto('./');
      // A broken in-page link: a real issue, but not one axe also flags in the preview.
      await page.locator('#editor').fill('# T\n\n[see](#missing)');
      await page.locator('#btn-lint').click();
      await expect(page.locator('#lint-menu .lint-item').first()).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });

    test('share dialog has no accessibility violations', async ({ page }) => {
      await page.goto('./');
      await page.locator('#sample-select').selectOption('gfm');
      await page.locator('#btn-link').click();
      await page.locator('#link-qr summary').click();
      await expect(page.locator('#link-qr-code svg')).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });
  });
}
