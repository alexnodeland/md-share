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
