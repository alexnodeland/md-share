import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures.ts';

test('HTML export is a styled, titled standalone page', async ({ page }) => {
  await page.goto('./');
  await page.locator('#sample-select').selectOption('academic');
  await page.locator('[data-dropdown="export-menu"]').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#btn-export-html').click(),
  ]);
  expect(download.suggestedFilename()).toBe('academic-flavor-demo.html');
  const html = await readFile((await download.path()) ?? '', 'utf8');
  expect(html).toContain('<title>Academic Flavor Demo</title>');
  expect(html).toMatch(/cdn\.jsdelivr\.net\/npm\/katex@[\d.]+\/dist\/katex\.min\.css/);
  expect(html).toContain('.rendered');
  expect(html).not.toContain('class="heading-anchor"');
});

test('Markdown export downloads the source under the document title', async ({ page }) => {
  await page.goto('./');
  await page.locator('#editor').fill('---\ntitle: Trip Plan\n---\nbody');
  await page.locator('[data-dropdown="export-menu"]').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#btn-export-md').click(),
  ]);
  expect(download.suggestedFilename()).toBe('trip-plan.md');
});
