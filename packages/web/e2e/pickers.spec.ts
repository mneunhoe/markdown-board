import { expect, test } from '@playwright/test';

import { getVaultFiles, installMockFsa } from './helpers/mock-fsa.js';

// Slice 6b — priority cycling + project picker + day picker. Each test
// opens the mock vault, performs one mutation, then asserts the
// resulting TASKS.md tokens.

const AUTOSAVE_FLUSH_MS = 800;

test.describe('Priority cycling, project picker, day picker (slice 6b)', () => {
  test('clicking the empty priority "·" cycles through to [P0] / blocker', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Task\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.card-title')).toHaveText('Task');

    // Hover to reveal the priority-empty affordance, then click.
    await page.locator('.task-card').first().hover();
    await page.locator('[data-testid="priority-cycle"]').first().click();

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).toContain('[P0]');
  });

  test('clicking an existing priority badge advances to the next tier', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] **[P0] Task**\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.priority-badge')).toHaveText('P0');

    await page.locator('[data-testid="priority-cycle"]').first().click();
    await expect(page.locator('.priority-badge')).toHaveText('P1');

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).toContain('[P1]');
    expect(files['TASKS.md']).not.toContain('[P0]');
  });

  test('project picker writes [project:Name] to TASKS.md', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Task\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.card-title')).toHaveText('Task');

    await page.locator('.task-card').first().hover();
    await page.locator('[data-testid="project-add"]').first().click();
    await expect(page.locator('[data-testid="project-picker-input"]')).toBeVisible();
    await page.locator('[data-testid="project-picker-input"]').fill('PSD_GAN');
    await page.locator('[data-testid="project-picker-confirm"]').click();

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).toContain('[project:PSD_GAN]');
  });

  test('project picker with empty input clears the project tag', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] **[project:Foo] Task**\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('[data-testid="project-pill"]')).toHaveText('Foo');

    await page.locator('[data-testid="project-pill"]').first().click();
    const input = page.locator('[data-testid="project-picker-input"]');
    await expect(input).toHaveValue('Foo');
    await input.fill('');
    await page.locator('[data-testid="project-picker-confirm"]').click();

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).not.toContain('[project:Foo]');
  });

  test('day picker writes [Day] to TASKS.md', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] Task\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.card-title')).toHaveText('Task');

    await page.locator('.task-card').first().hover();
    await page.locator('[data-testid="day-add"]').first().click();
    await expect(page.locator('[data-testid="day-picker-grid"]')).toBeVisible();
    await page.locator('[data-testid="day-picker-Wed"]').click();

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).toContain('[Wed]');
  });

  test('day picker Clear button removes the [Day] token', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n- [ ] **[Mon] Task**\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('[data-testid="day-chip"]')).toHaveText('Mon');

    await page.locator('[data-testid="day-chip"]').first().click();
    await page.locator('[data-testid="day-picker-clear"]').click();

    await page.waitForTimeout(AUTOSAVE_FLUSH_MS);
    const files = await getVaultFiles(page);
    expect(files['TASKS.md']).not.toContain('[Mon]');
  });
});
