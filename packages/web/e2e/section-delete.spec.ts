import { expect, test } from '@playwright/test';

import { getVaultFiles, installMockFsa } from './helpers/mock-fsa.js';

const AUTOSAVE_FLUSH_MS = 800;

test.describe('Delete empty section (slice 6j)', () => {
  test('hover-revealed × on an empty column deletes the section + H2', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Stay\n\n## Doing\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.tab-bar')).toBeVisible();
    await expect(page.locator('[data-testid="column-title"]')).toHaveCount(2);

    // Hover the empty "Doing" column to reveal × and click it.
    const doingColumn = page.locator('.column').nth(1);
    await doingColumn.hover();
    await doingColumn.locator('[data-testid="column-delete"]').click();

    await expect(page.locator('[data-testid="column-title"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="column-title"]')).toHaveText('Active');

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).not.toContain('## Doing');
    expect(files['TASKS.md']).toContain('## Active');
    expect(files['TASKS.md']).toContain('Stay');
  });

  test('× is not rendered on columns with open tasks', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Stay\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.column')).toHaveCount(1);
    await page.locator('.column').first().hover();
    await expect(page.locator('[data-testid="column-delete"]')).toHaveCount(0);
  });

  test('× is not rendered on columns with archived refs', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n',
      'archive/TASKS.md':
        '# Archived Tasks\n\n## 2026-05-18 10:00 — Active\n\n- [x] **Old** <!-- id:cafe0001 -->\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await page.locator('.column').first().hover();
    // The column has zero open tasks but has an archived ref.
    await expect(page.locator('[data-testid="column-delete"]')).toHaveCount(0);
    // The expander confirms there's an archive ref under this column.
    await expect(page.locator('[data-testid="archived-toggle"]')).toBeVisible();
  });

  test('List view: × on an empty section deletes the H2', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Stay\n\n## Doing\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await page.locator('[data-tab="list"]').click();
    await expect(page.locator('[data-testid="list-section-title"]')).toHaveCount(2);

    const doingSection = page.locator('.list-section').nth(1);
    await doingSection.hover();
    await doingSection.locator('[data-testid="list-section-delete"]').click();

    await expect(page.locator('[data-testid="list-section-title"]')).toHaveCount(1);

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).not.toContain('## Doing');
  });
});
