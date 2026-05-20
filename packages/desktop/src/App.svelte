<script lang="ts">
  import { VaultApp, type VaultPlatform } from '@markdown-board/shell';
  import { open } from '@tauri-apps/plugin-dialog';
  import { TauriFileAdapter } from './lib/adapters/index.js';
  import { TauriExternalChangeWatcher } from './lib/vault/index.js';

  const platform: VaultPlatform = {
    isSupported: () => true,
    async pickVault() {
      const picked = await open({ directory: true, multiple: false });
      return typeof picked === 'string' ? new TauriFileAdapter(picked) : null;
    },
    createWatcher: (adapter, deps) =>
      new TauriExternalChangeWatcher({
        ...deps,
        watchPath: (adapter as TauriFileAdapter).rootPath,
      }),
  };
</script>

<VaultApp {platform} />
