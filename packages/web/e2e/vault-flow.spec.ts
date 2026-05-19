import { expect, test } from '@playwright/test';

import { getVaultFiles, installMockFsa } from './helpers/mock-fsa.js';

test.describe('vault open + resolve flow', () => {
  test('picks a vault, renders the board, and resolves a task into archive/TASKS.md', async ({
    page,
  }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] [P0] Write spec\n',
    });

    await page.goto('/');
    await expect(page.locator('.empty-title')).toHaveText('No vault open');

    // Pick the (mocked) vault.
    await page.locator('[data-testid="pick-vault"]').click();

    // Tab bar appears once the vault is mounted and parsed.
    await expect(page.locator('.tab-bar')).toBeVisible();
    await expect(page.locator('[data-active="board"]')).toBeVisible();

    // The single Active task surfaces in the board.
    await expect(page.locator('.card-title')).toHaveText('Write spec');

    // Click the checkbox to open the resolve modal.
    await page.locator('.card-checkbox.interactive').first().click();
    await expect(page.locator('[data-testid="resolve-task-title"]')).toHaveText('Write spec');

    // Add a resolution note + confirm.
    await page.locator('[data-testid="resolve-textarea"]').fill('Shipped on day 1');
    await page.locator('[data-testid="resolve-confirm"]').click();

    // Modal closes; the task disappears from the board.
    await expect(page.locator('[data-testid="resolve-task-title"]')).toBeHidden();
    await expect(page.locator('.card-title')).toHaveCount(0);

    // archive/TASKS.md was written with a §6.4-shaped entry.
    const files = await getVaultFiles(page);
    expect(files['archive/TASKS.md']).toContain('# Archived Tasks');
    // Slice 6f: archived task-grammar shape — H2 carries timestamp +
    // original section, body is a regular `- [x]` task line with the
    // resolution as the inline note.
    expect(files['archive/TASKS.md']).toMatch(/## \d{4}-\d{2}-\d{2} \d{2}:\d{2} — Active/);
    expect(files['archive/TASKS.md']).toContain(
      '- [x] **[P0] Write spec** - [res: Shipped on day 1]',
    );
  });

  test('cancelling the resolve modal leaves the task in place', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Keep me\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.card-title')).toHaveText('Keep me');

    await page.locator('.card-checkbox.interactive').first().click();
    await expect(page.locator('[data-testid="resolve-task-title"]')).toHaveText('Keep me');

    await page.locator('[data-testid="resolve-cancel"]').click();
    await expect(page.locator('[data-testid="resolve-task-title"]')).toBeHidden();
    await expect(page.locator('.card-title')).toHaveText('Keep me');

    const files = await getVaultFiles(page);
    expect(files['archive/TASKS.md']).toBeUndefined();
  });

  test('switching tabs renders the List view', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Alpha\n- [ ] Bravo\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('[data-active="board"]')).toBeVisible();

    await page.locator('[data-tab="list"]').click();
    await expect(page.locator('[data-active="list"]')).toBeVisible();
    await expect(page.locator('.list-section .card-title')).toHaveCount(2);
  });
});
