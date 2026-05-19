const { test, expect } = require('playwright/test');

test('loads the promo materials workspace', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/index.html');
  await expect(page.getByRole('heading', { name: '素材预览' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '预览区' })).toBeVisible();
  await expect(page.locator('#materialCard')).toBeVisible();
  await expect(page.locator('#downloadButton')).toBeVisible();
  await expect(page.locator('#downloadButton')).toBeDisabled();
  await expect(page.locator('#generateButton')).toBeDisabled();
  await expect(page.locator('#helpButton')).toBeVisible();

  await page.locator('#styleSwitchButton').click();
  await expect(page.locator('#styleSwitchModal')).toHaveClass(/open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#styleSwitchModal')).not.toHaveClass(/open/);

  expect(pageErrors).toEqual([]);
});
