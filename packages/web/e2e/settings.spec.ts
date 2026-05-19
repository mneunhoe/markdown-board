import { expect, test } from '@playwright/test';

// Each Playwright test gets a fresh browser context by default, so
// localStorage starts empty per case — no beforeEach clear needed.
// (An init-script clear would re-fire on every page.reload(), defeating
// the persistence test.)

test.describe('settings shell', () => {
  test('opens the modal and switches to Dark theme', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="open-settings"]').click();
    await expect(page.locator('[data-testid="theme-dark"]')).toBeVisible();

    await page.locator('[data-testid="theme-dark"]').check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('switching to Light removes the data-theme attribute', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="open-settings"]').click();
    await page.locator('[data-testid="theme-dark"]').check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.locator('[data-testid="theme-light"]').check();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/);
  });

  test('persists the chosen theme across reloads', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="open-settings"]').click();
    await page.locator('[data-testid="theme-dark"]').check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    // Theme should be applied before the app even mounts (main.ts).
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('closing the modal hides the radio group', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="open-settings"]').click();
    await expect(page.locator('[data-testid="theme-system"]')).toBeVisible();
    await page.locator('.modal-close').click();
    await expect(page.locator('[data-testid="theme-system"]')).toBeHidden();
  });
});
