<script lang="ts">
  // Seven-column day board. Reads the live vault + handlers from the shell's
  // view context; buckets tasks by `day` via core; drag-to-set-day mutates the
  // task through the plugin api. Ported from dashboard.html (~3491–3598).
  import {
    WEEK_DAYS,
    bucketTasksByDay,
    weekDates,
    weekStart,
    type Day,
  } from '@markdown-board/core';
  import { TaskCard, getViewContext } from '@markdown-board/ui';

  import { getApi } from './context.js';

  const DAY_FULL: Record<Day, string> = {
    Mon: 'Monday',
    Tue: 'Tuesday',
    Wed: 'Wednesday',
    Thu: 'Thursday',
    Fri: 'Friday',
    Sat: 'Saturday',
    Sun: 'Sunday',
  };

  const view = getViewContext();
  const vault = $derived(view.getVault());
  const handlers = $derived(view.getHandlers());
  const buckets = $derived(bucketTasksByDay(vault));

  const dates = weekDates(weekStart(new Date()));

  function isToday(d: Date): boolean {
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  function fmtDate(d: Date): string {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  let dragOverDay = $state<Day | null>(null);

  function onCardDragStart(event: DragEvent, taskId: string, sectionId: string): void {
    event.dataTransfer?.setData('text/plain', JSON.stringify({ taskId, sectionId }));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  function onColumnDragOver(event: DragEvent, day: Day): void {
    event.preventDefault();
    dragOverDay = day;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  function onColumnDrop(event: DragEvent, day: Day): void {
    event.preventDefault();
    dragOverDay = null;
    const raw = event.dataTransfer?.getData('text/plain');
    if (!raw) return;
    let ref: { taskId: string; sectionId: string };
    try {
      ref = JSON.parse(raw) as { taskId: string; sectionId: string };
    } catch {
      return;
    }
    getApi()?.tasks.mutate(ref, (task) => {
      task.day = day;
    });
  }
</script>

<div class="week-board" data-testid="week-board">
  {#each WEEK_DAYS as day, i (day)}
    {@const refs = buckets[day]}
    <section
      class="week-column"
      class:today={isToday(dates[i]!)}
      class:drag-over={dragOverDay === day}
      data-day={day}
      role="list"
      aria-label={DAY_FULL[day]}
      ondragover={(e) => onColumnDragOver(e, day)}
      ondragleave={() => (dragOverDay = null)}
      ondrop={(e) => onColumnDrop(e, day)}
    >
      <header class="week-column-header">
        <span class="week-day">{DAY_FULL[day]}</span>
        <span class="week-date">{fmtDate(dates[i]!)}</span>
        <span class="week-count">{refs.length}</span>
      </header>
      <div class="week-cards">
        {#each refs as ref (ref.sectionId + ':' + ref.task.id)}
          <div
            class="week-card"
            role="listitem"
            draggable="true"
            ondragstart={(e) => onCardDragStart(e, ref.task.id, ref.sectionId)}
          >
            <TaskCard
              task={ref.task}
              sectionId={ref.sectionId}
              {...handlers.onResolve
                ? {
                    onResolve: () =>
                      handlers.onResolve?.({ taskId: ref.task.id, sectionId: ref.sectionId }),
                  }
                : {}}
              {...handlers.onFullTaskEdit
                ? {
                    onFullEdit: () =>
                      handlers.onFullTaskEdit?.({ taskId: ref.task.id, sectionId: ref.sectionId }),
                  }
                : {}}
            />
          </div>
        {/each}
        {#if refs.length === 0}
          <p class="week-empty">—</p>
        {/if}
      </div>
    </section>
  {/each}
</div>

<style>
  .week-board {
    display: grid;
    grid-template-columns: repeat(7, minmax(160px, 1fr));
    gap: 10px;
    align-items: start;
  }

  .week-column {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px;
    background: var(--bg-secondary);
    min-height: 120px;
  }

  .week-column.today {
    border-color: var(--accent);
  }

  .week-column.drag-over {
    background: var(--bg-hover, rgba(0, 0, 0, 0.04));
  }

  .week-column-header {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .week-day {
    font-weight: 600;
    font-size: 13px;
  }

  .week-date {
    font-size: 11px;
    color: var(--text-muted);
  }

  .week-count {
    margin-left: auto;
    font-size: 11px;
    color: var(--text-muted);
  }

  .week-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .week-empty {
    color: var(--text-muted);
    text-align: center;
    margin: 8px 0;
  }
</style>
