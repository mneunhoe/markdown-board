<script lang="ts">
  import type { Task } from '@markdown-board/core';
  import PriorityBadge from './PriorityBadge.svelte';
  import DayChip from './DayChip.svelte';
  import ProjectPill from './ProjectPill.svelte';

  interface Props {
    task: Task;
    /**
     * When provided, the checkbox becomes interactive — clicking it calls
     * back so the host shell can open a resolve flow (write to
     * archive/TASKS.md and remove the task). Omitted ⇒ checkbox is
     * presentation-only (current `tabindex=-1` / `readonly` behaviour).
     */
    onResolve?: () => void;
    /** When provided, the title becomes click-to-edit (Enter/blur saves, Escape reverts). */
    onTitleEdit?: (next: string) => void;
    /** When provided, the note row becomes click-to-edit; a "+ Add note" affordance appears when the note is empty. */
    onNoteEdit?: (next: string) => void;
    /** When provided, subtask text becomes click-to-edit. Empty value deletes the subtask. */
    onSubtaskEdit?: (idx: number, next: string) => void;
    /** When provided, a "+ Add subtask" affordance appears below the subtask list. */
    onSubtaskAdd?: (text: string) => void;
    /** When provided, subtask checkboxes become interactive toggles. */
    onSubtaskToggle?: (idx: number) => void;
    /** When provided, a delete (×) button appears on the card row. */
    onDelete?: () => void;
    /** Slice 6b — click PriorityBadge to cycle the tier. */
    onPriorityCycle?: () => void;
    /** Slice 6b — click ProjectPill (or "+ Project" hint) to open the picker. */
    onProjectEdit?: () => void;
    /** Slice 6b — click DayChip (or "+ Day" hint) to open the picker. */
    onDayEdit?: () => void;
  }

  const {
    task,
    onResolve,
    onTitleEdit,
    onNoteEdit,
    onSubtaskEdit,
    onSubtaskAdd,
    onSubtaskToggle,
    onDelete,
    onPriorityCycle,
    onProjectEdit,
    onDayEdit,
  }: Props = $props();

  const checkboxInteractive = $derived(onResolve !== undefined);
  const titleEditable = $derived(onTitleEdit !== undefined);
  const noteEditable = $derived(onNoteEdit !== undefined);
  const subtaskEditable = $derived(onSubtaskEdit !== undefined);
  const subtaskAddable = $derived(onSubtaskAdd !== undefined);
  const subtaskToggleable = $derived(onSubtaskToggle !== undefined);
  const deletable = $derived(onDelete !== undefined);

  // Inline-edit state. Only one target may be active at a time. The active
  // target is mirrored to the input via bind:value; commit on Enter/blur,
  // revert on Escape (and short-circuit the trailing blur).
  type EditMode = null | 'title' | 'note' | 'add-subtask' | { kind: 'subtask'; idx: number };
  let editMode = $state<EditMode>(null);
  let editValue = $state('');
  let cancelled = $state(false);
  let inputEl: HTMLInputElement | undefined = $state();

  function startEdit(mode: Exclude<EditMode, null>, initial: string): void {
    editMode = mode;
    editValue = initial;
    cancelled = false;
    queueMicrotask(() => {
      inputEl?.focus();
      inputEl?.select();
    });
  }

  function commit(): void {
    if (!editMode || cancelled) return;
    const next = editValue.trim();
    const mode = editMode;
    editMode = null;
    if (mode === 'title') {
      if (next && next !== task.title) onTitleEdit?.(next);
    } else if (mode === 'note') {
      // Note: empty value is a valid clear (matches prototype, dashboard.html:3076-3082).
      if (next !== task.note) onNoteEdit?.(next);
    } else if (mode === 'add-subtask') {
      if (next) onSubtaskAdd?.(next);
    } else if (mode.kind === 'subtask') {
      // Empty value deletes the subtask (dashboard.html:3105-3107).
      onSubtaskEdit?.(mode.idx, next);
    }
  }

  function onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelled = true;
      editMode = null;
    }
  }

  function onResolveClick(): void {
    onResolve?.();
  }

  function onResolveKeydown(event: KeyboardEvent): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onResolve?.();
    }
  }
</script>

