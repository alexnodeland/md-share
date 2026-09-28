import { editor, expect, preview, shareUrl, test, typeDoc } from './fixtures.ts';

test('the share dialog produces an embed snippet that renders the document alone', async ({
  page,
  browser,
}) => {
  await page.goto('./');
  await page.locator('#flavor-select').selectOption('gfm');
  await typeDoc(page, '# Embedded\n\n- [ ] not clickable here');
  await page.locator('#btn-link').click();
  await page.locator('#link-embed-check').check();
  await expect(page.locator('#btn-link-copy')).toHaveText('Copy embed code');
  // The box re-renders after the link is recompressed; wait for the snippet.
  await expect(page.locator('#link-url')).toContainText('<iframe');
  const snippet = (await page.locator('#link-url').textContent()) ?? '';
  expect(snippet).toMatch(/^<iframe src="[^"]+&amp;e=1" title="Embedded"/);
  const src = snippet.match(/src="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&') ?? '';

  const viewer = await browser.newPage();
  await viewer.goto(src);
  await expect(viewer.locator('#preview h1')).toHaveText('Embedded');
  await expect(viewer.locator('.topbar')).toBeHidden();
  await expect(viewer.locator('#editor')).toBeHidden();
  await expect(viewer.locator('#readonly-banner')).toBeHidden();
  const open = viewer.locator('#embed-open');
  await expect(open).toBeVisible();
  expect(await open.getAttribute('href')).not.toContain('e=1');
  // Readers can't tick checkboxes into the author's embed.
  await viewer.locator('#preview input[type=checkbox]').dispatchEvent('click');
  await viewer.waitForTimeout(200);
  await expect(viewer.locator('#editor')).toHaveValue(/- \[ \] not clickable/);
  await viewer.close();
});

test('an embed never touches the viewer’s own draft', async ({ page }) => {
  await page.goto('./');
  await typeDoc(page, '# My draft');
  await typeDoc(page, '# Shown in an embed');
  const url = `${await shareUrl(page)}&e=1`;
  await typeDoc(page, '# My draft');
  await page.goto(url);
  await expect(preview(page).locator('h1')).toHaveText('Shown in an embed');
  await page.goto('./');
  await expect(editor(page)).toHaveValue('# My draft');
});

test('text shared from another app (Web Share Target) becomes the document', async ({ page }) => {
  await page.goto('./');
  await typeDoc(page, '# Earlier draft');
  await page.goto('./?title=Trip&text=Pack%20light&url=https%3A%2F%2Fexample.com%2Ftrip');
  await expect(editor(page)).toHaveValue('# Trip\n\nPack light\n\nhttps://example.com/trip');
  await expect(page.locator('#toast')).toContainText('Added from share');
  expect(new URL(page.url()).search).toBe('');
  await page.locator('#btn-history').click();
  await expect(page.locator('#history-menu .history-item').first()).toContainText('Earlier draft');
});
