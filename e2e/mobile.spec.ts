import LZString from 'lz-string';
import { expect, test } from './fixtures.ts';

test.use({ viewport: { width: 360, height: 740 } });

test('the toolbar fits a small phone and Edit/View switches panes', async ({ page }) => {
  await page.goto('./');
  const overflow = await page.evaluate(() => {
    const bar = document.querySelector('.topbar') as HTMLElement;
    return bar.scrollWidth - bar.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.locator('#btn-help')).toBeInViewport();

  // A first visit opens on the welcome, which leads into the editor.
  await expect(page.locator('.preview-empty')).toBeVisible();
  await expect(page.locator('#editor')).toBeHidden();
  await page.locator('[data-start-writing]').click();
  await expect(page.locator('#editor')).toBeFocused();
  await page.locator('#editor').fill('# Phone');
  await page.locator('#btn-preview-view').click();
  await expect(page.locator('#preview h1')).toBeVisible();
  await expect(page.locator('#editor')).toBeHidden();
  await page.locator('#btn-edit-view').click();
  await expect(page.locator('#editor')).toBeVisible();
});

test('a shared link opens on the document, and Edit switches to the editor', async ({ page }) => {
  await page.goto(`./#d=lz1.${LZString.compressToEncodedURIComponent('# On the train')}`);
  await expect(page.locator('#preview h1')).toHaveText('On the train');
  await expect(page.locator('#editor')).toBeHidden();
  await page.locator('#btn-readonly-edit').click();
  await expect(page.locator('#editor')).toBeFocused();
  await page.keyboard.type('!');
  await expect(page.locator('#readonly-banner')).toBeHidden();
});