<article class="task-card" class:checked={task.checked} data-task-id={task.id || null}>
  <div class="card-row">
    {#if deletable}
      <button
        type="button"
        class="delete-btn"
        aria-label="Delete {task.title}"
        title="Delete task"
        data-testid="task-delete"
        onclick={() => onDelete?.()}>×</button
      >
    {/if}
    <input
      type="checkbox"
      class="card-checkbox"
      class:interactive={checkboxInteractive}
      checked={task.checked}
      aria-label={checkboxInteractive ? `Resolve ${task.title}` : `Toggle ${task.title}`}
      readonly={!checkboxInteractive}
      tabindex={checkboxInteractive ? 0 : -1}
      onclick={checkboxInteractive ? onResolveClick : null}
      onkeydown={checkboxInteractive ? onResolveKeydown : null}
    />

    {#if editMode === 'title'}
      <input
        type="text"
        class="edit-input title-input"
        data-testid="task-title-input"
        bind:this={inputEl}
        bind:value={editValue}
        onkeydown={onInputKeydown}
        onblur={commit}
      />
    {:else if titleEditable}
      <button
        type="button"
        class="card-title editable"
        data-testid="task-title"
        onclick={() => startEdit('title', task.title)}>{task.title}</button
      >
    {:else}
      <div class="card-title">{task.title}</div>
    {/if}
  </div>

  {#if editMode === 'note'}
    <input
      type="text"
      class="edit-input note-input"
      placeholder="Add a note..."
      data-testid="task-note-input"
      bind:this={inputEl}
      bind:value={editValue}
      onkeydown={onInputKeydown}
      onblur={commit}
    />
  {:else if task.note && noteEditable}
    <button
      type="button"
      class="card-note editable"
      data-testid="task-note"
      onclick={() => startEdit('note', task.note)}>{task.note}</button
    >
  {:else if task.note}
    <div class="card-note">{task.note}</div>
  {:else if noteEditable}
    <button
      type="button"
      class="card-note note-add"
      data-testid="task-note-add"
      onclick={() => startEdit('note', '')}>+ Add note</button
    >
  {/if}

  <div class="card-chips">
    <ProjectPill project={task.project} {...onProjectEdit ? { onEdit: onProjectEdit } : {}} />
    <PriorityBadge
      priority={task.priority}
      {...onPriorityCycle ? { onCycle: onPriorityCycle } : {}}
    />
    <DayChip day={task.day} {...onDayEdit ? { onEdit: onDayEdit } : {}} />
    {#if task.pomodoros > 0}
      <span class="pom-count" aria-label="{task.pomodoros} pomodoros">🍅 {task.pomodoros}</span>
    {/if}
  </div>

  {#if task.subtasks.length > 0 || subtaskAddable}
    <ul class="card-subtasks">
      {#each task.subtasks as sub, i (i)}
        <li class:checked={sub.checked}>
          <input
            type="checkbox"
            class:interactive={subtaskToggleable}
            checked={sub.checked}
            readonly={!subtaskToggleable}
            tabindex={subtaskToggleable ? 0 : -1}
            aria-label={subtaskToggleable ? `Toggle subtask ${sub.text}` : `Subtask ${sub.text}`}
            data-testid={subtaskToggleable ? `subtask-checkbox-${i}` : null}
            onclick={subtaskToggleable ? () => onSubtaskToggle?.(i) : null}
            onkeydown={subtaskToggleable
              ? (e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    onSubtaskToggle?.(i);
                  }
                }
              : null}
          />
          {#if editMode && typeof editMode === 'object' && editMode.kind === 'subtask' && editMode.idx === i}
            <input
              type="text"
              class="edit-input subtask-input"
              data-testid="subtask-input"
              bind:this={inputEl}
              bind:value={editValue}
              onkeydown={onInputKeydown}
              onblur={commit}
            />
          {:else if subtaskEditable}
            <button
              type="button"
              class="subtask-text editable"
              data-testid="subtask-text-{i}"
              onclick={() => startEdit({ kind: 'subtask', idx: i }, sub.text)}>{sub.text}</button
            >
          {:else}
            <span class="subtask-text">{sub.text}</span>
          {/if}
        </li>
      {/each}
      {#if subtaskAddable}
        <li class="subtask-add-row">
          {#if editMode === 'add-subtask'}
            <input
              type="text"
              class="edit-input subtask-input"
              placeholder="New subtask..."
              data-testid="subtask-add-input"
              bind:this={inputEl}
              bind:value={editValue}
              onkeydown={onInputKeydown}
              onblur={commit}
            />
          {:else}
            <button
              type="button"
              class="subtask-add"
              data-testid="subtask-add"
              onclick={() => startEdit('add-subtask', '')}>+ Add subtask</button
            >
          {/if}
        </li>
      {/if}
    </ul>
  {/if}
</article>

<style>
  .task-card {
    background: var(--bg-card);
    border: 1px solid var(--border-light);
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 10px;
    box-shadow: 0 1px 3px var(--shadow);
    transition:
      box-shadow 0.15s ease,
      border-color 0.15s ease;
    position: relative;
    font-family: inherit;
  }

  .task-card:hover {
    box-shadow: 0 4px 12px var(--shadow-hover);
    border-color: var(--border);
  }

  .task-card.checked .card-title {
    color: var(--text-muted);
    text-decoration: line-through;
  }

  .card-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .delete-btn {
    appearance: none;
    background: transparent;
    border: 0;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0;
    width: 16px;
    height: 16px;
    line-height: 1;
    font-size: 18px;
    flex-shrink: 0;
    opacity: 0;
    transition:
      opacity 0.1s ease,
      color 0.1s ease;
  }

  .task-card:hover .delete-btn,
  .delete-btn:focus-visible {
    opacity: 1;
  }

  .delete-btn:hover {
    color: var(--priority-high, #c0392b);
  }

  .card-checkbox {
    margin: 3px 0 0 0;
    flex-shrink: 0;
    cursor: default;
  }

  .card-checkbox.interactive {
    cursor: pointer;
  }

  .card-title {
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    color: var(--text-primary);
    flex: 1;
    overflow-wrap: break-word;
    word-break: break-word;
  }

  button.card-title {
    appearance: none;
    background: transparent;
    border: 0;
    padding: 0;
    margin: 0;
    text-align: left;
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    color: inherit;
  }

  button.card-title.editable {
    cursor: text;
  }

  .card-note {
    font-size: 13px;
    color: var(--text-muted);
    margin: 6px 0 0 28px;
    line-height: 1.4;
    overflow-wrap: break-word;
    word-break: break-word;
    display: block;
  }

  button.card-note {
    appearance: none;
    background: transparent;
    border: 0;
    padding: 0;
    text-align: left;
    font: inherit;
    width: calc(100% - 28px);
  }

  button.card-note.editable {
    cursor: text;
  }

  button.card-note.note-add {
    cursor: text;
    font-style: italic;
    opacity: 0;
    transition: opacity 0.1s ease;
  }

  .task-card:hover button.card-note.note-add,
  button.card-note.note-add:focus-visible {
    opacity: 1;
  }

  .card-chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin: 8px 0 0 28px;
    min-height: 18px;
  }

  .card-chips:empty {
    display: none;
  }

  .pom-count {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 500;
  }

  .card-subtasks {
    list-style: none;
    margin: 8px 0 0 28px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .card-subtasks li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .card-subtasks li.checked {
    color: var(--text-muted);
    text-decoration: line-through;
  }

  .card-subtasks input[type='checkbox'] {
    margin: 0;
    cursor: default;
  }

  .card-subtasks input[type='checkbox'].interactive {
    cursor: pointer;
  }

  .subtask-text {
    flex: 1;
    color: inherit;
  }

  button.subtask-text {
    appearance: none;
    background: transparent;
    border: 0;
    padding: 0;
    text-align: left;
    font: inherit;
    font-size: 13px;
    color: inherit;
  }

  button.subtask-text.editable {
    cursor: text;
  }

  .subtask-add-row {
    list-style: none;
  }

  .subtask-add {
    appearance: none;
    background: transparent;
    border: 0;
    padding: 0 0 0 24px;
    color: var(--text-muted);
    font: inherit;
    font-size: 13px;
    font-style: italic;
    cursor: text;
    text-align: left;
    opacity: 0;
    transition: opacity 0.1s ease;
  }

  .task-card:hover .subtask-add,
  .subtask-add:focus-visible {
    opacity: 1;
  }

  .edit-input {
    box-sizing: border-box;
    background: var(--bg-card);
    border: 2px solid var(--accent);
    border-radius: 6px;
    color: var(--text-primary);
    font-family: inherit;
    outline: none;
  }

  .edit-input.title-input {
    flex: 1;
    padding: 6px 10px;
    font-size: 14px;
    font-weight: 500;
  }

  .edit-input.note-input {
    width: calc(100% - 28px);
    margin: 6px 0 0 28px;
    padding: 4px 8px;
    font-size: 13px;
  }

  .edit-input.subtask-input {
    flex: 1;
    padding: 2px 6px;
    font-size: 13px;
  }
</style>
