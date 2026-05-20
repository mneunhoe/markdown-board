import { InMemoryAdapter } from '@markdown-board/core';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';

import VaultApp from '../src/VaultApp.svelte';
import type { VaultAdapter, VaultPlatform, VaultWatcher } from '../src/lib/platform.js';

// A VaultAdapter is a core FileAdapter + getMtime. InMemoryAdapter covers
// the FileAdapter surface; the shell only needs a monotonic getMtime for
// the watcher baseline, so a counter suffices.
class TestVaultAdapter extends InMemoryAdapter implements VaultAdapter {
  private clock = 1;
  getMtime(): Promise<number> {
    return Promise.resolve(this.clock++);
  }
}

// A watcher that satisfies the contract but never fires — the shell's
// mount/teardown path is what we exercise here, not external reload.
const noopWatcher: VaultWatcher = {
  start() {},
  setBaseline() {},
  dispose() {},
};

function makeFakePlatform(
  adapter: VaultAdapter | null,
  overrides: Partial<VaultPlatform> = {},
): VaultPlatform {
  return {
    isSupported: () => true,
    pickVault: () => Promise.resolve(adapter),
    createWatcher: () => noopWatcher,
    ...overrides,
  };
}

describe('VaultApp (shell, injected platform)', () => {
  afterEach(() => {
    localStorage.removeItem('markdown-board:settings');
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders the brand and Settings button before a vault is open', () => {
    const { container } = render(VaultApp, { props: { platform: makeFakePlatform(null) } });
    expect(container.querySelector('.brand')?.textContent?.trim()).toBe('markdown-board');
    expect(container.querySelector('[data-testid="open-settings"]')).toBeTruthy();
  });

  it('shows the pick-vault empty state when the platform is supported', () => {
    const { container } = render(VaultApp, { props: { platform: makeFakePlatform(null) } });
    expect(container.querySelector('.empty-title')?.textContent?.trim()).toBe('No vault open');
    expect(container.querySelector('[data-testid="pick-vault"]')).toBeTruthy();
  });

  it('loads and renders a vault picked through the injected platform', async () => {
    const adapter = new TestVaultAdapter({
      'TASKS.md': '## Active\n- [ ] Wire the desktop shell\n',
      'library/alpha.md': '# Alpha\n',
    });
    const { container } = render(VaultApp, {
      props: { platform: makeFakePlatform(adapter) },
    });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="pick-vault"]')!,
    );
    await waitFor(() => expect(container.querySelector('.tab-bar')).toBeTruthy());
    expect(container.querySelector('[data-active="board"]')).toBeTruthy();
    expect(container.textContent).toContain('Wire the desktop shell');
    expect(container.querySelector('[data-testid="reopen-vault"]')).toBeTruthy();
  });

  it('stays on the empty state when the picker resolves null (cancelled)', async () => {
    const { container } = render(VaultApp, { props: { platform: makeFakePlatform(null) } });
    const pickBtn = container.querySelector<HTMLButtonElement>('[data-testid="pick-vault"]');
    await fireEvent.click(pickBtn!);
    await waitFor(() => expect(pickBtn!.disabled).toBe(false));
    expect(container.querySelector('.empty-title')?.textContent?.trim()).toBe('No vault open');
    expect(container.querySelector('[role=alert]')).toBeNull();
  });

  it('surfaces a pickVault failure via role=alert', async () => {
    const platform = makeFakePlatform(null, {
      pickVault: () => Promise.reject(new Error('disk on fire')),
    });
    const { container } = render(VaultApp, { props: { platform } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="pick-vault"]')!,
    );
    await waitFor(() =>
      expect(container.querySelector('[role=alert]')?.textContent).toContain('disk on fire'),
    );
  });

  it('shows the unsupported empty state when the platform is unsupported', () => {
    const platform = makeFakePlatform(null, {
      isSupported: () => false,
      unsupportedMessage: { title: 'Not here', hint: 'Try the desktop app.' },
    });
    const { container } = render(VaultApp, { props: { platform } });
    expect(container.querySelector('.empty-title')?.textContent?.trim()).toBe('Not here');
    expect(container.querySelector('[data-testid="pick-vault"]')).toBeNull();
  });
});
