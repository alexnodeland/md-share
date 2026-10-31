import { expect, test, typeDoc } from './fixtures.ts';

const presenting = (page: import('@playwright/test').Page) =>
  page.locator('html[data-presenting="true"]');

test('a deck offers a Present button that starts and ends the slideshow', async ({ page }) => {
  await page.goto('./');
  await page.locator('#sample-select').selectOption('presentation');
  const present = page.locator('#btn-present');
  await expect(present).toBeVisible();
  await present.click();
  await expect(presenting(page)).toHaveCount(1);
  await expect(page.locator('#preview .slide.current h1')).toHaveText('Presentation demo');
  await expect(present).toBeHidden();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#preview .slide.current h2')).toContainText('Slides split on');
  await page.keyboard.press('Escape');
  await expect(presenting(page)).toHaveCount(0);
  await expect(present).toBeVisible();
});

test('a document with one section break is not offered as a deck', async ({ page }) => {
  await page.goto('./');
  await typeDoc(page, '# Essay\n\nPart one.\n\n---\n\nPart two.');
  await expect(page.locator('#btn-present')).toBeHidden();
  await typeDoc(page, '# Talk\n\n---\n\n## Two\n\n---\n\n## Three');
  await expect(page.locator('#btn-present')).toBeVisible();
});

test('Ctrl+Alt+P presents, as the sample promises', async ({ page }) => {
  await page.goto('./');
  await page.locator('#sample-select').selectOption('presentation');
  await page.locator('#preview').click();
  await page.keyboard.press('Control+Alt+KeyP');
  await expect(presenting(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
});

test('the Export menu only exports: downloads with extensions, then copy', async ({ page }) => {
  await page.goto('./');
  await page.locator('[data-dropdown="export-menu"]').click();
  const menu = page.locator('#export-menu');
  const downloads = menu.getByRole('group', { name: 'Download' }).locator('button:visible');
  for (const label of await downloads.allTextContents()) expect(label).toMatch(/\(\.\w+\)\s*$/);
  await expect(menu.getByRole('group', { name: 'Copy' }).getByRole('menuitem')).toHaveText(
    /Formatted text/,
  );
  await expect(menu.getByText(/Present/)).toHaveCount(0);
});
