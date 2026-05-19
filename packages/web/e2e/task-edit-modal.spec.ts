import { expect, test } from '@playwright/test';

import { getVaultFiles, installMockFsa } from './helpers/mock-fsa.js';

// Slice 6e — full task edit modal (pencil button → form + raw markdown).

const AUTOSAVE_FLUSH_MS = 800;

test.describe('Full task edit modal (slice 6e)', () => {
  test('form-tab Save persists all fields to TASKS.md in one autosave', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Old title\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.card-title')).toHaveText('Old title');

    // Hover the card to reveal the pencil, then click.
    await page.locator('.task-card').first().hover();
    await page.locator('[data-testid="task-full-edit"]').first().click();
    await expect(page.locator('[data-testid="task-edit-title"]')).toBeVisible();

    await page.locator('[data-testid="task-edit-title"]').fill('New title');
    await page.locator('[data-testid="task-edit-note"]').fill('see backlog');
    await page.locator('[data-testid="task-edit-project"]').fill('PSD_GAN');
    await page.locator('[data-testid="task-edit-day-Wed"]').click();
    await page.locator('[data-testid="task-edit-priority-blocker"]').click();
    await page.locator('[data-testid="task-edit-pomodoros"]').fill('3');

    await page.locator('[data-testid="task-edit-subtask-add"]').click();
    await page.locator('[data-testid="task-edit-subtask-text-0"]').fill('subtask one');

    await page.locator('[data-testid="task-edit-save"]').click();
    await expect(page.locator('[data-testid="task-edit-title"]')).toBeHidden();

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    const md = files['TASKS.md'] ?? '';
    expect(md).toContain('[P0]');
    expect(md).toContain('[project:PSD_GAN]');
    expect(md).toContain('[Wed]');
    expect(md).toContain('[pom:3]');
    expect(md).toContain('New title');
    expect(md).toContain(' - see backlog');
    expect(md).toMatch(/^ {2}- \[ \] subtask one$/m);
    expect(md).not.toContain('Old title');
  });

  test('Cancel reverts all in-modal changes and does not write', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Keep me\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await page.locator('.task-card').first().hover();
    await page.locator('[data-testid="task-full-edit"]').first().click();

    await page.locator('[data-testid="task-edit-title"]').fill('discarded');
    await page.locator('[data-testid="task-edit-cancel"]').click();

    await expect(page.locator('.card-title')).toHaveText('Keep me');
    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).toContain('Keep me');
    expect(files['TASKS.md']).not.toContain('discarded');
  });

  test('raw-markdown tab parses tokens and saves the updated task', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Original\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await page.locator('.task-card').first().hover();
    await page.locator('[data-testid="task-full-edit"]').first().click();

    await page.locator('[data-testid="task-edit-tab-raw"]').click();
    const raw = page.locator('[data-testid="task-edit-raw"]');
    await raw.fill('- [ ] **[P1] [Fri] Rewritten** - note here');
    await page.locator('[data-testid="task-edit-save"]').click();

    await expect(page.locator('.card-title')).toHaveText('Rewritten');

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    const md = files['TASKS.md'] ?? '';
    expect(md).toContain('[P1]');
    expect(md).toContain('[Fri]');
    expect(md).toContain('Rewritten');
    expect(md).toContain(' - note here');
    expect(md).not.toContain('Original');
  });

  test('raw-markdown tab with bad input shows an error and does not save', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Untouched\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await page.locator('.task-card').first().hover();
    await page.locator('[data-testid="task-full-edit"]').first().click();
    await page.locator('[data-testid="task-edit-tab-raw"]').click();

    const raw = page.locator('[data-testid="task-edit-raw"]');
    await raw.fill('not a task line');
    await page.locator('[data-testid="task-edit-save"]').click();

    await expect(page.locator('[data-testid="task-edit-raw-error"]')).toBeVisible();
    // Modal stays open; the underlying card is unchanged.
    await expect(page.locator('[data-testid="task-edit-raw"]')).toBeVisible();
  });
});
