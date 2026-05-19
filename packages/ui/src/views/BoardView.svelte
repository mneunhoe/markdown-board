<script lang="ts">
  import type { Vault } from '@markdown-board/core';
  import Column from '../components/Column.svelte';
  import TaskCard from '../components/TaskCard.svelte';
  import EmptyState from '../components/EmptyState.svelte';
  import type { ColumnMoveHandler, TaskMoveHandler } from '../lib/dnd.js';
  import {
    columnDraggable,
    columnDropTarget,
    taskDraggable,
    taskDropTarget,
  } from '../lib/dnd-actions.js';

  interface Props {
    vault: Vault;
    /** Optional override copy for the "no vault loaded" / "no sections" state. */
    emptyTitle?: string;
    emptyHint?: string;
    /**
     * Called when a task is reordered or moved between columns. When omitted,
     * the view stays presentation-only — no `draggable` attributes are
     * attached and no DnD listeners are registered.
     */
    onTaskMove?: TaskMoveHandler;
    /** Called when a column is reordered. Omitted ⇒ column DnD disabled. */
    onColumnMove?: ColumnMoveHandler;
  }

  const {
    vault,
    emptyTitle = 'No sections yet',
    emptyHint = 'Add an H2 heading to TASKS.md to create your first column.',
    onTaskMove,
    onColumnMove,
  }: Props = $props();

  const hasSections = $derived(vault.sections.length > 0);
  const taskDndEnabled = $derived(onTaskMove !== undefined);
  const columnDndEnabled = $derived(onColumnMove !== undefined);
</script>

{#if hasSections}
  <div class="board" role="list" aria-label="Task board">
    {#each vault.sections as section, sectionIdx (section.id)}
      <div
        role="listitem"
        class="board-column-slot"
        use:columnDraggable={{
          sectionId: section.id,
          index: sectionIdx,
          enabled: columnDndEnabled,
        }}
        use:columnDropTarget={{
          sectionId: section.id,
          index: sectionIdx,
          taskCount: section.tasks.length,
          enabled: columnDndEnabled || taskDndEnabled,
          onTaskMove,
          onColumnMove,
        }}
      >
        <Column name={section.name} count={section.tasks.length}>
          {#each section.tasks as task, taskIdx (task.id || `${section.id}:${task.title}`)}
            <div
              class="board-task-slot"
              use:taskDraggable={{
                taskId: task.id,
                sectionId: section.id,
                index: taskIdx,
                enabled: taskDndEnabled,
              }}
              use:taskDropTarget={{
                taskId: task.id,
                sectionId: section.id,
                index: taskIdx,
                enabled: taskDndEnabled,
                onTaskMove,
              }}
            >
              <TaskCard {task} />
            </div>
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
    position: relative;
  }

  /* Runtime attribute selectors — pragmatic-dnd sets data-dragging /
     data-drop-edge from outside Svelte's view, so wrap in :global() to
     opt out of compile-time CSS pruning. The .board-column-slot /
     .board-task-slot classes are unique enough that escaping scope is
     fine. */
  :global(.board-column-slot[data-dragging='true']) {
    opacity: 0.5;
  }

  :global(.board-column-slot[data-drop-edge='left']::before),
  :global(.board-column-slot[data-drop-edge='right']::before) {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--accent);
    border-radius: 2px;
    pointer-events: none;
  }
  :global(.board-column-slot[data-drop-edge='left']::before) {
    left: -10px;
  }
  :global(.board-column-slot[data-drop-edge='right']::before) {
    right: -10px;
  }

  .board-task-slot {
    position: relative;
  }

  :global(.board-task-slot[data-dragging='true']) {
    opacity: 0.5;
  }

  :global(.board-task-slot[data-drop-edge='top']::before),
  :global(.board-task-slot[data-drop-edge='bottom']::before) {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--accent);
    border-radius: 2px;
    pointer-events: none;
  }
  :global(.board-task-slot[data-drop-edge='top']::before) {
    top: -5px;
  }
  :global(.board-task-slot[data-drop-edge='bottom']::before) {
    bottom: 5px;
  }
</style>
