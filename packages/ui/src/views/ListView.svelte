<script lang="ts">
  import type { Vault } from '@markdown-board/core';
  import TaskCard from '../components/TaskCard.svelte';
  import EmptyState from '../components/EmptyState.svelte';

  interface Props {
    vault: Vault;
    emptyTitle?: string;
    emptyHint?: string;
  }

  const {
    vault,
    emptyTitle = 'No tasks yet',
    emptyHint = 'Add a `- [ ]` line under any H2 heading in TASKS.md.',
  }: Props = $props();

  const hasSections = $derived(vault.sections.length > 0);
</script>

{#if hasSections}
  <div class="list-view">
    {#each vault.sections as section (section.id)}
      <section class="list-section" data-section-id={section.id}>
        <header class="list-section-header">
          <span class="section-title">{section.name}</span>
          <span class="count" aria-label="{section.tasks.length} tasks">
            {section.tasks.length}
          </span>
        </header>
        <div class="list-tasks">
          {#each section.tasks as task (task.id || `${section.id}:${task.title}`)}
            <TaskCard {task} />
          {/each}
        </div>
      </section>
    {/each}
  </div>
{:else}
  <EmptyState title={emptyTitle} hint={emptyHint} />
{/if}

<style>
  .list-view {
    display: flex;
    flex-direction: column;
    gap: 28px;
    padding: 4px 4px 24px;
  }

  .list-section {
    display: flex;
    flex-direction: column;
  }

  .list-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px 12px;
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
  }

  .section-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    flex: 1;
  }

  .count {
    background: var(--bg-card);
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
    flex-shrink: 0;
    margin-left: 8px;
  }

  .list-tasks {
    display: flex;
    flex-direction: column;
  }
</style>
