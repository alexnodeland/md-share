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
