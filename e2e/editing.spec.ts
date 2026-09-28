import { editor, expect, preview, test, typeDoc } from './fixtures.ts';

test('checkbox clicks toggle the right source line after frontmatter and comments', async ({
  page,
}) => {
  await page.goto('./');
  await page.locator('#flavor-select').selectOption('obsidian');
  await typeDoc(page, '---\ntitle: T\n---\n%%\nhidden\n%%\n- [ ] first\n- [ ] second');
  await preview(page).locator('input[type=checkbox]').nth(1).click();
  await expect(editor(page)).toHaveValue(/- \[ \] first\n- \[x\] second$/);
});

test('Tab and Shift+Tab indent and outdent the selected lines', async ({ page }) => {
  await page.goto('./');
  await typeDoc(page, 'one\ntwo\nthree');
  await editor(page).evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 7));
  await editor(page).press('Tab');
  await expect(editor(page)).toHaveValue('  one\n  two\nthree');
  await editor(page).press('Shift+Tab');
  await expect(editor(page)).toHaveValue('one\ntwo\nthree');
});

test('Esc then Tab moves focus out of the editor', async ({ page }) => {
  await page.goto('./');
  await editor(page).focus();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  await expect(editor(page)).not.toBeFocused();
});

test('Clear is undoable through Recent versions', async ({ page }) => {
  await page.goto('./');
  await typeDoc(page, '# Keep me');
  await page.locator('#btn-clear').click();
  await expect(editor(page)).toHaveValue('');
  await page.locator('#btn-history').click();
  await page.locator('#history-menu .history-item').first().click();
  await expect(editor(page)).toHaveValue('# Keep me');
});

test('find and replace-all handle case-insensitive matches exactly', async ({ page }) => {
  await page.goto('./');
  await typeDoc(page, 'İİ foo FOO');
  await editor(page).press('ControlOrMeta+f');
  await page.locator('#find-input').fill('foo');
  await page.locator('#find-input').press('ControlOrMeta+f');
  await page.locator('#find-replace-input').fill('X');
  await page.locator('#find-replace-all').click();
  await expect(editor(page)).toHaveValue('İİ X X');
});
