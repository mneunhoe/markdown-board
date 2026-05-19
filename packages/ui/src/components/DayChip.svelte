<script lang="ts">
  import type { Day } from '@markdown-board/core';

  interface Props {
    day: Day | null;
    /**
     * When provided, the chip becomes a button that opens the host's day
     * picker. Empty day renders as a low-opacity "+ Day" affordance
     * revealed on card hover (matches `dashboard.html:2944-2952`).
     */
    onEdit?: () => void;
  }

  const { day, onEdit }: Props = $props();
  const editable = $derived(onEdit !== undefined);

  const DAY_VAR = {
    Mon: 'var(--day-mon)',
    Tue: 'var(--day-tue)',
    Wed: 'var(--day-wed)',
    Thu: 'var(--day-thu)',
    Fri: 'var(--day-fri)',
    Sat: 'var(--day-sat)',
    Sun: 'var(--day-sun)',
  } as const satisfies Record<Day, string>;
</script>

{#if day && editable}
  <button
    type="button"
    class="day-chip cyclable"
    style:--day-color={DAY_VAR[day]}
    aria-label="day {day} (click to change)"
    title="Day: {day} (click to change)"
    data-testid="day-chip"
    onclick={onEdit}
  >
    {day}
  </button>
{:else if day}
  <span class="day-chip" style:--day-color={DAY_VAR[day]} aria-label="day {day}">
    {day}
  </span>
{:else if editable}
  <button
    type="button"
    class="day-chip day-empty"
    aria-label="Schedule for a day"
    title="Schedule for a day"
    data-testid="day-add"
    onclick={onEdit}
  >
    + Day
  </button>
{/if}

<style>
  .day-chip {
    --day-color: var(--text-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 2px 7px;
    border-radius: 4px;
    background: var(--day-color);
    color: #ffffff;
    line-height: 1.2;
    vertical-align: middle;
    user-select: none;
    font-family: inherit;
  }

  button.day-chip {
    appearance: none;
    border: 0;
    cursor: pointer;
    font: inherit;
    font-size: 10px;
    font-weight: 700;
  }

  .day-empty {
    background: transparent;
    color: var(--text-muted);
    border: 1px dashed var(--border);
    opacity: 0;
    transition: opacity 0.1s ease;
  }

  :global(.task-card:hover) .day-empty,
  .day-empty:focus-visible {
    opacity: 1;
  }
</style>
