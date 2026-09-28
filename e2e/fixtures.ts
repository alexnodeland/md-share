import { test as base, expect, type Page } from '@playwright/test';

/**
 * Every test fails on an uncaught page error, and runs offline from web
 * fonts so results don't depend on the network.
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
      await use(errors);
      expect(errors, 'uncaught page errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const editor = (page: Page) => page.locator('#editor');
export const preview = (page: Page) => page.locator('#preview');

/** Replace the editor text and wait for the debounced render. */
export const typeDoc = async (page: Page, text: string): Promise<void> => {
  await editor(page).fill(text);
  await page.waitForTimeout(350);
};

/** Open the share dialog and read the generated URL. */
export const shareUrl = async (page: Page): Promise<string> => {
  await page.locator('#btn-link').click();
  const box = page.locator('#link-url');
  await expect(box).toContainText('#d=');
  const url = (await box.textContent()) ?? '';
  await page.locator('#btn-link-close').click();
  return url;
};

/** Hide the File System Access pickers, as in Firefox and Safari: Open… falls back to a file input. */
export const withoutFileAccess = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showOpenFilePicker', { value: undefined });
    Object.defineProperty(window, 'showSaveFilePicker', { value: undefined });
  });
};
