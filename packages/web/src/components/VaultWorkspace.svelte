<script lang="ts">
  import type { LibraryDoc, Vault } from '@markdown-board/core';
  import {
    BoardView,
    LibraryView,
    ListView,
    OverviewView,
    type ColumnMoveHandler,
    type ResolveHandler,
    type TaskMoveHandler,
  } from '@markdown-board/ui';
  import TabBar from './TabBar.svelte';
  import type { TabKey } from '../lib/tabs.js';

  interface Props {
    vault: Vault;
    libraryDocs: LibraryDoc[];
    /** Wired by App.svelte when a writable vault is open. Omitted ⇒ DnD off. */
    onTaskMove?: TaskMoveHandler;
    onColumnMove?: ColumnMoveHandler;
    /** Opens the resolve modal in App.svelte. Omitted ⇒ checkboxes presentation-only. */
    onResolve?: ResolveHandler;
  }

  const { vault, libraryDocs, onTaskMove, onColumnMove, onResolve }: Props = $props();

  let active = $state<TabKey>('board');

  // Conditionally-keyed prop bags so an undefined handler is *absent*
  // rather than passed as `undefined` — required under
  // `exactOptionalPropertyTypes` since BoardView / ListView declare
  // their move / resolve props as `?: T`.
  const boardMoveProps = $derived({
    ...(onTaskMove ? { onTaskMove } : {}),
    ...(onColumnMove ? { onColumnMove } : {}),
    ...(onResolve ? { onResolve } : {}),
  });
  const listMoveProps = $derived({
    ...(onTaskMove ? { onTaskMove } : {}),
    ...(onResolve ? { onResolve } : {}),
  });
</script>

<div class="workspace">
  <TabBar {active} onSelect={(k) => (active = k)} />

  <div class="view" role="tabpanel" data-active={active}>
    {#if active === 'board'}
      <BoardView {vault} {...boardMoveProps} />
    {:else if active === 'list'}
      <ListView {vault} {...listMoveProps} />
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
