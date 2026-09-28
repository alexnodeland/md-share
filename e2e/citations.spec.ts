import { readFile } from 'node:fs/promises';
import { editor, expect, preview, shareUrl, test } from './fixtures.ts';

test('Academic numbers citations, figures, tables, and equations', async ({ page }) => {
  await page.goto('./');
  await page.locator('#sample-select').selectOption('academic');
  const refs = preview(page).locator('ol.references > li');
  await expect(refs).toHaveCount(3);
  await expect(refs.first()).toContainText('Donald E. Knuth. 1984. The TeXbook.');
  await expect(preview(page).locator('.citation').first()).toHaveText('[1]');
  await expect(preview(page).locator('table caption')).toHaveText('Table 1: What each flavor adds');
  await expect(preview(page).locator('a.xref').first()).toHaveText('Equation (1)');
  await expect(preview(page).locator('[id="eq:gauss"] .tag')).toHaveText('(1)');
  // No bibliography source shows up as a code block.
  await expect(preview(page).locator('pre code.language-bibliography')).toHaveCount(0);
});

test('citation links scroll to the reference without dropping the payload', async ({ page }) => {
  await page.goto('./');
  await page.locator('#sample-select').selectOption('academic');
  const url = await shareUrl(page);
  await page.goto(url);
  await preview(page).locator('.citation a').first().click();
  await expect(page.locator('[id="ref-knuth84"]')).toBeInViewport();
  expect(page.url()).toBe(url);
});

test('@ autocompletes bibliography keys and labels', async ({ page }) => {
  await page.goto('./');
  await page.locator('#sample-select').selectOption('academic');
  await editor(page).press('Control+End');
  await page.keyboard.type('\n\nSee [@lam');
  const options = page.locator('#editor-completions [role="option"]');
  await expect(options).toHaveCount(1);
  await expect(options.first()).toContainText('lamport94');
  await page.keyboard.press('Enter');
  await expect(editor(page)).toHaveValue(/See \[@lamport94$/);
  await page.keyboard.type('] and @tbl');
  await expect(options.first()).toContainText('tbl:flavors');
});

test('Word export keeps citations and the numbered reference list', async ({ page }) => {
  const JSZip = (await import('jszip')).default;
  await page.goto('./');
  await page.locator('#sample-select').selectOption('academic');
  await expect(preview(page).locator('ol.references')).toBeVisible();
  await page.locator('[data-dropdown="export-menu"]').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#btn-export-docx').click(),
  ]);
  const zip = await JSZip.loadAsync(await readFile((await download.path()) ?? ''));
  const doc = (await zip.file('word/document.xml')?.async('string')) ?? '';
  expect(doc).toContain('Knuth [1]');
  expect(doc).toContain('Table 1: ');
  expect(doc).toContain('The TeXbook.');
  expect(doc).not.toContain('@book{');
});
