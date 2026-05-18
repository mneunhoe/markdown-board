<script lang="ts">
  import type { Vault } from '@markdown-board/core';
  import Column from '../components/Column.svelte';
  import TaskCard from '../components/TaskCard.svelte';
  import EmptyState from '../components/EmptyState.svelte';

  interface Props {
    vault: Vault;
    /** Optional override copy for the "no vault loaded" / "no sections" state. */
    emptyTitle?: string;
    emptyHint?: string;
  }

  const {
    vault,
    emptyTitle = 'No sections yet',
    emptyHint = 'Add an H2 heading to TASKS.md to create your first column.',
  }: Props = $props();

  const hasSections = $derived(vault.sections.length > 0);
</script>

{#if hasSections}
  <div class="board" role="list" aria-label="Task board">
    {#each vault.sections as section (section.id)}
      <div role="listitem" class="board-column-slot">
        <Column name={section.name} count={section.tasks.length}>
          {#each section.tasks as task (task.id || `${section.id}:${task.title}`)}
            <TaskCard {task} />
          {/each}
        </Column>
      </div>
    {/each}
  </div>
{:else}
  <EmptyState title={emptyTitle} hint={emptyHint} />
{/if}

<style>
  .board {
    display: flex;
    gap: 18px;
    align-items: flex-start;
    overflow-x: auto;
    padding: 4px 4px 24px;
    min-height: 0;
  }

  .board-column-slot {
    display: flex;
    flex-direction: column;
    min-width: 280px;
    flex: 1 1 280px;
    max-width: 360px;
  }
</style>
