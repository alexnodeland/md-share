import { editor, expect, test, typeDoc } from './fixtures.ts';

test('the document check lists problems and jumps to their line', async ({ page }) => {
  await page.goto('./');
  const badge = page.locator('#btn-lint');
  await typeDoc(page, '# Title\n\nClean paragraph.');
  await expect(badge).toBeHidden();

  await typeDoc(page, '# Title\n\n### Skipped a level\n\n![](photo.png)\n\n[see](#missing)');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText('3 issues');

  await badge.click();
  const items = page.locator('#lint-menu .lint-item');
  await expect(items).toHaveCount(3);
  await expect(items.nth(1)).toContainText('Line 5');
  await expect(items.nth(1)).toContainText('Image has no alt text');

  await items.nth(1).click();
  await expect(editor(page)).toBeFocused();
  const selected = await editor(page).evaluate((el: HTMLTextAreaElement) =>
    el.value.slice(el.selectionStart, el.selectionEnd),
  );
  expect(selected).toBe('![](photo.png)');

  await typeDoc(page, '# Title\n\n## Fixed\n\n![A photo](photo.png)\n\n[see](#fixed)');
  await expect(badge).toBeHidden();
});
