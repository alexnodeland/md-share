import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures.ts';

test('HTML export is a styled, titled standalone page', async ({ page }) => {
  await page.goto('./');
  await page.locator('#sample-select').selectOption('academic');
  await page.locator('[data-dropdown="export-menu"]').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#btn-export-html').click(),
  ]);
  expect(download.suggestedFilename()).toBe('academic-flavor-demo.html');
  const html = await readFile((await download.path()) ?? '', 'utf8');
  expect(html).toContain('<title>Academic Flavor Demo</title>');
  expect(html).toMatch(/cdn\.jsdelivr\.net\/npm\/katex@[\d.]+\/dist\/katex\.min\.css/);
  expect(html).toContain('.rendered');
  expect(html).not.toContain('class="heading-anchor"');
});

test('Markdown export downloads the source under the document title', async ({ page }) => {
  await page.goto('./');
  await page.locator('#editor').fill('---\ntitle: Trip Plan\n---\nbody');
  await page.locator('[data-dropdown="export-menu"]').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#btn-export-md').click(),
  ]);
  expect(download.suggestedFilename()).toBe('trip-plan.md');
});

test('Word export carries structure, numbering, and the rendered diagram', async ({ page }) => {
  const JSZip = (await import('jszip')).default;
  await page.goto('./');
  await page.locator('#sample-select').selectOption('gfm');
  await expect(page.locator('#preview .mermaid-container svg')).toHaveCount(1);
  await page.locator('[data-dropdown="export-menu"]').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#btn-export-docx').click(),
  ]);
  expect(download.suggestedFilename()).toBe('md-share.docx');
  const zip = await JSZip.loadAsync(await readFile((await download.path()) ?? ''));
  const doc = (await zip.file('word/document.xml')?.async('string')) ?? '';
  expect(doc).toContain('w:val="Heading1"');
  expect(doc).toContain('<w:numPr>');
  expect(doc).toContain('Syntax highlighting');
  expect(doc).toContain('w:val="SourceCode"');
  const media = Object.keys(zip.files).filter((f) => f.startsWith('word/media/'));
  expect(media.length).toBeGreaterThanOrEqual(1); // the mermaid diagram, rasterized
  await expect(page.locator('#toast')).toContainText('Word document exported');
});

test('LaTeX export keeps citations, references, and the bibliography', async ({ page }) => {
  await page.goto('./');
  await page.locator('#sample-select').selectOption('academic');
  await page.locator('[data-dropdown="export-menu"]').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#btn-export-tex').click(),
  ]);
  expect(download.suggestedFilename()).toBe('academic-flavor-demo.tex');
  const tex = await readFile((await download.path()) ?? '', 'utf8');
  expect(tex).toContain('\\title{Academic Flavor Demo}');
  expect(tex).toContain('Knuth~\\cite{knuth84}');
  expect(tex).toContain('Equation~\\eqref{eq:gauss}');
  expect(tex).toContain('\\begin{thebibliography}{3}');
  await expect(page.locator('#toast')).toContainText('LaTeX exported');
});
