import { editor, expect, preview, test, typeDoc } from './fixtures.ts';

// A stand-in for the File System Access pickers that records what gets written.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as {
      writes: { name: string; text: string }[];
      showOpenFilePicker: unknown;
      showSaveFilePicker: unknown;
    };
    w.writes = [];
    const handle = (name: string, content: string) => ({
      name,
      getFile: async () => new File([content], name, { type: 'text/markdown' }),
      createWritable: async () => {
        let text = '';
        return {
          write: async (chunk: string) => {
            text += chunk;
          },
          close: async () => {
            w.writes.push({ name, text });
          },
        };
      },
    });
    w.showOpenFilePicker = async () => [handle('notes.md', '# Notes\n\nFirst draft')];
    w.showSaveFilePicker = async (o: { suggestedName: string }) => handle(o.suggestedName, '');
  });
});

const writes = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { writes: unknown[] }).writes);

test('a file opened in place saves back with Ctrl+S', async ({ page }) => {
  await page.goto('./');
  await page.locator('#btn-open').click();
  await expect(editor(page)).toHaveValue('# Notes\n\nFirst draft');
  const chip = page.locator('#file-status');
  await expect(chip).toHaveText('notes.md');

  await editor(page).press('ControlOrMeta+End');
  await page.keyboard.type(', revised');
  await expect(chip).toHaveText('notes.md •');
  await page.keyboard.press('ControlOrMeta+s');
  await expect(chip).toHaveText('notes.md');
  await expect(page.locator('#toast')).toContainText('Saved notes.md');
  await expect(page.locator('#link-modal')).toBeHidden();
  expect(await writes(page)).toEqual([
    { name: 'notes.md', text: '# Notes\n\nFirst draft, revised' },
  ]);
});

test('replacing the document unlinks the file; Ctrl+S shares again', async ({ page }) => {
  await page.goto('./');
  await page.locator('#btn-open').click();
  await expect(page.locator('#file-status')).toBeVisible();
  await page.locator('#sample-select').selectOption('gfm');
  await expect(page.locator('#file-status')).toBeHidden();
  await page.keyboard.press('ControlOrMeta+s');
  await expect(page.locator('#link-modal')).toBeVisible();
  expect(await writes(page)).toEqual([]);
});

test('Save to file… writes a new file named after the title and links it', async ({ page }) => {
  await page.goto('./');
  await typeDoc(page, '# Trip plan\n\nPack light');
  await expect(preview(page).locator('h1')).toHaveText('Trip plan');
  await page.locator('[data-dropdown="export-menu"]').click();
  await page.locator('#btn-save-file').click();
  await expect(page.locator('#file-status')).toHaveText('trip-plan.md');
  expect(await writes(page)).toEqual([{ name: 'trip-plan.md', text: '# Trip plan\n\nPack light' }]);
});
