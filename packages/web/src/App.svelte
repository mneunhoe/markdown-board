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
    saveFile(name, contents, mime = 'text/plain') {
      const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke after a tick so the download has a chance to start.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return Promise.resolve();
    },
  };
</script>

<VaultApp {platform} />
