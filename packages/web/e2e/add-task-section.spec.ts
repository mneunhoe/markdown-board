import { expect, test } from '@playwright/test';

import { getVaultFiles, installMockFsa } from './helpers/mock-fsa.js';

// Slice 6i — add task + add section affordances.

const AUTOSAVE_FLUSH_MS = 800;

test.describe('Add task + Add Section (slice 6i)', () => {
  test('clicking "+ Add task" in a column appends a new `- [ ]` line to TASKS.md', async ({
    page,
  }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Existing\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.tab-bar')).toBeVisible();

    await page.locator('[data-testid="column-add-task"]').first().click();
    const input = page.locator('[data-testid="column-add-task-input"]');
    await expect(input).toBeVisible();
    await input.fill('  Fresh task  ');
    await input.press('Enter');

    // The new card shows up at the bottom of the column.
    await expect(page.locator('.card-title')).toHaveCount(2);
    await expect(page.locator('.card-title').last()).toHaveText('Fresh task');

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).toMatch(/^- \[ \] \*\*Fresh task\*\*/m);
  });

  test('Escape during add-task reverts and does not autosave', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Existing\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();

    await page.locator('[data-testid="column-add-task"]').first().click();
    const input = page.locator('[data-testid="column-add-task-input"]');
    await input.fill('discarded');
    await input.press('Escape');

    await expect(page.locator('.card-title')).toHaveCount(1);
    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).not.toContain('discarded');
  });

  test('clicking "+ Add Section" on the Board appends a new ## H2 to TASKS.md', async ({
    page,
  }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Existing\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();

    await page.locator('[data-testid="board-add-section"]').click();
    const input = page.locator('[data-testid="board-add-section-input"]');
    await input.fill('On Deck');
    await input.press('Enter');

    // The new column shows up to the right of the existing one.
    await expect(page.locator('[data-testid="column-title"]')).toHaveCount(2);
    await expect(page.locator('[data-testid="column-title"]').last()).toHaveText('On Deck');

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).toContain('## On Deck');
  });

  test('section-name collision surfaces a role=alert and leaves the board unchanged', async ({
    page,
  }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Existing\n\n## Done\n- [x] Old\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();

    await page.locator('[data-testid="board-add-section"]').click();
    const input = page.locator('[data-testid="board-add-section-input"]');
    await input.fill('Done');
    await input.press('Enter');

    await expect(page.locator('[role=alert]')).toContainText('already exists');
    await expect(page.locator('[data-testid="column-title"]')).toHaveCount(2);
  });

  test('List view: clicking "+ Add Section" at the bottom appends an H2', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Existing\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await page.locator('[data-tab="list"]').click();

    await page.locator('[data-testid="list-add-section"]').click();
    const input = page.locator('[data-testid="list-add-section-input"]');
    await input.fill('Doing');
    await input.press('Enter');

    await expect(page.locator('[data-testid="list-section-title"]')).toHaveCount(2);
    await expect(page.locator('[data-testid="list-section-title"]').last()).toHaveText('Doing');

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).toContain('## Doing');
  });

  test('add-section works on an empty vault (no EmptyState, just the placeholder)', async ({
    page,
  }) => {
    await installMockFsa(page, {
      'TASKS.md': '',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.tab-bar')).toBeVisible();

    await page.locator('[data-testid="board-add-section"]').click();
    const input = page.locator('[data-testid="board-add-section-input"]');
    await input.fill('Active');
    await input.press('Enter');

    await expect(page.locator('[data-testid="column-title"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="column-title"]').first()).toHaveText('Active');

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).toContain('## Active');
  });
});
