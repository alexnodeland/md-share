import { readFile } from 'node:fs/promises';
import { editor, expect, test, typeDoc } from './fixtures.ts';

const DOC = '# Trip plan\n\n![Map](data:image/png;base64,AAAA)\n\nPack light.';

test('Send file… hands a .md file to the share sheet when it takes files', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { shared: { title: string; name: string; text: string }[] };
    w.shared = [];
    Object.defineProperty(navigator, 'canShare', { value: () => true });
    Object.defineProperty(navigator, 'share', {
      value: async ({ title, files }: { title: string; files: File[] }) => {
        w.shared.push({ title, name: files[0]!.name, text: await files[0]!.text() });
      },
    });
  });
  await page.goto('./');
  await typeDoc(page, DOC);
  await page.locator('#btn-link').click();
  await page.locator('#btn-link-file').click();
  await expect(page.locator('#link-modal')).not.toHaveClass(/open/);
  const shared = await page.evaluate(() => (window as unknown as { shared: unknown[] }).shared);
  expect(shared).toEqual([{ title: 'Trip plan', name: 'trip-plan.md', text: DOC }]);
});

test('Send file… downloads the .md where the share sheet takes no files', async ({ page }) => {
  await page.goto('./');
  await typeDoc(page, DOC);
  await page.locator('#btn-link').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#btn-link-file').click(),
  ]);
  expect(download.suggestedFilename()).toBe('trip-plan.md');
  expect(await readFile((await download.path()) ?? '', 'utf8')).toBe(DOC);
  await expect(page.locator('#toast')).toContainText('Downloaded trip-plan.md');
});

test('a file shared into the installed app (POST share target) becomes the document', async ({
  page,
}) => {
  await page.goto('./');
  await typeDoc(page, '# Earlier draft');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled by the service worker
  const landed = await page.evaluate(async () => {
    const form = new FormData();
    form.append('title', 'ignored when a file comes along');
    form.append(
      'file',
      new File(['# From another app\n\nShared as a file.'], 'notes.md', { type: 'text/markdown' }),
    );
    const res = await fetch('./share-target', { method: 'POST', body: form });
    return res.url;
  });
  expect(landed).toMatch(/\?shared=1$/);
  await page.goto(landed);
  await expect(editor(page)).toHaveValue('# From another app\n\nShared as a file.');
  await expect(page.locator('#toast')).toContainText('Added from share');
  expect(new URL(page.url()).search).toBe('');
  // Read once: opening ?shared=1 again finds nothing waiting.
  await page.goto('./?shared=1');
  await expect.poll(() => new URL(page.url()).search).toBe('');
  await expect(editor(page)).toHaveValue('# From another app\n\nShared as a file.');
});
