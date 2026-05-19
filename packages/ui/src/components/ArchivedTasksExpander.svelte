<script lang="ts">
  import TaskCard from './TaskCard.svelte';
  import type { ArchivedTaskRef } from '../lib/edit.js';

  interface Props {
    /**
     * Archived tasks to render under this column / section. The host
     * shell groups by source-section id before passing them in
     * (slice 6g-3); the expander itself is unaware of section
     * structure.
     */
    tasks: ArchivedTaskRef[];
    /**
     * When provided, each archived TaskCard gets a hover-revealed `↺`
     * button that calls back with the task's id. Omitted ⇒ the cards
     * stay fully read-only.
     */
    onUnresolve?: (taskId: string) => void;
  }

  const { tasks, onUnresolve }: Props = $props();

  let expanded = $state(false);

  function toggle(): void {
    expanded = !expanded;
  }
</script>

{#if tasks.length > 0}
  <section class="archived-expander" data-testid="archived-expander">
    <button
      type="button"
      class="expander-toggle"
      aria-expanded={expanded}
      data-testid="archived-toggle"
      onclick={toggle}
    >
      <span class="caret" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
      Archived ({tasks.length})
    </button>
    {#if expanded}
      <div class="archived-list" data-testid="archived-list">
        {#each tasks as ref (ref.task.id || `${ref.archivedAt}:${ref.task.title}`)}
          <div class="archived-row">
            <div class="archived-meta" data-testid="archived-meta">
              Archived {ref.archivedAt}
            </div>
            <TaskCard
              task={ref.task}
              {...onUnresolve ? { onUnresolve: () => onUnresolve(ref.task.id) } : {}}
            />
          </div>
        {/each}
      </div>
    {/if}
  </section>
{/if}

<style>
  .archived-expander {
    display: flex;
    flex-direction: column;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed var(--border-light);
  }

  .expander-toggle {
    appearance: none;
    background: transparent;
    border: 0;
    color: var(--text-muted);
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    text-align: left;
    padding: 4px 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .expander-toggle:hover {
    color: var(--text-primary);
  }

  .caret {
    display: inline-block;
    width: 10px;
    font-size: 10px;
    color: var(--text-muted);
  }

  .archived-list {
    display: flex;
    flex-direction: column;
    margin-top: 6px;
    opacity: 0.85;
  }

  .archived-row {
    display: flex;
    flex-direction: column;
  }

  .archived-meta {
    font-size: 11px;
    color: var(--text-muted);
    margin: 0 0 2px 4px;
  }
</style>
