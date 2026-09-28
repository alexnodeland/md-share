import LZString from 'lz-string';
import { editor, expect, preview, shareUrl, test, typeDoc } from './fixtures.ts';

test('a share link round-trips content and flavor, then forks on edit', async ({
  browser,
  page,
}) => {
  await page.goto('./');
  await page.locator('#flavor-select').selectOption('obsidian');
  await typeDoc(page, '# Shared\n\n==marked== text');
  const url = await shareUrl(page);
  expect(url).toMatch(/#d=(df1|lz1)\./);

  const reader = await browser.newPage();
  await reader.goto(url);
  await expect(reader.locator('#readonly-banner')).toBeVisible();
  await expect(reader.locator('#flavor-select')).toHaveValue('obsidian');
  await expect(reader.locator('#preview mark')).toHaveText('marked');

  await reader.locator('#editor').press('End');
  await reader.keyboard.type('!');
  await expect(reader.locator('#readonly-banner')).toBeHidden();
  expect(new URL(reader.url()).hash).toBe('');
  await reader.close();
});

test('CommonMark links stay CommonMark for readers who prefer another flavor', async ({ page }) => {
  await page.goto('./');
  await typeDoc(page, '==not a highlight==');
  const url = await shareUrl(page);
  await page.locator('#flavor-select').selectOption('obsidian');
  await page.goto(url);
  await expect(page.locator('#flavor-select')).toHaveValue('commonmark');
  await expect(preview(page).locator('mark')).toHaveCount(0);
});

test('legacy ?d= lz-string links still open', async ({ page }) => {
  const payload = LZString.compressToEncodedURIComponent('# Legacy link');
  await page.goto(`./?d=${payload}&f=gfm`);
  await expect(preview(page).locator('h1')).toHaveText('Legacy link');
  await expect(page.locator('#flavor-select')).toHaveValue('gfm');
});

test('an unreadable link says so and cleans the URL', async ({ page }) => {
  await page.goto('./#d=df1.not-a-real-payload');
  await expect(page.locator('#toast')).toContainText('Could not read that shared link');
  expect(new URL(page.url()).hash).toBe('');
});

test('pasting a new link into an open tab loads it', async ({ page }) => {
  await page.goto('./');
  await typeDoc(page, '# Second document');
  const url = await shareUrl(page);
  await typeDoc(page, '# First');
  await page.evaluate((hash) => {
    window.location.hash = hash;
  }, new URL(url).hash);
  await expect(preview(page).locator('h1')).toHaveText('Second document');
});

test('TOC links scroll without dropping the payload', async ({ page }) => {
  await page.goto('./');
  await page.locator('#sample-select').selectOption('extended');
  const url = await shareUrl(page);
  await page.goto(url);
  await page.locator('.toc-container a').last().click();
  expect(page.url()).toBe(url);
  await page.reload();
  await expect(page.locator('#readonly-banner')).toBeVisible();
});

test('opening a shared link keeps the previous draft in Recent versions', async ({ page }) => {
  await page.goto('./');
  await typeDoc(page, '# My precious draft');

  const link = `./#d=lz1.${LZString.compressToEncodedURIComponent('# Someone else')}`;
  await page.goto(link);
  await editor(page).press('End');
  await page.keyboard.type('x');
  await page.waitForTimeout(350);

  await page.goto('./');
  await expect(editor(page)).toHaveValue('# Someone elsex');
  await page.locator('#btn-history').click();
  await page.locator('#history-menu .history-item', { hasText: 'My precious draft' }).click();
  await expect(editor(page)).toHaveValue('# My precious draft');
});
