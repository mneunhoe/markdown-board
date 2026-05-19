<script lang="ts">
  import type { Vault } from '@markdown-board/core';
  import Column from '../components/Column.svelte';
  import TaskCard from '../components/TaskCard.svelte';
  import EmptyState from '../components/EmptyState.svelte';
  import type { ColumnMoveHandler, TaskMoveHandler } from '../lib/dnd.js';
  import type { ResolveHandler } from '../lib/resolve.js';
  import type {
    DayEditOpenHandler,
    NoteEditHandler,
    PriorityCycleHandler,
    ProjectEditOpenHandler,
    SubtaskAddHandler,
    SubtaskEditHandler,
    SubtaskToggleHandler,
    TaskDeleteHandler,
    TitleEditHandler,
  } from '../lib/edit.js';
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
    /**
     * Called when a task's checkbox is clicked. When omitted, the checkbox
     * stays presentation-only. The shell typically opens a resolve modal
     * here.
     */
    onResolve?: ResolveHandler;
    /** Inline-edit handlers (slice 6a). Omitted ⇒ edit affordances hidden. */
    onTitleEdit?: TitleEditHandler;
    onNoteEdit?: NoteEditHandler;
    onSubtaskEdit?: SubtaskEditHandler;
    onSubtaskAdd?: SubtaskAddHandler;
    onSubtaskToggle?: SubtaskToggleHandler;
    onTaskDelete?: TaskDeleteHandler;
    onPriorityCycle?: PriorityCycleHandler;
    onProjectEdit?: ProjectEditOpenHandler;
    onDayEdit?: DayEditOpenHandler;
  }

  const {
    vault,
    emptyTitle = 'No sections yet',
    emptyHint = 'Add an H2 heading to TASKS.md to create your first column.',
    onTaskMove,
    onColumnMove,
    onResolve,
    onTitleEdit,
    onNoteEdit,
    onSubtaskEdit,
    onSubtaskAdd,
    onSubtaskToggle,
    onTaskDelete,
    onPriorityCycle,
    onProjectEdit,
    onDayEdit,
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
              <TaskCard
                {task}
                {...onResolve
                  ? { onResolve: () => onResolve({ taskId: task.id, sectionId: section.id }) }
                  : {}}
                {...onTitleEdit
                  ? {
                      onTitleEdit: (next: string) =>
                        onTitleEdit({ taskId: task.id, sectionId: section.id }, next),
                    }
                  : {}}
                {...onNoteEdit
                  ? {
                      onNoteEdit: (next: string) =>
                        onNoteEdit({ taskId: task.id, sectionId: section.id }, next),
                    }
                  : {}}
                {...onSubtaskEdit
                  ? {
                      onSubtaskEdit: (idx: number, next: string) =>
                        onSubtaskEdit({ taskId: task.id, sectionId: section.id }, idx, next),
                    }
                  : {}}
                {...onSubtaskAdd
                  ? {
                      onSubtaskAdd: (text: string) =>
                        onSubtaskAdd({ taskId: task.id, sectionId: section.id }, text),
                    }
                  : {}}
                {...onSubtaskToggle
                  ? {
                      onSubtaskToggle: (idx: number) =>
                        onSubtaskToggle({ taskId: task.id, sectionId: section.id }, idx),
                    }
                  : {}}
                {...onTaskDelete
                  ? {
                      onDelete: () => onTaskDelete({ taskId: task.id, sectionId: section.id }),
                    }
                  : {}}
                {...onPriorityCycle
                  ? {
                      onPriorityCycle: () =>
                        onPriorityCycle({ taskId: task.id, sectionId: section.id }),
                    }
                  : {}}
                {...onProjectEdit
                  ? {
                      onProjectEdit: () =>
                        onProjectEdit({ taskId: task.id, sectionId: section.id }, task.project),
                    }
                  : {}}
                {...onDayEdit
                  ? {
                      onDayEdit: () =>
                        onDayEdit({ taskId: task.id, sectionId: section.id }, task.day),
                    }
                  : {}}
              />
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
