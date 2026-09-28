import { buildSampleDocx } from '../tests/adapters/docxFixture.ts';
import { editor, expect, preview, test, withoutFileAccess } from './fixtures.ts';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// The file-input path (Firefox, Safari); opening in place is in files.spec.ts.
test.beforeEach(({ page }) => withoutFileAccess(page));

test('Open… imports a Word document as Markdown', async ({ page }) => {
  await page.goto('./');
  const chooser = page.waitForEvent('filechooser');
  await page.locator('#btn-open').click();
  await (await chooser).setFiles({
    name: 'plan.docx',
    mimeType: DOCX_MIME,
    buffer: Buffer.from(await buildSampleDocx()),
  });
  await expect(editor(page)).toHaveValue(/^# Quarterly Plan/);
  await expect(editor(page)).toHaveValue(/Ship \*\*fast\*\* and \*well\*/);
  await expect(editor(page)).toHaveValue(/\| Owner \| Due \|/);
  await expect(page.locator('#toast')).toContainText('Imported plan.docx — 1 image embedded');
  // Word output is GFM: CommonMark readers are moved to GitHub so tables render.
  await expect(page.locator('#flavor-select')).toHaveValue('gfm');
  await expect(preview(page).locator('table td').first()).toHaveText('Ada');
  await expect(preview(page).locator('img')).toHaveCount(1);
});

test('Open… loads a Markdown file and rejects unsupported ones', async ({ page }) => {
  await page.goto('./');
  let chooser = page.waitForEvent('filechooser');
  await page.locator('#btn-open').click();
  await (await chooser).setFiles({
    name: 'notes.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# From disk'),
  });
  await expect(preview(page).locator('h1')).toHaveText('From disk');

  chooser = page.waitForEvent('filechooser');
  await page.locator('#btn-open').click();
  await (await chooser).setFiles({
    name: 'deck.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF'),
  });
  await expect(page.locator('#toast')).toContainText(
    'Open a Markdown, text, Word (.docx), or image file',
  );
  await expect(preview(page).locator('h1')).toHaveText('From disk');
});

test('importing keeps the replaced text in Recent versions', async ({ page }) => {
  await page.goto('./');
  await editor(page).fill('# Before import');
  await page.waitForTimeout(300);
  const chooser = page.waitForEvent('filechooser');
  await page.locator('#btn-open').click();
  await (await chooser).setFiles({
    name: 'n.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# After'),
  });
  await expect(preview(page).locator('h1')).toHaveText('After');
  await page.locator('#btn-history').click();
  await expect(page.locator('#history-menu .history-item').first()).toContainText('Before import');
});
