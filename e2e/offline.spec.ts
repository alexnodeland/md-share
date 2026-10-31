import { expect, preview, test } from './fixtures.ts';

// PHILOSOPHY §1: after one visit, the service worker keeps md-share working offline.
test('the app and its lazy chunks keep working offline after one visit', async ({
  context,
  page,
}) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled by the service worker
  await page.locator('#sample-select').selectOption('academic');
  await expect(preview(page).locator('.katex').first()).toBeVisible();
  await expect(preview(page).locator('.mermaid-container svg')).toHaveCount(1);

  await context.setOffline(true);
  await page.reload();
  await expect(preview(page).locator('h1').first()).toHaveText('Academic Flavor Demo');
  await expect(preview(page).locator('.katex').first()).toBeVisible();
  await expect(preview(page).locator('.mermaid-container svg')).toHaveCount(1);
});

// "Nothing leaves your browser": loading the app talks to no other origin, and
// the fonts it draws with are its own, so they are cached for offline too.
test('the app loads without third-party requests and with its own fonts', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (req) => requested.push(req.url()));
  await page.goto('./');
  await page.locator('#sample-select').selectOption('gfm');
  await expect(preview(page).locator('h1').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() =>
    [...document.fonts]
      .filter((f) => f.status === 'loaded')
      .map((f) => f.family.replaceAll('"', ''))
      .filter((family, i, all) => all.indexOf(family) === i)
      .sort(),
  );
  expect(loaded).toEqual(['JetBrains Mono', 'Source Serif 4']);
  const origin = new URL(page.url()).origin;
  const foreign = requested.filter((u) => u.startsWith('http') && new URL(u).origin !== origin);
  expect(foreign).toEqual([]);
});
