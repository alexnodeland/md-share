import { editor, expect, test, typeDoc } from './fixtures.ts';

test('heading links autocomplete from the document outline', async ({ page }) => {
  await page.goto('./');
  await typeDoc(page, '# Guide\n\n## Installation\n\n## Usage\n\nSee ');
  await editor(page).press('End');
  await page.keyboard.type('[setup](#ins');
  const list = page.locator('#editor-completions');
  await expect(list).toBeVisible();
  await expect(list.locator('[role="option"]')).toHaveCount(1);
  await expect(list.locator('[aria-selected="true"]')).toContainText('Installation');
  await page.keyboard.press('Enter');
  await expect(list).toBeHidden();
  await expect(editor(page)).toHaveValue(/See \[setup\]\(#installation\)$/);
});

test('footnote references autocomplete from definitions; arrows and Esc work', async ({ page }) => {
  await page.goto('./');
  await page.locator('#flavor-select').selectOption('extended');
  await typeDoc(page, 'Claim\n\n[^source]: A\n[^second]: B');
  await editor(page).evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(5, 5));
  await page.keyboard.type('[^s');
  const options = page.locator('#editor-completions [role="option"]');
  await expect(options).toHaveCount(2);
  await page.keyboard.press('ArrowDown');
  await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#editor-completions')).toBeHidden();
  await page.keyboard.type('e');
  await expect(page.locator('#editor-completions')).toBeHidden(); // stays dismissed for this reference

  await page.keyboard.type(' again [^');
  await expect(options).toHaveCount(2);
  await options.nth(1).click();
  await expect(editor(page)).toHaveValue(/^Claim\[\^se again \[\^second\]/);
});
