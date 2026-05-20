<script lang="ts">
  // Harness: publishes a view context (as the shell's VaultWorkspace would),
  // then renders the WeekBoard so we can assert bucketing + interactions.
  import type { LibraryDoc, Vault } from '@markdown-board/core';
  import { setViewContext, type ViewHandlers } from '@markdown-board/ui';

  import WeekBoard from '../../src/WeekBoard.svelte';

  interface Props {
    vault: Vault;
    handlers?: ViewHandlers;
  }
  const { vault, handlers = {} }: Props = $props();

  setViewContext({
    getVault: () => vault,
    getLibraryDocs: () => [] as LibraryDoc[],
    getHandlers: () => handlers,
  });
</script>

<WeekBoard />
