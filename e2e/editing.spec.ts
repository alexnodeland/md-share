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

const pasteClipboard = (page: import('@playwright/test').Page, data: Record<string, string>) =>
  editor(page).evaluate((el, items) => {
    const dt = new DataTransfer();
    for (const [type, value] of Object.entries(items)) dt.setData(type, value);
    el.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
    );
  }, data);

test('pasting rich text (Google Docs) inserts Markdown', async ({ page }) => {
  await page.goto('./');
  await editor(page).focus();
  await pasteClipboard(page, {
    'text/plain': 'Plan\nRead the docs first.',
    'text/html':
      '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1"><h2>Plan</h2><p>Read <a href="https://x.dev">the docs</a> <span style="font-weight:700">first</span>.</p></b>',
  });
  await expect(editor(page)).toHaveValue('## Plan\n\nRead [the docs](https://x.dev) **first**.');
  await expect(page.locator('#toast')).toContainText('Pasted as Markdown');
});

// A synthetic paste isn't inserted by the browser, so "left for the browser
// to paste as plain text" shows up as an untouched editor.
test('code-editor HTML is left as plain text', async ({ page }) => {
  await page.goto('./');
  await editor(page).focus();
  await pasteClipboard(page, {
    'text/plain': 'const x = 1;',
    'text/html': '<div style="color:#d4d4d4"><span style="color:#569cd6">const</span> x = 1;</div>',
  });
  await expect(editor(page)).toHaveValue('');
});

test('Mod+Shift+V skips the Markdown conversion', async ({ page }) => {
  await page.goto('./');
  await editor(page).focus();
  await editor(page).evaluate((el) => {
    el.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'V', ctrlKey: true, shiftKey: true, bubbles: true }),
    );
  });
  await pasteClipboard(page, { 'text/plain': 'Title', 'text/html': '<h1>Title</h1>' });
  await expect(editor(page)).toHaveValue('');
});
