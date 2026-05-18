<script lang="ts">
  import type { Day } from '@markdown-board/core';

  interface Props {
    day: Day | null;
  }

  const { day }: Props = $props();

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

{#if day}
  <span class="day-chip" style:--day-color={DAY_VAR[day]} aria-label="day {day}">
    {day}
  </span>
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
</style>
