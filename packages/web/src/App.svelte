<script lang="ts">
  import { EmptyState } from '@markdown-board/ui';
  import { FSAFileAdapter } from './lib/adapters/index.js';
  import VaultWorkspace from './components/VaultWorkspace.svelte';
  import {
    FileSystemAccessUnsupportedError,
    VaultPickerCancelledError,
    isFileSystemAccessSupported,
    loadVault,
    pickVaultDirectory,
    type LoadedVault,
  } from './lib/vault/index.js';

  let loaded = $state<LoadedVault | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);

  const supported = isFileSystemAccessSupported();

  async function pickAndLoad(): Promise<void> {
    error = null;
    loading = true;
    try {
      const handle = await pickVaultDirectory();
      const adapter = new FSAFileAdapter(handle);
      loaded = await loadVault(adapter);
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
      <VaultWorkspace vault={loaded.vault} libraryDocs={loaded.libraryDocs} />
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
