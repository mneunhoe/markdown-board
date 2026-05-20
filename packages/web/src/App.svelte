<script lang="ts">
  import { VaultApp, ExternalChangeWatcher, type VaultPlatform } from '@markdown-board/shell';
  import { FSAFileAdapter } from './lib/adapters/index.js';
  import {
    VaultPickerCancelledError,
    isFileSystemAccessSupported,
    pickVaultDirectory,
  } from './lib/vault/picker.js';

  const platform: VaultPlatform = {
    isSupported: isFileSystemAccessSupported,
    unsupportedMessage: {
      title: 'File System Access API not supported',
      hint: 'Open this page in Chrome, Edge, or another Chromium-based browser to pick a vault.',
    },
    async pickVault() {
      try {
        return new FSAFileAdapter(await pickVaultDirectory());
      } catch (err) {
        // Cancellation is a normal outcome; everything else (including
        // FileSystemAccessUnsupportedError) surfaces as error text.
        if (err instanceof VaultPickerCancelledError) return null;
        throw err;
      }
    },
    createWatcher: (_adapter, deps) => new ExternalChangeWatcher(deps),
  };
</script>

<VaultApp {platform} />
