import { InMemoryAdapter } from '@markdown-board/core';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import VaultApp from '../src/VaultApp.svelte';
import type {
  ExternalOpenHandler,
  RecentVault,
  VaultAdapter,
  VaultPlatform,
  VaultWatcher,
  WatcherDeps,
} from '../src/lib/platform.js';

// A VaultAdapter is a core FileAdapter + getMtime. InMemoryAdapter covers the
// FileAdapter surface; getMtime returns a write-stable counter (bumped only on
// write / externalWrite) so it mirrors real fs mtime — required by the
// conflict guard which compares the on-disk mtime against the last synced one.
class TestVaultAdapter extends InMemoryAdapter implements VaultAdapter {
  private mtime = 1;
  override async writeFile(path: string, contents: string): Promise<void> {
    await super.writeFile(path, contents);
    this.mtime += 1;
  }
  override externalWrite(path: string, contents: string): void {
    super.externalWrite(path, contents);
    this.mtime += 1;
  }
  getMtime(): Promise<number> {
    return Promise.resolve(this.mtime);
  }
  async readBinary(path: string): Promise<Uint8Array> {
    return new TextEncoder().encode(await this.readFile(path));
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

  it('activates the pomodoro plugin and mounts its header chip when a vault opens', async () => {
    const adapter = new TestVaultAdapter({ 'TASKS.md': '## Active\n- [ ] A task\n' });
    const { container } = render(VaultApp, { props: { platform: makeFakePlatform(adapter) } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="pick-vault"]')!,
    );
    await waitFor(() => expect(container.querySelector('.tab-bar')).toBeTruthy());
    // The chip is contributed by the first-party pomodoro plugin (loaded via
    // an async dynamic import, which can be slow to transform on first run).
    await waitFor(
      () => expect(container.querySelector('[data-testid="pomodoro-chip"]')).toBeTruthy(),
      { timeout: 5000 },
    );
  });

  it('loads a third-party plugin from a local path: its command appears and runs', async () => {
    const ran = vi.fn();
    const adapter = new TestVaultAdapter({ 'TASKS.md': '## Active\n- [ ] A task\n' });
    // A platform that "discovers" one local plugin (as the desktop loader would).
    const platform = makeFakePlatform(adapter, {
      listLocalPlugins: () =>
        Promise.resolve([
          {
            manifest: {
              id: 'hello',
              name: 'Hello',
              version: '1.0.0',
              entry: 'main.js',
              minAppVersion: '1.0.0',
            },
            load: () =>
              Promise.resolve({
                activate(ctx) {
                  ctx.commands.register('greet', () => ran(), { title: 'Hello: greet' });
                },
              }),
          },
        ]),
    });
    const { container } = render(VaultApp, { props: { platform } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="pick-vault"]')!,
    );
    await waitFor(() => expect(container.querySelector('.tab-bar')).toBeTruthy());

    // The plugin's command shows up in the palette (after async activation).
    await fireEvent.keyDown(window, { key: 'k', metaKey: true });
    const input = container.querySelector<HTMLInputElement>('[data-testid="palette-input"]')!;
    await waitFor(async () => {
      await fireEvent.input(input, { target: { value: 'hello greet' } });
      expect(container.querySelector('[data-testid="palette-item"]')?.textContent).toContain(
        'Hello: greet',
      );
    });
    await fireEvent.click(container.querySelector('[data-testid="palette-item"]')!);
    expect(ran).toHaveBeenCalledOnce();
  });

  it('does not mount the pomodoro chip when the plugin is disabled in settings', async () => {
    localStorage.setItem(
      'markdown-board:settings',
      JSON.stringify({ plugins: { pomodoro: { enabled: false } } }),
    );
    const adapter = new TestVaultAdapter({ 'TASKS.md': '## Active\n- [ ] A task\n' });
    const { container } = render(VaultApp, { props: { platform: makeFakePlatform(adapter) } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="pick-vault"]')!,
    );
    await waitFor(() => expect(container.querySelector('.tab-bar')).toBeTruthy());
    // Give activation a chance to run, then confirm the chip never mounted.
    await Promise.resolve();
    expect(container.querySelector('[data-testid="pomodoro-chip"]')).toBeNull();
  });

  it('opens the command palette on Cmd-K and switches view via a command', async () => {
    const adapter = new TestVaultAdapter({ 'TASKS.md': '## Active\n- [ ] A task\n' });
    const { container } = render(VaultApp, { props: { platform: makeFakePlatform(adapter) } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="pick-vault"]')!,
    );
    await waitFor(() => expect(container.querySelector('.tab-bar')).toBeTruthy());

    // No palette until the shortcut fires.
    expect(container.querySelector('[data-testid="palette-input"]')).toBeNull();
    await fireEvent.keyDown(window, { key: 'k', metaKey: true });
    const input = container.querySelector<HTMLInputElement>('[data-testid="palette-input"]');
    expect(input).toBeTruthy();

    // Filter to the "Go to List" command and run it.
    await fireEvent.input(input!, { target: { value: 'go to list' } });
    const item = container.querySelector<HTMLButtonElement>('[data-testid="palette-item"]');
    expect(item?.textContent).toContain('Go to List');
    await fireEvent.click(item!);
    await waitFor(() => expect(container.querySelector('[data-active="list"]')).toBeTruthy());
    // Palette closes after running a command.
    expect(container.querySelector('[data-testid="palette-input"]')).toBeNull();
  });

  it('switches view via a default keyboard shortcut (Mod+2 → List)', async () => {
    const adapter = new TestVaultAdapter({ 'TASKS.md': '## Active\n- [ ] A task\n' });
    const { container } = render(VaultApp, { props: { platform: makeFakePlatform(adapter) } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="pick-vault"]')!,
    );
    await waitFor(() => expect(container.querySelector('.tab-bar')).toBeTruthy());
    await fireEvent.keyDown(window, { key: '2', metaKey: true });
    await waitFor(() => expect(container.querySelector('[data-active="list"]')).toBeTruthy());
  });

  it('searches the vault and jumps to a task (opens its editor)', async () => {
    const adapter = new TestVaultAdapter({
      'TASKS.md': '## Active\n- [ ] Wire the desktop shell\n- [ ] Something else\n',
    });
    const { container } = render(VaultApp, { props: { platform: makeFakePlatform(adapter) } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="pick-vault"]')!,
    );
    await waitFor(() => expect(container.querySelector('.tab-bar')).toBeTruthy());

    // Open search via its shortcut, query, and jump to the first result.
    await fireEvent.keyDown(window, { key: 'F', metaKey: true, shiftKey: true });
    const input = container.querySelector<HTMLInputElement>('[data-testid="search-input"]');
    expect(input).toBeTruthy();
    await fireEvent.input(input!, { target: { value: 'desktop' } });
    const item = container.querySelector<HTMLButtonElement>('[data-testid="search-item"]');
    expect(item?.textContent).toContain('Wire the desktop shell');
    await fireEvent.click(item!);
    // Jump closes search and opens the full task editor for that task.
    await waitFor(() => expect(container.querySelector('[data-testid="search-input"]')).toBeNull());
    await waitFor(() => {
      const titleInput = container.querySelector<HTMLInputElement>(
        '[data-testid="task-edit-title"]',
      );
      expect(titleInput?.value).toBe('Wire the desktop shell');
    });
  });

  it('honours a user shortcut override from settings', async () => {
    localStorage.setItem(
      'markdown-board:settings',
      JSON.stringify({ shortcuts: { 'go-overview': 'Mod+9' } }),
    );
    const adapter = new TestVaultAdapter({ 'TASKS.md': '## Active\n- [ ] A task\n' });
    const { container } = render(VaultApp, { props: { platform: makeFakePlatform(adapter) } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="pick-vault"]')!,
    );
    await waitFor(() => expect(container.querySelector('.tab-bar')).toBeTruthy());
    await fireEvent.keyDown(window, { key: '9', metaKey: true });
    await waitFor(() => expect(container.querySelector('[data-active="overview"]')).toBeTruthy());
  });

  it('quick-adds a task via the shortcut and writes it to TASKS.md', async () => {
    const adapter = new TestVaultAdapter({ 'TASKS.md': '## Active\n- [ ] Existing\n' });
    const { container } = render(VaultApp, { props: { platform: makeFakePlatform(adapter) } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="pick-vault"]')!,
    );
    await waitFor(() => expect(container.querySelector('.tab-bar')).toBeTruthy());

    await fireEvent.keyDown(window, { key: 'N', metaKey: true, shiftKey: true });
    const input = container.querySelector<HTMLInputElement>('[data-testid="quick-add-title"]');
    expect(input).toBeTruthy();
    await fireEvent.input(input!, { target: { value: 'Freshly added' } });
    await fireEvent.click(container.querySelector('[data-testid="quick-add-confirm"]')!);

    await waitFor(() =>
      expect(container.querySelector('[data-testid="quick-add-title"]')).toBeNull(),
    );
    await waitFor(() => expect(container.textContent).toContain('Freshly added'));
    await waitFor(async () =>
      expect(await adapter.readFile('TASKS.md')).toContain('Freshly added'),
    );
  });

  it('switching the grammar profile re-saves TASKS.md in the new format', async () => {
    const adapter = new TestVaultAdapter({
      'TASKS.md': '## Active\n- [ ] **[P1] High task** <!-- id:h1 -->\n',
    });
    const { container } = render(VaultApp, { props: { platform: makeFakePlatform(adapter) } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="pick-vault"]')!,
    );
    await waitFor(() => expect(container.querySelector('.tab-bar')).toBeTruthy());

    // Switch the profile via the settings select.
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="open-settings"]')!,
    );
    const select = container.querySelector<HTMLSelectElement>('[data-testid="grammar-profile"]')!;
    await fireEvent.change(select, { target: { value: 'obsidian-tasks' } });

    // The autosave effect re-serialises in the new profile and writes it.
    await waitFor(async () => {
      const written = await adapter.readFile('TASKS.md');
      expect(written).toContain('⏫ High task');
      expect(written).not.toContain('[P1]');
    });
  });

  it('opens a conflict modal when an external edit collides with local edits', async () => {
    const adapter = new TestVaultAdapter({ 'TASKS.md': '## Active\n- [ ] Original\n' });
    let deps: WatcherDeps | undefined;
    const platform = makeFakePlatform(adapter, {
      createWatcher: (_a, d) => {
        deps = d;
        return noopWatcher;
      },
    });
    const { container } = render(VaultApp, { props: { platform } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="pick-vault"]')!,
    );
    await waitFor(() => expect(container.querySelector('.tab-bar')).toBeTruthy());

    // Unsaved local edit (autosave is debounced and won't fire during the test).
    await fireEvent.keyDown(window, { key: 'N', metaKey: true, shiftKey: true });
    await fireEvent.input(container.querySelector('[data-testid="quick-add-title"]')!, {
      target: { value: 'Local edit' },
    });
    await fireEvent.click(container.querySelector('[data-testid="quick-add-confirm"]')!);

    // The file changes out-of-band, then the watcher reports it.
    adapter.externalWrite('TASKS.md', '## Active\n- [ ] External change\n');
    await deps!.onExternalChange();

    await waitFor(() =>
      expect(container.querySelector('[data-testid="conflict-mine"]')).toBeTruthy(),
    );
    expect(container.querySelector('[data-testid="conflict-mine"]')?.textContent).toContain(
      'Local edit',
    );
    expect(container.querySelector('[data-testid="conflict-theirs"]')?.textContent).toContain(
      'External change',
    );

    // Take theirs → the modal closes and the board shows the on-disk version.
    await fireEvent.click(container.querySelector('[data-testid="conflict-take-theirs"]')!);
    await waitFor(() =>
      expect(container.querySelector('[data-testid="conflict-mine"]')).toBeNull(),
    );
    await waitFor(() => expect(container.textContent).toContain('External change'));
    expect(await adapter.readFile('TASKS.md')).toContain('External change');
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

  describe('external-open channel (e.g. desktop drag-and-drop)', () => {
    // Capture the handler the shell registers so the test can drive
    // external-open events the way the desktop DnD wiring would.
    function platformWithExternalOpen(): {
      platform: VaultPlatform;
      emit: ExternalOpenHandler;
    } {
      let captured: ExternalOpenHandler = () => {};
      const platform = makeFakePlatform(null, {
        subscribeExternalOpen: (handler) => {
          captured = handler;
          return () => {};
        },
      });
      return { platform, emit: (event) => captured(event) };
    }

    it('toggles the drop overlay on dragstate events', async () => {
      const { platform, emit } = platformWithExternalOpen();
      const { container } = render(VaultApp, { props: { platform } });
      expect(container.querySelector('[data-testid="drop-overlay"]')).toBeNull();
      await emit({ kind: 'dragstate', active: true });
      expect(container.querySelector('[data-testid="drop-overlay"]')).toBeTruthy();
      await emit({ kind: 'dragstate', active: false });
      expect(container.querySelector('[data-testid="drop-overlay"]')).toBeNull();
    });

    it('mounts a vault pushed through an open event', async () => {
      const adapter = new TestVaultAdapter({ 'TASKS.md': '## Active\n- [ ] Dropped in\n' });
      const { platform, emit } = platformWithExternalOpen();
      const { container } = render(VaultApp, { props: { platform } });
      await emit({ kind: 'open', adapter });
      await waitFor(() => expect(container.querySelector('.tab-bar')).toBeTruthy());
      expect(container.textContent).toContain('Dropped in');
    });

    it('surfaces an external-open error via role=alert and clears the overlay', async () => {
      const { platform, emit } = platformWithExternalOpen();
      const { container } = render(VaultApp, { props: { platform } });
      await emit({ kind: 'dragstate', active: true });
      await emit({ kind: 'error', message: 'Drop a folder, not a file, to open it as a vault.' });
      expect(container.querySelector('[data-testid="drop-overlay"]')).toBeNull();
      expect(container.querySelector('[role=alert]')?.textContent).toContain('Drop a folder');
    });
  });

  describe('recent vaults', () => {
    it('does not render the recents list when the platform offers none', () => {
      const { container } = render(VaultApp, { props: { platform: makeFakePlatform(null) } });
      expect(container.querySelector('[data-testid="recent-vaults"]')).toBeNull();
    });

    it('renders recent vaults and reopens one on click', async () => {
      const adapter = new TestVaultAdapter({ 'TASKS.md': '## Active\n- [ ] From recents\n' });
      const platform = makeFakePlatform(null, {
        listRecentVaults: () => [{ path: '/Users/me/alpha', name: 'alpha' }],
        openRecentVault: (path) => Promise.resolve(path === '/Users/me/alpha' ? adapter : null),
      });
      const { container } = render(VaultApp, { props: { platform } });
      const list = container.querySelector('[data-testid="recent-vaults"]');
      expect(list?.textContent).toContain('alpha');
      expect(list?.textContent).toContain('/Users/me/alpha');
      await fireEvent.click(container.querySelector<HTMLButtonElement>('.recent')!);
      await waitFor(() => expect(container.querySelector('.tab-bar')).toBeTruthy());
      expect(container.textContent).toContain('From recents');
    });

    it('errors and prunes when a recent vault is gone', async () => {
      let recents: RecentVault[] = [{ path: '/Users/me/gone', name: 'gone' }];
      const platform = makeFakePlatform(null, {
        listRecentVaults: () => recents,
        openRecentVault: (path) => {
          recents = recents.filter((r) => r.path !== path);
          return Promise.resolve(null);
        },
      });
      const { container } = render(VaultApp, { props: { platform } });
      await fireEvent.click(container.querySelector<HTMLButtonElement>('.recent')!);
      await waitFor(() =>
        expect(container.querySelector('[role=alert]')?.textContent).toContain(
          'no longer available',
        ),
      );
      expect(container.querySelector('[data-testid="recent-vaults"]')).toBeNull();
    });
  });

  describe('multi-window', () => {
    it('hides the New window action when the platform cannot open windows', () => {
      const { container } = render(VaultApp, { props: { platform: makeFakePlatform(null) } });
      expect(container.querySelector('[data-testid="new-window"]')).toBeNull();
    });

    it('invokes openNewWindow when the action is clicked', async () => {
      let opened = 0;
      const platform = makeFakePlatform(null, {
        openNewWindow: () => {
          opened += 1;
          return Promise.resolve();
        },
      });
      const { container } = render(VaultApp, { props: { platform } });
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="new-window"]')!,
      );
      expect(opened).toBe(1);
    });
  });
});
