<script lang="ts">
  import type { Priority } from '@markdown-board/core';

  interface Props {
    priority: Priority;
  }

  const { priority }: Props = $props();

  const LABELS = {
    blocker: 'P0',
    high: 'P1',
    low: 'P3',
  } as const satisfies Record<Exclude<Priority, null>, string>;
</script>

{#if priority}
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
</style>
