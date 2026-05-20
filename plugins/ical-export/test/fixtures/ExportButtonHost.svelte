<script lang="ts">
  // Harness: publishes a view context (as VaultWorkspace would), then renders
  // the ExportButton so we can assert it builds + saves the week's .ics.
  import type { LibraryDoc, Vault } from '@markdown-board/core';
  import { setViewContext } from '@markdown-board/ui';

  import ExportButton from '../../src/ExportButton.svelte';

  const { vault }: { vault: Vault } = $props();

  setViewContext({
    getVault: () => vault,
    getLibraryDocs: () => [] as LibraryDoc[],
    getHandlers: () => ({}),
  });
</script>

<ExportButton />
