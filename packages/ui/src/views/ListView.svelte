<script lang="ts">
  import type { Vault } from '@markdown-board/core';
  import TaskCard from '../components/TaskCard.svelte';
  import EmptyState from '../components/EmptyState.svelte';
  import type { TaskMoveHandler } from '../lib/dnd.js';
  import type { ResolveHandler } from '../lib/resolve.js';
  import type {
    DayEditOpenHandler,
    NoteEditHandler,
    PriorityCycleHandler,
    ProjectEditOpenHandler,
    SectionRenameHandler,
    SubtaskAddHandler,
    SubtaskEditHandler,
    SubtaskToggleHandler,
    TaskDeleteHandler,
    TitleEditHandler,
  } from '../lib/edit.js';
  import { columnDropTarget, taskDraggable, taskDropTarget } from '../lib/dnd-actions.js';

  interface Props {
    vault: Vault;
    emptyTitle?: string;
    emptyHint?: string;
    /**
     * Called when a task is reordered or moved between sections. When omitted,
     * the view stays presentation-only — no `draggable` attributes, no DnD
     * listeners. Column reorder is BoardView-only and not exposed here.
     */
    onTaskMove?: TaskMoveHandler;
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
  }

  const {
    vault,
    emptyTitle = 'No tasks yet',
    emptyHint = 'Add a `- [ ]` line under any H2 heading in TASKS.md.',
    onTaskMove,
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
  }: Props = $props();

  const hasSections = $derived(vault.sections.length > 0);
  const taskDndEnabled = $derived(onTaskMove !== undefined);
  const renameable = $derived(onSectionRename !== undefined);

  // Per-section rename state. Keyed by sectionId so each section can be
  // independently put into edit mode; only one at a time in practice.
  let editingSectionId = $state<string | null>(null);
  let editValue = $state('');
  let editCancelled = $state(false);
  let renameInputEl: HTMLInputElement | undefined = $state();

  function startRename(sectionId: string, currentName: string): void {
    editingSectionId = sectionId;
    editValue = currentName;
    editCancelled = false;
    queueMicrotask(() => {
      renameInputEl?.focus();
      renameInputEl?.select();
    });
  }

  function commitRename(): void {
    if (editingSectionId === null || editCancelled) return;
    const id = editingSectionId;
    editingSectionId = null;
    const next = editValue.trim();
    const section = vault.sections.find((s) => s.id === id);
    if (next && section && next !== section.name) onSectionRename?.(id, next);
  }

  function onRenameKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitRename();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      editCancelled = true;
      editingSectionId = null;
    }
  }
</script>

{#if hasSections}
  <div class="list-view">
    {#each vault.sections as section, sectionIdx (section.id)}
      <section
        class="list-section"
        data-section-id={section.id}
        use:columnDropTarget={{
          sectionId: section.id,
          index: sectionIdx,
          taskCount: section.tasks.length,
          enabled: taskDndEnabled,
          onTaskMove,
          onColumnMove: undefined,
        }}
      >
        <header class="list-section-header">
          {#if editingSectionId === section.id}
            <input
              type="text"
              class="section-rename-input"
              data-testid="list-section-rename-input"
              bind:this={renameInputEl}
              bind:value={editValue}
              onkeydown={onRenameKeydown}
              onblur={commitRename}
            />
          {:else if renameable}
            <button
              type="button"
              class="section-title editable"
              data-testid="list-section-title"
              onclick={() => startRename(section.id, section.name)}>{section.name}</button
            >
          {:else}
            <span class="section-title">{section.name}</span>
          {/if}
          <span class="count" aria-label="{section.tasks.length} tasks">
            {section.tasks.length}
          </span>
        </header>
        <div class="list-tasks">
          {#each section.tasks as task, taskIdx (task.id || `${section.id}:${task.title}`)}
            <div
              class="list-task-slot"
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

  button.section-title {
    appearance: none;
    background: transparent;
    border: 0;
    padding: 0;
    text-align: left;
    font: inherit;
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: inherit;
    cursor: text;
  }

  .section-rename-input {
    flex: 1;
    min-width: 0;
    background: var(--bg-card);
    border: 2px solid var(--accent);
    border-radius: 6px;
    padding: 4px 10px;
    color: var(--text-primary);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    outline: none;
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

  .list-task-slot {
    position: relative;
  }

  /* See BoardView.svelte for the rationale: pragmatic-dnd toggles these
     attributes at runtime, so we opt the attribute selectors out of
     Svelte's compile-time CSS pruning via :global(). */
  :global(.list-task-slot[data-dragging='true']) {
    opacity: 0.5;
  }

  :global(.list-task-slot[data-drop-edge='top']::before),
  :global(.list-task-slot[data-drop-edge='bottom']::before) {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--accent);
    border-radius: 2px;
    pointer-events: none;
  }
  :global(.list-task-slot[data-drop-edge='top']::before) {
    top: -5px;
  }
  :global(.list-task-slot[data-drop-edge='bottom']::before) {
    bottom: 5px;
  }
</style>
