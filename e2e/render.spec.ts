import { editor, expect, preview, test, typeDoc } from './fixtures.ts';

const SAMPLES = [
  'commonmark',
  'extended',
  'academic',
  'gfm',
  'obsidian',
  'atlassian',
  'presentation',
];

test.describe('samples', () => {
  for (const sample of SAMPLES) {
    test(`${sample} renders cleanly with a working TOC`, async ({ page }) => {
      await page.goto('./');
      await page.locator('#sample-select').selectOption(sample);
      await expect(preview(page).locator('h1').first()).toBeVisible();
      const diagrams = await preview(page).locator('.mermaid-container').count();
      await expect(preview(page).locator('.mermaid-container svg')).toHaveCount(diagrams);
      await expect(preview(page).locator('.render-error, .katex-error')).toHaveCount(0);
      const hrefs = await preview(page)
        .locator('.toc-container a')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
      expect(hrefs.length).toBeGreaterThanOrEqual(3);
      for (const href of hrefs) {
        await expect(page.locator(`[id="${decodeURIComponent(href.slice(1))}"]`)).toHaveCount(1);
      }
    });
  }

  test('math renders in academic without the MathML fallback showing', async ({ page }) => {
    await page.goto('./');
    await page.locator('#sample-select').selectOption('academic');
    const mathml = preview(page).locator('.katex-mathml').first();
    await expect(mathml).toBeAttached();
    await expect(mathml).toHaveCSS('position', 'absolute');
  });
});

test('raw HTML and crafted fences cannot run script', async ({ page }) => {
  await page.goto('./');
  await page.locator('#flavor-select').selectOption('gfm');
  await page.evaluate(() => {
    (window as unknown as { pwned: number }).pwned = 0;
  });
  await typeDoc(
    page,
    [
      '## <img src=x onerror="window.pwned++">',
      '## b',
      '## c',
      '<img src=y onerror="window.pwned++">',
      '<a id="js" href="javascript:window.pwned++">x</a>',
      '```mermaid x',
      '<img src=z onerror="window.pwned++">',
      '```',
    ].join('\n'),
  );
  await page.locator('#js').click();
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as unknown as { pwned: number }).pwned)).toBe(0);
});

test('empty preview offers samples that load with their flavor', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.preview-empty')).toBeVisible();
  await page.locator('.preview-empty-sample[data-sample="obsidian"]').click();
  await expect(page.locator('#flavor-select')).toHaveValue('obsidian');
  await expect(page).toHaveTitle('Obsidian Flavor Demo · md-share');
  await expect(editor(page)).toHaveValue(/# Obsidian Flavor Demo/);
});

test('theme toggle switches and persists', async ({ page }) => {
  await page.goto('./');
  const before = await page.locator('html').getAttribute('data-theme');
  await page.locator('#btn-theme').click();
  const after = await page.locator('html').getAttribute('data-theme');
  expect(after).not.toBe(before);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', after ?? '');
});

test('code grammars load on demand, aliases included', async ({ page }) => {
  await page.goto('./');
  await typeDoc(
    page,
    [
      '```js',
      'const x = 1;',
      '```',
      '',
      '```clj',
      '(defn f [x] x)',
      '```',
      '',
      '```',
      'plain',
      '```',
    ].join('\n'),
  );
  const blocks = preview(page).locator('pre code');
  await expect(blocks.nth(0).locator('.hljs-keyword')).toHaveText('const');
  await expect(blocks.nth(1).locator('[class^="hljs-"]').first()).toBeAttached();
  await expect(blocks.nth(2).locator('[class^="hljs-"]')).toHaveCount(0);
  // The editor mirror picks up the same grammar.
  await expect(page.locator('#editor-mirror .hljs-keyword', { hasText: 'const' })).toBeAttached();
});

// Shared links unfurl in chat apps from the page's own metadata: the
// document rides in the fragment, which never reaches them.
test('the page says what md-share is, for tabs and link previews', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('md-share — send Markdown as a link');
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    'content',
    /Markdown document as a link/,
  );
});

// Mermaid's defaults move between majors (v12: ELK layout, shadowed "neo"
// look). app.ts pins the classic look; this notices if a bump undoes it.
test('diagrams keep the classic look: curved edges, no shadows', async ({ page }) => {
  await page.goto('./');
  await page.locator('#sample-select').selectOption('gfm');
  const svg = preview(page).locator('.mermaid-container svg').first();
  await expect(svg).toBeVisible();
  const edges = await svg
    .locator('.flowchart-link, path[class*="edge"]')
    .evaluateAll((paths) => paths.map((p) => p.getAttribute('d') ?? ''));
  expect(edges.length).toBeGreaterThan(0);
  expect(edges.some((d) => d.includes('C'))).toBe(true);
  expect(await svg.locator('[filter*="drop-shadow"], [style*="drop-shadow"]').count()).toBe(0);
});
