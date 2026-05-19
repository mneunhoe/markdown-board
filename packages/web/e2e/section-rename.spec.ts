import { expect, test } from '@playwright/test';

import { getVaultFiles, installMockFsa } from './helpers/mock-fsa.js';

// Slice 6c — section (column) rename on the Board view + on the List
// view's section header.

const AUTOSAVE_FLUSH_MS = 800;

test.describe('Section rename (slice 6c)', () => {
  test('Board view: renaming a column rewrites the ## H2 heading in TASKS.md', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Task\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('[data-testid="column-title"]')).toHaveText('Active');

    await page.locator('[data-testid="column-title"]').first().click();
    const input = page.locator('[data-testid="column-rename-input"]');
    await expect(input).toBeVisible();
    await input.fill('On Deck');
    await input.press('Enter');

    await expect(page.locator('[data-testid="column-title"]')).toHaveText('On Deck');

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).toContain('## On Deck');
    expect(files['TASKS.md']).not.toContain('## Active');
  });

  test('Board view: Escape during column rename reverts and does not autosave', async ({
    page,
  }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Task\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();

    await page.locator('[data-testid="column-title"]').first().click();
    const input = page.locator('[data-testid="column-rename-input"]');
    await input.fill('discarded');
    await input.press('Escape');

    await expect(page.locator('[data-testid="column-title"]')).toHaveText('Active');

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).toContain('## Active');
    expect(files['TASKS.md']).not.toContain('discarded');
  });

  test('List view: renaming a section header rewrites the H2 in TASKS.md', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Task\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await page.locator('[data-tab="list"]').click();
    await expect(page.locator('[data-testid="list-section-title"]')).toHaveText('Active');

    await page.locator('[data-testid="list-section-title"]').first().click();
    const input = page.locator('[data-testid="list-section-rename-input"]');
    await expect(input).toBeVisible();
    await input.fill('Doing');
    await input.press('Enter');

    await expect(page.locator('[data-testid="list-section-title"]')).toHaveText('Doing');

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).toContain('## Doing');
    expect(files['TASKS.md']).not.toContain('## Active');
  });

  test('Board view: rename collision surfaces an error and leaves the section unchanged', async ({
    page,
  }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] First\n\n## Done\n- [x] Second\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();

    await page.locator('[data-testid="column-title"]').first().click();
    const input = page.locator('[data-testid="column-rename-input"]');
    await input.fill('Done');
    await input.press('Enter');

    // The first section should still be "Active" — collision rejected.
    await expect(page.locator('[data-testid="column-title"]').first()).toHaveText('Active');
    await expect(page.locator('[role=alert]')).toContainText('already exists');
  });
});
