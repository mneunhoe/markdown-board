import { expect, test } from '@playwright/test';

import { getVaultFiles, installMockFsa } from './helpers/mock-fsa.js';

// Slice 6a — TaskCard editor mode + delete + subtask. Each test opens the
// mock vault, performs one mutation, then asserts the resulting
// TASKS.md bytes (after waiting for the 500 ms autosave debounce).

const AUTOSAVE_FLUSH_MS = 800;

test.describe('TaskCard editor mode (slice 6a)', () => {
  test('inline-edits the title and writes a single-intent diff to TASKS.md', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Old title\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.tab-bar')).toBeVisible();

    await page.locator('[data-testid="task-title"]').first().click();
    const input = page.locator('[data-testid="task-title-input"]');
    await expect(input).toBeVisible();
    await input.fill('New title');
    await input.press('Enter');

    await expect(page.locator('.card-title')).toHaveText('New title');

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).toContain('- [ ] **New title**');
    expect(files['TASKS.md']).not.toContain('Old title');
  });

  test('Escape during title edit reverts and does not autosave', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Keep me\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.card-title')).toHaveText('Keep me');

    await page.locator('[data-testid="task-title"]').first().click();
    const input = page.locator('[data-testid="task-title-input"]');
    await input.fill('discarded');
    await input.press('Escape');

    await expect(page.locator('.card-title')).toHaveText('Keep me');

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).toContain('Keep me');
    expect(files['TASKS.md']).not.toContain('discarded');
  });

  test('adding a note via "+ Add note" persists', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] A task\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.card-title')).toHaveText('A task');

    await page.locator('[data-testid="task-note-add"]').first().click();
    const input = page.locator('[data-testid="task-note-input"]');
    await input.fill('see backlog item 4');
    await input.press('Enter');

    await expect(page.locator('.card-note')).toHaveText('see backlog item 4');

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    // Per grammar §3.5, the note is appended to the title line with " - ".
    expect(files['TASKS.md']).toMatch(/^- \[ \] \*\*A task\*\* - see backlog item 4/m);
  });

  test('adds a subtask and persists the indented "  - [ ]" line', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Parent\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.card-title')).toHaveText('Parent');

    await page.locator('[data-testid="subtask-add"]').first().click();
    const input = page.locator('[data-testid="subtask-add-input"]');
    await input.fill('first subtask');
    await input.press('Enter');

    await expect(page.locator('.card-subtasks li').first()).toContainText('first subtask');

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).toMatch(/^ {2}- \[ \] first subtask$/m);
  });

  test('toggling a subtask checkbox flips [ ] → [x] on disk', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Parent\n  - [ ] First sub\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.card-subtasks li').first()).toContainText('First sub');

    await page.locator('[data-testid="subtask-checkbox-0"]').first().click();

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).toMatch(/^ {2}- \[x\] First sub$/m);
  });

  test('editing a subtask to empty deletes it (prototype parity)', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Parent\n  - [ ] First sub\n  - [ ] Second sub\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.card-subtasks li')).toHaveCount(3); // 2 subs + the "+ Add subtask" row.

    await page.locator('[data-testid="subtask-text-0"]').first().click();
    const input = page.locator('[data-testid="subtask-input"]');
    await input.fill('');
    await input.press('Enter');

    await expect(page.locator('.card-subtasks li')).toHaveCount(2); // 1 sub + "+ Add subtask".

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).not.toContain('First sub');
    expect(files['TASKS.md']).toContain('Second sub');
  });

  test('deletes a task and removes its line from TASKS.md', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Goodbye\n- [ ] Stays\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.card-title')).toHaveCount(2);

    // Hover the first card to reveal the delete button, then click.
    const firstCard = page.locator('.task-card').first();
    await firstCard.hover();
    await firstCard.locator('[data-testid="task-delete"]').click();

    await expect(page.locator('.card-title')).toHaveCount(1);
    await expect(page.locator('.card-title')).toHaveText('Stays');

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).not.toContain('Goodbye');
    expect(files['TASKS.md']).toContain('Stays');
  });
});
