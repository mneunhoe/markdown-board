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
  }

  const { task, onResolve }: Props = $props();
  const interactive = $derived(onResolve !== undefined);

  function handleClick(): void {
    onResolve?.();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onResolve?.();
    }
  }
</script>

<article class="task-card" class:checked={task.checked} data-task-id={task.id || null}>
  <div class="card-row">
    <input
      type="checkbox"
      class="card-checkbox"
      class:interactive
      checked={task.checked}
      aria-label={interactive ? `Resolve ${task.title}` : `Toggle ${task.title}`}
      readonly={!interactive}
      tabindex={interactive ? 0 : -1}
      onclick={interactive ? handleClick : null}
      onkeydown={interactive ? handleKeydown : null}
    />
    <div class="card-title">{task.title}</div>
  </div>

  {#if task.note}
    <div class="card-note">{task.note}</div>
  {/if}

  <div class="card-chips">
    <ProjectPill project={task.project} />
    <PriorityBadge priority={task.priority} />
    <DayChip day={task.day} />
    {#if task.pomodoros > 0}
      <span class="pom-count" aria-label="{task.pomodoros} pomodoros">🍅 {task.pomodoros}</span>
    {/if}
  </div>

  {#if task.subtasks.length > 0}
    <ul class="card-subtasks">
      {#each task.subtasks as sub, i (i)}
        <li class:checked={sub.checked}>
          <input type="checkbox" checked={sub.checked} readonly tabindex="-1" />
          <span>{sub.text}</span>
        </li>
      {/each}
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

  .card-note {
    font-size: 13px;
    color: var(--text-muted);
    margin: 6px 0 0 28px;
    line-height: 1.4;
    overflow-wrap: break-word;
    word-break: break-word;
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

  .card-subtasks input {
    margin: 0;
    cursor: default;
  }
</style>
