<script lang="ts">
  import { toMarkdown } from '@markdown-board/core';
  import type { Section, Task } from '@markdown-board/core';
  import {
    EmptyState,
    type ColumnMoveHandler,
    type ResolveHandler,
    type TaskMoveHandler,
  } from '@markdown-board/ui';
  import { FSAFileAdapter } from './lib/adapters/index.js';
  import ResolveModal from './components/ResolveModal.svelte';
  import VaultWorkspace from './components/VaultWorkspace.svelte';
  import {
    Autosaver,
    ExternalChangeWatcher,
    FileSystemAccessUnsupportedError,
    VaultPickerCancelledError,
    appendArchiveEntry,
    findTask,
    isFileSystemAccessSupported,
    loadVault,
    moveColumn,
    moveTask,
    pickVaultDirectory,
    removeTask,
    type LoadedVault,
  } from './lib/vault/index.js';

  const TASKS_PATH = 'TASKS.md';

  let loaded = $state<LoadedVault | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let lastWrittenMd = $state<string>('');
  /** Captured at modal-open time so a concurrent external reload can't shift the target. */
  let resolveTarget = $state<{ task: Task; section: Section } | null>(null);
  let resolving = $state(false);

  let adapter: FSAFileAdapter | null = null;
  let autosaver: Autosaver | null = null;
  let watcher: ExternalChangeWatcher | null = null;

  const supported = isFileSystemAccessSupported();

  async function pickAndLoad(): Promise<void> {
    error = null;
    loading = true;
    try {
      const handle = await pickVaultDirectory();
      await mountVault(new FSAFileAdapter(handle));
    } catch (err) {
      if (err instanceof VaultPickerCancelledError) return;
      if (err instanceof FileSystemAccessUnsupportedError) {
        error = err.message;
        return;
      }
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  async function mountVault(next: FSAFileAdapter): Promise<void> {
    teardownIo();
    adapter = next;
    const fresh = await loadVault(next);
    const canonical = toMarkdown(fresh.vault);
    lastWrittenMd = canonical;
    loaded = fresh;
    const initialMtime = await safeMtime(next, TASKS_PATH);
    autosaver = new Autosaver({
      write: async (md) => {
        await next.writeFile(TASKS_PATH, md);
        lastWrittenMd = md;
        const mtime = await safeMtime(next, TASKS_PATH);
        watcher?.setBaseline(mtime);
      },
      onError: (err: unknown) => {
        error = `Autosave failed: ${err instanceof Error ? err.message : String(err)}`;
      },
    });
    watcher = new ExternalChangeWatcher({
      getMtime: () => next.getMtime(TASKS_PATH),
      initialMtime,
      isLocalWritePending: () => autosaver?.isPending ?? false,
      onExternalChange: async () => {
        if (!adapter || autosaver?.isPending) return;
        const reloaded = await loadVault(adapter);
        lastWrittenMd = toMarkdown(reloaded.vault);
        loaded = reloaded;
        watcher?.setBaseline(await safeMtime(adapter, TASKS_PATH));
      },
      onError: () => {
        // Transient mtime failures (file briefly missing during external
        // rewrite) are expected — silently skip the tick.
      },
    });
    watcher.start();
  }

  function teardownIo(): void {
    autosaver?.dispose();
    watcher?.dispose();
    autosaver = null;
    watcher = null;
    adapter = null;
  }

  async function safeMtime(a: FSAFileAdapter, path: string): Promise<number> {
    try {
      return await a.getMtime(path);
    } catch {
      return 0;
    }
  }

  const onTaskMove: TaskMoveHandler = (move) => {
    if (!loaded) return;
    moveTask(loaded.vault, move);
  };

  const onColumnMove: ColumnMoveHandler = (move) => {
    if (!loaded) return;
    moveColumn(loaded.vault, move);
  };

  const onResolve: ResolveHandler = (target) => {
    if (!loaded) return;
    const found = findTask(loaded.vault, target);
    if (!found) return;
    resolveTarget = found;
  };

  async function confirmResolve(resolution: string): Promise<void> {
    if (!resolveTarget || !adapter || !loaded || resolving) return;
    const { task, section } = resolveTarget;
    resolving = true;
    try {
      // Flush any pending autosave first so the archive entry mirrors what's
      // about to be on disk in TASKS.md.
      await autosaver?.flush();
      await appendArchiveEntry(adapter, task, resolution, section);
      removeTask(loaded.vault, { taskId: task.id, sectionId: section.id });
      resolveTarget = null;
    } catch (err) {
      error = `Resolve failed: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      resolving = false;
    }
  }

  function cancelResolve(): void {
    if (resolving) return;
    resolveTarget = null;
  }

  // Autosave $effect — re-runs on any deep mutation of `loaded.vault`
  // (Svelte 5's proxy traverses sections/tasks). Schedules a write when
  // the canonical markdown drifts from what we last wrote.
  $effect(() => {
    if (!loaded || !autosaver) return;
    const md = toMarkdown(loaded.vault);
    if (md === lastWrittenMd) return;
    autosaver.schedule(md);
  });

  $effect(() => {
    return () => teardownIo();
  });
</script>

<main class="shell">
  <header class="topbar">
    <h1 class="brand">markdown-board</h1>
    {#if loaded}
      <button
        type="button"
        class="topbar-action"
        onclick={pickAndLoad}
        disabled={loading}
        data-testid="reopen-vault"
      >
        {loading ? 'Loading…' : 'Open another vault…'}
      </button>
    {/if}
  </header>

  <section class="body" class:empty={!loaded}>
    {#if loaded}
      <VaultWorkspace
        vault={loaded.vault}
        libraryDocs={loaded.libraryDocs}
        {onTaskMove}
        {onColumnMove}
        {onResolve}
      />
    {:else if !supported}
      <EmptyState
        title="File System Access API not supported"
        hint="Open this page in Chrome, Edge, or another Chromium-based browser to pick a vault."
      />
    {:else}
      <EmptyState
        title="No vault open"
        hint="Pick a folder containing TASKS.md and an optional library/ directory."
      >
        <button
          type="button"
          class="primary"
          onclick={pickAndLoad}
          disabled={loading}
          data-testid="pick-vault"
        >
          {loading ? 'Loading…' : 'Pick a vault folder'}
        </button>
      </EmptyState>
    {/if}

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}
  </section>

  <ResolveModal
    taskTitle={resolveTarget?.task.title ?? null}
    onConfirm={confirmResolve}
    onCancel={cancelResolve}
  />
</main>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    padding: 12px 20px;
    background: var(--bg-secondary);
  }

  .brand {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .topbar-action {
    appearance: none;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-primary);
    font: inherit;
    font-size: 12px;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
  }

  .topbar-action:hover:not(:disabled) {
    border-color: var(--accent);
  }

  .topbar-action:disabled {
    opacity: 0.6;
    cursor: progress;
  }

  .body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .body.empty {
    align-items: center;
    justify-content: center;
  }

  .primary {
    appearance: none;
    border: 0;
    background: var(--accent);
    color: white;
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    padding: 8px 18px;
    border-radius: 6px;
    cursor: pointer;
  }

  .primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .primary:disabled {
    opacity: 0.6;
    cursor: progress;
  }

  .error {
    margin: 16px auto 24px;
    max-width: 480px;
    padding: 10px 14px;
    border-radius: 6px;
    background: rgba(192, 57, 43, 0.1);
    color: var(--priority-high);
    font-size: 13px;
    text-align: center;
  }
</style>
