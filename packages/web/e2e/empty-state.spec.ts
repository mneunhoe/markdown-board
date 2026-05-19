import { expect, test } from '@playwright/test';

test.describe('empty state', () => {
  test('renders the brand + No vault open empty state on first load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.brand')).toHaveText('markdown-board');
    await expect(page.locator('.empty-title')).toHaveText('No vault open');
    await expect(page.locator('[data-testid="pick-vault"]')).toBeVisible();
    await expect(page.locator('[data-testid="open-settings"]')).toBeVisible();
  });

  test('Settings button is visible before a vault is open', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="open-settings"]')).toBeVisible();
  });
});
