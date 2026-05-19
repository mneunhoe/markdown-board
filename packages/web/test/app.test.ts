import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import App from '../src/App.svelte';
import { MockDirectoryHandle, seedVault } from './helpers/mock-fsa.js';

type WindowWithPicker = Window & {
  showDirectoryPicker?: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<unknown>;
};

function installPicker(handle: MockDirectoryHandle): void {
  (window as WindowWithPicker).showDirectoryPicker = async () => handle;
}

function installCancellingPicker(): void {
  (window as WindowWithPicker).showDirectoryPicker = async () => {
    throw new DOMException('User dismissed.', 'AbortError');
  };
}

function removePicker(): void {
  delete (window as WindowWithPicker).showDirectoryPicker;
}

describe('App (web shell)', () => {
  afterEach(() => {
    removePicker();
    localStorage.removeItem('markdown-board:settings');
    document.documentElement.removeAttribute('data-theme');
  });

  it('always renders the brand title', () => {
    const { container } = render(App);
    expect(container.querySelector('.brand')?.textContent?.trim()).toBe('markdown-board');
  });

  it('always renders the Settings button (even before a vault is open)', () => {
    const { container } = render(App);
    expect(container.querySelector('[data-testid="open-settings"]')).toBeTruthy();
  });

  it('clicking Settings opens the SettingsModal', async () => {
    const { container } = render(App);
    expect(container.querySelector('[data-testid="theme-system"]')).toBeNull();
    const settingsBtn = container.querySelector<HTMLButtonElement>('[data-testid="open-settings"]');
    await fireEvent.click(settingsBtn!);
    expect(container.querySelector('[data-testid="theme-system"]')).toBeTruthy();
  });

  it('switching theme to dark sets data-theme on the document', async () => {
    const { container } = render(App);
    const settingsBtn = container.querySelector<HTMLButtonElement>('[data-testid="open-settings"]');
    await fireEvent.click(settingsBtn!);
    const darkRadio = container.querySelector<HTMLInputElement>('[data-testid="theme-dark"]');
    await fireEvent.click(darkRadio!);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('persists the chosen theme to localStorage', async () => {
    const { container } = render(App);
    const settingsBtn = container.querySelector<HTMLButtonElement>('[data-testid="open-settings"]');
    await fireEvent.click(settingsBtn!);
    const lightRadio = container.querySelector<HTMLInputElement>('[data-testid="theme-light"]');
    await fireEvent.click(lightRadio!);
    const stored = localStorage.getItem('markdown-board:settings');
    expect(stored).toContain('"theme":"light"');
  });

  describe('without File System Access API support', () => {
    beforeEach(() => {
      removePicker();
    });

    it('shows the unsupported-browser empty state', () => {
      const { container } = render(App);
      const title = container.querySelector('.empty-title');
      expect(title?.textContent?.trim()).toBe('File System Access API not supported');
    });

    it('does not show the pick-vault button', () => {
      const { container } = render(App);
      expect(container.querySelector('[data-testid="pick-vault"]')).toBeNull();
    });
  });

  describe('with File System Access API support', () => {
    beforeEach(() => {
      installPicker(new MockDirectoryHandle());
    });

    it('shows the "Pick a vault folder" empty state', () => {
      const { container } = render(App);
      const title = container.querySelector('.empty-title');
      expect(title?.textContent?.trim()).toBe('No vault open');
      expect(container.querySelector('[data-testid="pick-vault"]')).toBeTruthy();
    });

    it('loads and renders a vault when the user picks one', async () => {
      installPicker(
        seedVault({
          'TASKS.md': '## Active\n- [ ] Write tests\n',
          'library/alpha.md': '# Alpha\n',
        }),
      );
      const { container } = render(App);
      const pickBtn = container.querySelector<HTMLButtonElement>('[data-testid="pick-vault"]');
      await fireEvent.click(pickBtn!);
      await waitFor(() => {
        expect(container.querySelector('.tab-bar')).toBeTruthy();
      });
      // Board view is the default.
      expect(container.querySelector('[data-active="board"]')).toBeTruthy();
      // The single Active task surfaces in the rendered board.
      expect(container.textContent).toContain('Write tests');
      // The topbar reopen button is now visible.
      expect(container.querySelector('[data-testid="reopen-vault"]')).toBeTruthy();
    });

    it('stays on the empty state if the user cancels the picker', async () => {
      installCancellingPicker();
      const { container } = render(App);
      const pickBtn = container.querySelector<HTMLButtonElement>('[data-testid="pick-vault"]');
      await fireEvent.click(pickBtn!);
      await waitFor(() => {
        expect(pickBtn!.disabled).toBe(false);
      });
      expect(container.querySelector('.empty-title')?.textContent?.trim()).toBe('No vault open');
      expect(container.querySelector('[role=alert]')).toBeNull();
    });

    it('surfaces non-cancel errors via role=alert', async () => {
      (window as WindowWithPicker).showDirectoryPicker = async () => {
        throw new Error('disk on fire');
      };
      const { container } = render(App);
      const pickBtn = container.querySelector<HTMLButtonElement>('[data-testid="pick-vault"]');
      await fireEvent.click(pickBtn!);
      await waitFor(() => {
        expect(container.querySelector('[role=alert]')?.textContent).toContain('disk on fire');
      });
    });

    // Note: the autosave + external-watcher wiring inside App.svelte is
    // exercised through the unit tests for the pieces (`Autosaver`,
    // `ExternalChangeWatcher`, `moveTask` / `moveColumn`) and through a
    // manual browser pass against ~/Desktop/claude_life. A render-and-
    // synthetic-mutation integration test is impractical at slice 4 —
    // the move handlers live inside the rendered tree and the DnD
    // gesture path requires pragmatic-dnd's real DOM event sequence,
    // which happy-dom can't replay faithfully. Slice 5 will add a
    // Playwright suite that drives the full UI in a real browser.
  });
});
