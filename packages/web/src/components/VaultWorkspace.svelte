<script lang="ts">
  import type { LibraryDoc, Vault } from '@markdown-board/core';
  import { BoardView, LibraryView, ListView, OverviewView } from '@markdown-board/ui';
  import TabBar from './TabBar.svelte';
  import type { TabKey } from '../lib/tabs.js';

  interface Props {
    vault: Vault;
    libraryDocs: LibraryDoc[];
  }

  const { vault, libraryDocs }: Props = $props();

  let active = $state<TabKey>('board');
</script>

<div class="workspace">
  <TabBar {active} onSelect={(k) => (active = k)} />

  <div class="view" role="tabpanel" data-active={active}>
    {#if active === 'board'}
      <BoardView {vault} />
    {:else if active === 'list'}
      <ListView {vault} />
    {:else if active === 'library'}
      <LibraryView docs={libraryDocs} />
    {:else if active === 'overview'}
      <OverviewView {vault} {libraryDocs} />
    {/if}
  </div>
</div>

<style>
  .workspace {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .view {
    flex: 1;
    overflow: auto;
    padding: 20px;
    min-height: 0;
  }
</style>
