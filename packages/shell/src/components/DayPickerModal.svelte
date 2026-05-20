<script lang="ts">
  import { WEEK_DAYS, type Day } from '@markdown-board/core';
  import { ModalShell } from '@markdown-board/ui';

  interface Props {
    open: boolean;
    /** Current day for the target task (pre-highlights the matching button). */
    current: Day | null;
    onConfirm: (next: Day | null) => void;
    onCancel: () => void;
  }

  const { open, current, onConfirm, onCancel }: Props = $props();

  function pick(d: Day): void {
    onConfirm(d);
  }

  function clear(): void {
    onConfirm(null);
  }
</script>

<ModalShell {open} title="Schedule for a day" onClose={onCancel}>
  <div class="picker-body">
    <p class="hint">Pick a day, or clear to leave unscheduled.</p>
    <div class="day-grid" data-testid="day-picker-grid">
      {#each WEEK_DAYS as d}
        <button
          type="button"
          class="day-btn"
          class:active={current === d}
          data-testid="day-picker-{d}"
          onclick={() => pick(d)}
        >
          {d}
        </button>
      {/each}
    </div>
  </div>

  {#snippet footer()}
    <button type="button" class="btn cancel" data-testid="day-picker-cancel" onclick={onCancel}
      >Cancel</button
    >
    <button type="button" class="btn confirm" data-testid="day-picker-clear" onclick={clear}
      >Clear</button
    >
  {/snippet}
</ModalShell>

<style>
  .picker-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .hint {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .day-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .day-btn {
    appearance: none;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-primary);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    padding: 10px;
    border-radius: 6px;
    cursor: pointer;
  }

  .day-btn:hover {
    border-color: var(--accent);
  }

  .day-btn.active {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
  }

  .btn {
    appearance: none;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-primary);
    font: inherit;
    font-size: 13px;
    padding: 7px 14px;
    border-radius: 6px;
    cursor: pointer;
  }

  .btn:hover {
    border-color: var(--accent);
  }

  .btn.confirm {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
  }

  .btn.confirm:hover {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
  }
</style>
