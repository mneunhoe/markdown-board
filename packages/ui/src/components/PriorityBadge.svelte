<script lang="ts">
  import type { Priority } from '@markdown-board/core';

  interface Props {
    priority: Priority;
    /**
     * When provided, the badge becomes a button that cycles the priority
     * tier on click. The null state renders as a low-opacity "·" affordance
     * that's revealed on card hover (matches `dashboard.html:2933-2941`).
     */
    onCycle?: () => void;
  }

  const { priority, onCycle }: Props = $props();
  const cyclable = $derived(onCycle !== undefined);

  const LABELS = {
    blocker: 'P0',
    high: 'P1',
    low: 'P3',
  } as const satisfies Record<Exclude<Priority, null>, string>;
</script>

{#if cyclable}
  <button
    type="button"
    class="priority-badge cyclable {priority ? `priority-${priority}` : 'priority-empty'}"
    aria-label={priority ? `Priority ${priority} (click to cycle)` : 'Set priority'}
    title={priority ? `Priority: ${priority} (click to cycle)` : 'Set priority'}
    data-testid="priority-cycle"
    onclick={onCycle}
  >
    {priority ? LABELS[priority] : '·'}
  </button>
{:else if priority}
  <span class="priority-badge priority-{priority}" aria-label="priority {priority}">
    {LABELS[priority]}
  </span>
{/if}

<style>
  .priority-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 18px;
    padding: 0 6px;
    font-size: 11px;
    font-weight: 700;
    border-radius: 4px;
    line-height: 1;
    user-select: none;
    vertical-align: middle;
    font-family: inherit;
  }

  button.priority-badge {
    appearance: none;
    border: 0;
    cursor: pointer;
    font: inherit;
    font-size: 11px;
    font-weight: 700;
  }

  .priority-blocker {
    background: var(--priority-blocker);
    color: #ffffff;
  }

  .priority-high {
    background: var(--priority-high);
    color: #ffffff;
  }

  .priority-low {
    background: var(--priority-low-bg);
    color: var(--priority-low-fg);
    border: 1px solid var(--border);
  }

  .priority-empty {
    background: transparent;
    color: var(--text-muted);
    border: 1px dashed var(--border);
    opacity: 0;
    transition: opacity 0.1s ease;
  }

  /* `.add-on-hover` mirror: reveal the placeholder when the card is
     hovered or the button itself is focused. The TaskCard hover scope
     gets us here because PriorityBadge is rendered inside .task-card. */
  :global(.task-card:hover) .priority-empty,
  .priority-empty:focus-visible {
    opacity: 1;
  }
</style>
