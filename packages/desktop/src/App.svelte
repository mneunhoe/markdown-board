<script lang="ts">
  import { VaultApp, type VaultPlatform } from '@markdown-board/shell';
  import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
  import { open } from '@tauri-apps/plugin-dialog';
  import { stat } from '@tauri-apps/plugin-fs';
  import { TauriFileAdapter } from './lib/adapters/index.js';
  import { subscribeFolderDrop } from './lib/dnd.js';
  import { loadRecents, recordRecent, removeRecent } from './lib/recents.js';
  import { TauriExternalChangeWatcher } from './lib/vault/index.js';

  // Build an adapter for a vault path and record it as recently opened. Used
  // by every open route (picker, drag-and-drop, recent) so the recents list
  // stays consistent.
  function openVaultAtPath(path: string): TauriFileAdapter {
    recordRecent(path);
    return new TauriFileAdapter(path);
  }

  const platform: VaultPlatform = {
    isSupported: () => true,
    async pickVault() {
      const picked = await open({ directory: true, multiple: false });
      return typeof picked === 'string' ? openVaultAtPath(picked) : null;
    },
    createWatcher: (adapter, deps) =>
      new TauriExternalChangeWatcher({
        ...deps,
        watchPath: (adapter as TauriFileAdapter).rootPath,
      }),
    subscribeExternalOpen: (handler) =>
      subscribeFolderDrop(handler, { makeAdapter: openVaultAtPath }),
    listRecentVaults: () => loadRecents(),
    async openRecentVault(path) {
      // Prune vaults that have moved or been deleted instead of failing to load.
      try {
        const info = await stat(path);
        if (!info.isDirectory) {
          removeRecent(path);
          return null;
        }
      } catch {
        removeRecent(path);
        return null;
      }
      return openVaultAtPath(path);
    },
    async openNewWindow() {
      const label = `vault-${Date.now()}`;
      const win = new WebviewWindow(label, { url: '/' });
      // Resolve once the window-create request is registered; the new window
      // boots the app fresh with its own shell/adapter/watcher.
      await win.once('tauri://created', () => undefined);
    },
  };
</script>

<VaultApp {platform} />
