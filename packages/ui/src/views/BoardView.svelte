<script lang="ts">
  import type { Vault } from '@markdown-board/core';
  import Column from '../components/Column.svelte';
  import TaskCard from '../components/TaskCard.svelte';
  import EmptyState from '../components/EmptyState.svelte';
  import type { ColumnMoveHandler, TaskMoveHandler } from '../lib/dnd.js';
  import type { ResolveHandler } from '../lib/resolve.js';
  import type {
    ArchivedTaskRef,
    DayEditOpenHandler,
    FullTaskEditHandler,
    NoteEditHandler,
    PriorityCycleHandler,
    ProjectEditOpenHandler,
    SectionAddHandler,
    SectionDeleteHandler,
    SectionRenameHandler,
    SubtaskAddHandler,
    SubtaskEditHandler,
    SubtaskToggleHandler,
    TaskAddHandler,
    TaskDeleteHandler,
    TaskUnresolveHandler,
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
    onSectionRename?: SectionRenameHandler;
    onFullTaskEdit?: FullTaskEditHandler;
    /**
     * Slice 6g — archived tasks grouped by source-section id. Sections
     * with no archived tasks may be absent from the record. Defaults to
     * `{}` (no archived rows rendered).
     */
    archivedTasksBySection?: Record<string, ArchivedTaskRef[]>;
    /**
     * Slice 6g — fires when the user clicks `↺` on an archived card.
     * Omitted ⇒ archived cards stay fully read-only.
     */
    onTaskUnresolve?: TaskUnresolveHandler;
    /**
     * Slice 6i — `+ Add task` per column. Omitted ⇒ the affordance is
     * hidden. Fires with the trimmed title; empty inputs are filtered
     * at the Column level before the handler is called.
     */
    onTaskAdd?: TaskAddHandler;
    /**
     * Slice 6i — `+ Add Section` placeholder column at the end of the
     * board. Omitted ⇒ the placeholder is not rendered.
     */
    onSectionAdd?: SectionAddHandler;
    /**
     * Slice 6j — when provided, each Column gets a hover-revealed `×`
     * button on its header, but only when the section has zero open
     * tasks AND zero archived refs (Column enforces the visibility).
     */
    onSectionDelete?: SectionDeleteHandler;
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
    onSectionRename,
    onFullTaskEdit,
    archivedTasksBySection = {},
    onTaskUnresolve,
    onTaskAdd,
    onSectionAdd,
    onSectionDelete,
  }: Props = $props();

  const hasSections = $derived(vault.sections.length > 0);
  const taskDndEnabled = $derived(onTaskMove !== undefined);
  const columnDndEnabled = $derived(onColumnMove !== undefined);
  const sectionAddable = $derived(onSectionAdd !== undefined);

  // Slice 6i — "+ Add Section" placeholder state.
  let addingSection = $state(false);
  let addSectionValue = $state('');
  let addSectionCancelled = $state(false);
  let addSectionInputEl: HTMLInputElement | undefined = $state();

  function startAddSection(): void {
    addingSection = true;
    addSectionValue = '';
    addSectionCancelled = false;
    queueMicrotask(() => addSectionInputEl?.focus());
  }

  function commitAddSection(): void {
    if (!addingSection || addSectionCancelled) return;
    addingSection = false;
    const next = addSectionValue.trim();
    if (next) onSectionAdd?.(next);
  }

  function onAddSectionKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitAddSection();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      addSectionCancelled = true;
      addingSection = false;
    }
  }
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
        <Column
          name={section.name}
          count={section.tasks.length}
          archivedTasks={archivedTasksBySection[section.id] ?? []}
          {...onSectionRename
            ? { onRename: (next: string) => onSectionRename(section.id, next) }
            : {}}
          {...onTaskUnresolve
            ? {
                onUnresolveArchived: (taskId: string) =>
                  onTaskUnresolve({ taskId, sectionId: section.id }),
              }
            : {}}
          {...onTaskAdd ? { onAddTask: (title: string) => onTaskAdd(section.id, title) } : {}}
          {...onSectionDelete ? { onDelete: () => onSectionDelete(section.id) } : {}}
        >
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
                sectionId={section.id}
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
                {...onFullTaskEdit
                  ? {
                      onFullEdit: () => onFullTaskEdit({ taskId: task.id, sectionId: section.id }),
                    }
                  : {}}
              />
            </div>
          {/each}
        </Column>
      </div>
    {/each}
    {#if sectionAddable}
      <div class="board-add-section" role="listitem">
        {#if addingSection}
          <input
            type="text"
            class="add-section-input"
            placeholder="Section name…"
            data-testid="board-add-section-input"
            bind:this={addSectionInputEl}
            bind:value={addSectionValue}
            onkeydown={onAddSectionKeydown}
            onblur={commitAddSection}
          />
        {:else}
          <button
            type="button"
            class="add-section-btn"
            data-testid="board-add-section"
            onclick={startAddSection}>+ Add Section</button
          >
        {/if}
      </div>
    {/if}
  </div>
{:else if sectionAddable}
  <div class="board" role="list" aria-label="Task board">
    <div class="board-add-section" role="listitem">
      {#if addingSection}
        <input
          type="text"
          class="add-section-input"
          placeholder="Section name…"
          data-testid="board-add-section-input"
          bind:this={addSectionInputEl}
          bind:value={addSectionValue}
          onkeydown={onAddSectionKeydown}
          onblur={commitAddSection}
        />
      {:else}
        <button
          type="button"
          class="add-section-btn"
          data-testid="board-add-section"
          onclick={startAddSection}>+ Add Section</button
        >
      {/if}
    </div>
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

  .board-add-section {
    min-width: 280px;
    flex: 0 0 280px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
  }

  .add-section-btn {
    appearance: none;
    background: transparent;
    border: 2px dashed var(--border);
    color: var(--text-muted);
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    padding: 16px 24px;
    border-radius: 12px;
    cursor: pointer;
    width: 100%;
    height: 100%;
    min-height: 120px;
  }

  .add-section-btn:hover {
    border-color: var(--accent);
    color: var(--text-primary);
  }

  .add-section-input {
    width: 100%;
    box-sizing: border-box;
    background: var(--bg-card);
    border: 2px solid var(--accent);
    border-radius: 8px;
    padding: 10px 14px;
    color: var(--text-primary);
    font: inherit;
    font-size: 14px;
    outline: none;
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
