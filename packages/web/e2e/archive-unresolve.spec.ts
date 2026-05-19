import { expect, test } from '@playwright/test';

import { getVaultFiles, installMockFsa } from './helpers/mock-fsa.js';

const AUTOSAVE_FLUSH_MS = 800;

test.describe('Archived tasks in Done column (slice 6g)', () => {
  test('opens a vault with an existing archive and renders the Archived expander', async ({
    page,
  }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Open\n',
      'archive/TASKS.md':
        '# Archived Tasks\n\nResolved tasks moved out of `TASKS.md` by the dashboard.\n\n' +
        '## 2026-05-18 10:00 — Active\n\n' +
        '- [x] **Old shipped** <!-- id:cafe0001 -->\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.tab-bar')).toBeVisible();

    const toggle = page.locator('[data-testid="archived-toggle"]').first();
    await expect(toggle).toHaveText(/Archived \(1\)/);

    // Collapsed by default — the card body isn't in the DOM yet.
    await expect(page.locator('[data-testid="archived-list"]')).toHaveCount(0);

    await toggle.click();
    await expect(page.locator('[data-testid="archived-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="archived-meta"]').first()).toHaveText(
      'Archived 2026-05-18 10:00',
    );
    await expect(page.getByText('Old shipped')).toBeVisible();
  });

  test('resolving a task appears in the source column Archived expander in the same frame', async ({
    page,
  }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Live task\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.card-title').first()).toHaveText('Live task');

    // Resolve via the checkbox click → modal.
    await page.locator('.card-checkbox.interactive').first().click();
    await page.locator('[data-testid="resolve-textarea"]').fill('done');
    await page.locator('[data-testid="resolve-confirm"]').click();

    // The Active column now shows "Archived (1)" — same render frame.
    const toggle = page.locator('[data-testid="archived-toggle"]').first();
    await expect(toggle).toHaveText(/Archived \(1\)/);
    await toggle.click();
    await expect(page.getByText('Live task')).toBeVisible();
  });

  test('clicking ↺ on an archived card moves it back to the active list', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Open\n',
      'archive/TASKS.md':
        '# Archived Tasks\n\nResolved tasks moved out of `TASKS.md` by the dashboard.\n\n' +
        '## 2026-05-18 10:00 — Active\n\n' +
        '- [x] **Restoreme** <!-- id:cafe1234 -->\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await page.locator('[data-testid="archived-toggle"]').first().click();

    // The archived card is visible inside the expander.
    const archivedRow = page.locator('[data-testid="archived-list"] .task-card').first();
    await expect(archivedRow).toContainText('Restoreme');
    // Hover to reveal ↺ and click.
    await archivedRow.hover();
    await page.locator('[data-testid="task-unresolve"]').first().click();

    // The Archived expander disappears (no archived rows left).
    await expect(page.locator('[data-testid="archived-toggle"]')).toHaveCount(0);
    // "Restoreme" now shows up as an open task at the top of Active.
    await expect(page.locator('.card-title').first()).toHaveText('Restoreme');

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['archive/TASKS.md']).not.toContain('<!-- id:cafe1234 -->');
    expect(files['TASKS.md']).toContain('- [ ] **Restoreme**');
  });

  test('unresolving an orphan (source section gone) surfaces the role=alert fallback', async ({
    page,
  }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Open\n',
      'archive/TASKS.md':
        '# Archived Tasks\n\n' +
        '## 2026-05-18 10:00 — Gone\n\n' +
        '- [x] **Orphan task** <!-- id:cafe9999 -->\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    // The orphan lands in the first section (Active) by fallback.
    await page.locator('[data-testid="archived-toggle"]').first().click();
    const archivedRow = page.locator('[data-testid="archived-list"] .task-card').first();
    await expect(archivedRow).toContainText('Orphan task');

    await archivedRow.hover();
    await page.locator('[data-testid="task-unresolve"]').first().click();

    await expect(page.locator('[role=alert]')).toContainText('Gone');
    // The orphan ends up at the top of Active anyway.
    await expect(page.locator('.card-title').first()).toHaveText('Orphan task');
  });

  test('archived cards have no edit / delete / pencil affordances — only ↺', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Open\n',
      'archive/TASKS.md':
        '# Archived Tasks\n\n' +
        '## 2026-05-18 10:00 — Active\n\n' +
        '- [x] **Locked** <!-- id:cafe0007 -->\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await page.locator('[data-testid="archived-toggle"]').first().click();

    const archivedRow = page.locator('[data-testid="archived-list"] .task-card').first();
    await archivedRow.hover();
    // The ↺ button is present.
    await expect(archivedRow.locator('[data-testid="task-unresolve"]')).toBeVisible();
    // The delete / pencil / inline-edit affordances are absent.
    await expect(archivedRow.locator('[data-testid="task-delete"]')).toHaveCount(0);
    await expect(archivedRow.locator('[data-testid="task-full-edit"]')).toHaveCount(0);
    await expect(archivedRow.locator('button.card-title')).toHaveCount(0);
  });
});
