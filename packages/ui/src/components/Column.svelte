<script lang="ts">
  import type { Snippet } from 'svelte';
  import ArchivedTasksExpander from './ArchivedTasksExpander.svelte';
  import type { ArchivedTaskRef } from '../lib/edit.js';

  interface Props {
    name: string;
    count: number;
    children?: Snippet;
    /**
     * When provided, the column title becomes click-to-edit (same gesture
     * as `TaskCard`: click → input → Enter/blur saves, Escape reverts).
     * `name` is forwarded to the rename handler as the trimmed new value.
     */
    onRename?: (next: string) => void;
    /**
     * Slice 6g — archived tasks rendered under this column. Omitted ⇒
     * the expander is not mounted (no "Archived (0)" affordance). Each
     * ref carries the H2 timestamp so the expander can subtitle the
     * row "Archived YYYY-MM-DD HH:MM".
     */
    archivedTasks?: ArchivedTaskRef[];
    /**
     * Slice 6g — when set, archived TaskCards get the hover-revealed
     * `↺` button; the host shell moves the task back to active.
     */
    onUnresolveArchived?: (taskId: string) => void;
    /**
     * Slice 6i — when provided, the column renders a `+ Add task` row
     * at the bottom of `.cards`. Click → inline `<input>`; Enter or
     * blur commits with the trimmed title; Escape cancels. Mirrors
     * `dashboard.html:3303-3338`.
     */
    onAddTask?: (title: string) => void;
  }

  const {
    name,
    count,
    children,
    onRename,
    archivedTasks = [],
    onUnresolveArchived,
    onAddTask,
  }: Props = $props();
  const renameable = $derived(onRename !== undefined);
  const addable = $derived(onAddTask !== undefined);

  let editing = $state(false);
  let editValue = $state('');
  let cancelled = $state(false);
  let inputEl: HTMLInputElement | undefined = $state();

  function startRename(): void {
    editing = true;
    editValue = name;
    cancelled = false;
    queueMicrotask(() => {
      inputEl?.focus();
      inputEl?.select();
    });
  }

  function commit(): void {
    if (!editing || cancelled) return;
    editing = false;
    const next = editValue.trim();
    if (next && next !== name) onRename?.(next);
  }

  function onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelled = true;
      editing = false;
    }
  }

  // Slice 6i add-task affordance state.
  let addingTask = $state(false);
  let addValue = $state('');
  let addCancelled = $state(false);
  let addInputEl: HTMLInputElement | undefined = $state();

  function startAddTask(): void {
    addingTask = true;
    addValue = '';
    addCancelled = false;
    queueMicrotask(() => addInputEl?.focus());
  }

  function commitAddTask(): void {
    if (!addingTask || addCancelled) return;
    addingTask = false;
    const next = addValue.trim();
    if (next) onAddTask?.(next);
  }

  function onAddTaskKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitAddTask();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      addCancelled = true;
      addingTask = false;
    }
  }
</script>

<section class="column" aria-label="Section {name}">
  <header class="column-header" data-column-drag-handle>
    {#if editing}
      <input
        type="text"
        class="rename-input"
        data-testid="column-rename-input"
        bind:this={inputEl}
        bind:value={editValue}
        onkeydown={onInputKeydown}
        onblur={commit}
      />
    {:else if renameable}
      <button
        type="button"
        class="column-title editable"
        data-testid="column-title"
        onclick={startRename}>{name}</button
      >
    {:else}
      <span class="column-title">{name}</span>
    {/if}
    <span class="count" aria-label="{count} tasks">{count}</span>
  </header>
  <div class="cards">
    {@render children?.()}
    {#if addable}
      {#if addingTask}
        <input
          type="text"
          class="add-task-input"
          placeholder="What needs to be done?"
          data-testid="column-add-task-input"
          bind:this={addInputEl}
          bind:value={addValue}
          onkeydown={onAddTaskKeydown}
          onblur={commitAddTask}
        />
      {:else}
        <button
          type="button"
          class="add-task-btn"
          data-testid="column-add-task"
          onclick={startAddTask}>+ Add task</button
        >
      {/if}
    {/if}
    <ArchivedTasksExpander
      tasks={archivedTasks}
      {...onUnresolveArchived ? { onUnresolve: onUnresolveArchived } : {}}
    />
  </div>
</section>

<style>
  .column {
    display: flex;
    flex-direction: column;
    background: var(--bg-secondary);
    border-radius: 12px;
    min-width: 280px;
    flex: 1;
  }

  .column-header {
    padding: 16px 18px;
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .column-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    flex: 1;
  }

  button.column-title {
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

  .rename-input {
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

  .cards {
    flex: 1;
    overflow-y: auto;
    padding: 0 12px 12px;
    min-height: 100px;
  }

  .add-task-btn {
    appearance: none;
    background: transparent;
    border: 1px dashed var(--border);
    color: var(--text-muted);
    font: inherit;
    font-size: 13px;
    font-style: italic;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    margin-top: 6px;
    width: 100%;
  }

  .add-task-btn:hover {
    border-color: var(--accent);
    color: var(--text-primary);
  }

  .add-task-input {
    width: 100%;
    box-sizing: border-box;
    background: var(--bg-card);
    border: 2px solid var(--accent);
    border-radius: 8px;
    padding: 8px 12px;
    color: var(--text-primary);
    font: inherit;
    font-size: 13px;
    outline: none;
    margin-top: 6px;
  }
</style>
