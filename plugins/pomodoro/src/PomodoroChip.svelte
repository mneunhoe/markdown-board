<script lang="ts">
  import {
    pomo,
    isRunning,
    isPaused,
    phaseLabel,
    remainingMs,
    formatTime,
    streak,
    playClicked,
    stop,
  } from './state.svelte.js';

  const time = $derived(formatTime(remainingMs()));
  const label = $derived(phaseLabel());
  const running = $derived(isRunning());
  const paused = $derived(isPaused());
  const dots = $derived(streak());
  const idle = $derived(pomo.phase === 'idle');
</script>

<div class="pomodoro-chip" class:running data-testid="pomodoro-chip" data-phase={pomo.phase}>
  <button
    type="button"
    class="pomo-btn pomo-play"
    aria-label={running ? 'Pause pomodoro' : paused ? 'Resume pomodoro' : 'Start pomodoro'}
    title={label}
    onclick={playClicked}>{running ? '⏸' : '▶'}</button
  >
  {#if !idle}
    <button type="button" class="pomo-btn pomo-stop" aria-label="Stop pomodoro" onclick={stop}
      >■</button
    >
  {/if}
  <span class="pomo-time" data-testid="pomodoro-time">{time}</span>
  <span class="pomo-phase">{label}</span>
  <span class="pomo-streak" aria-hidden="true">
    {#each Array(dots.total) as _, i (i)}
      <span class="dot" class:filled={i < dots.filled}>{i < dots.filled ? '●' : '○'}</span>
    {/each}
  </span>
  {#if pomo.currentTaskTitle}
    <span class="pomo-task" title={pomo.currentTaskTitle}>· {pomo.currentTaskTitle}</span>
  {/if}
</div>

<style>
  .pomodoro-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--bg-secondary);
    font-size: 13px;
    color: var(--text-secondary);
  }

  .pomodoro-chip.running {
    border-color: var(--accent);
    color: var(--text-primary);
  }

  .pomo-btn {
    appearance: none;
    background: transparent;
    border: 0;
    color: inherit;
    cursor: pointer;
    font-size: 12px;
    line-height: 1;
    padding: 2px;
  }

  .pomo-btn:hover {
    color: var(--accent);
  }

  .pomo-time {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    min-width: 38px;
    text-align: right;
  }

  .pomo-phase {
    font-size: 12px;
  }

  .pomo-streak {
    display: inline-flex;
    gap: 1px;
    font-size: 8px;
    color: var(--accent);
  }

  .pomo-task {
    font-style: italic;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
