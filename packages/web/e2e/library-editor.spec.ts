import { expect, test } from '@playwright/test';

import { getVaultFiles, installMockFsa } from './helpers/mock-fsa.js';

// Slice 6d — library editor modal. Each spec opens the mock vault,
// switches to the Library tab, performs an edit / new-file flow, and
// asserts the resulting library/**.md bytes.

test.describe('Library editor modal (slice 6d)', () => {
  test('editing an existing library file writes the textarea content verbatim', async ({
    page,
  }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n',
      'library/alpha.md': '# Alpha\n\nold body\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await expect(page.locator('.tab-bar')).toBeVisible();
    await page.locator('[data-tab="library"]').click();

    await page.locator('[data-testid="library-edit-library/alpha.md"]').click();
    await expect(page.locator('[data-testid="library-editor-textarea"]')).toBeVisible();

    const textarea = page.locator('[data-testid="library-editor-textarea"]');
    await textarea.fill('# Alpha\n\nnew body\n');
    await page.locator('[data-testid="library-editor-save"]').click();
    // Modal closes on save.
    await expect(page.locator('[data-testid="library-editor-textarea"]')).toBeHidden();

    const files = await getVaultFiles(page);
    expect(files['library/alpha.md']).toBe('# Alpha\n\nnew body\n');
  });

  test('cancelling the editor leaves the file unchanged', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n',
      'library/alpha.md': '# Alpha\n\nkeep me\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await page.locator('[data-tab="library"]').click();

    await page.locator('[data-testid="library-edit-library/alpha.md"]').click();
    await page.locator('[data-testid="library-editor-textarea"]').fill('discarded');
    await page.locator('[data-testid="library-editor-cancel"]').click();

    const files = await getVaultFiles(page);
    expect(files['library/alpha.md']).toBe('# Alpha\n\nkeep me\n');
  });

  test('"+ New file" creates a file at the chosen directory + filename', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n',
      'library/alpha.md': '# Alpha\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await page.locator('[data-tab="library"]').click();

    await page.locator('[data-testid="library-new"]').click();
    await expect(page.locator('[data-testid="library-new-dir"]')).toBeVisible();

    await page.locator('[data-testid="library-new-dir"]').fill('library/projects');
    await page.locator('[data-testid="library-new-name"]').fill('beta');
    await page.locator('[data-testid="library-editor-textarea"]').fill('# Beta\n\nfresh body\n');
    await page.locator('[data-testid="library-editor-save"]').click();

    const files = await getVaultFiles(page);
    expect(files['library/projects/beta.md']).toBe('# Beta\n\nfresh body\n');
  });

  test('the new file appears in the Library view after save', async ({ page }) => {
    await installMockFsa(page, {
      'TASKS.md': '## Active\n',
      'library/alpha.md': '# Alpha\n',
    });

    await page.goto('/');
    await page.locator('[data-testid="pick-vault"]').click();
    await page.locator('[data-tab="library"]').click();

    await page.locator('[data-testid="library-new"]').click();
    await page.locator('[data-testid="library-new-dir"]').fill('library');
    await page.locator('[data-testid="library-new-name"]').fill('gamma');
    await page.locator('[data-testid="library-editor-textarea"]').fill('# Gamma\n');
    await page.locator('[data-testid="library-editor-save"]').click();

    // The new doc should be reflected in the rendered LibraryView.
    await expect(page.locator('.library-doc-title')).toHaveCount(2);
    await expect(page.locator('.library-doc-title').last()).toHaveText('Gamma');
  });
});
