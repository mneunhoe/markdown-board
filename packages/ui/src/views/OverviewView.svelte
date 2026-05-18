<script lang="ts">
  import type { Day, LibraryDoc, Priority, Vault } from '@markdown-board/core';
  import { WEEK_DAYS } from '@markdown-board/core';
  import EmptyState from '../components/EmptyState.svelte';

  interface Props {
    vault: Vault;
    /** Optional library docs — when provided, the overview surfaces a count
     * of library entries alongside the task stats. */
    libraryDocs?: LibraryDoc[];
    emptyTitle?: string;
    emptyHint?: string;
  }

  const {
    vault,
    libraryDocs = [],
    emptyTitle = 'Nothing to summarise yet',
    emptyHint = 'Open a vault with a TASKS.md to see counts and breakdowns here.',
  }: Props = $props();

  const allTasks = $derived(vault.sections.flatMap((s) => s.tasks));
  const total = $derived(allTasks.length);

  const sectionCounts = $derived(
    vault.sections.map((s) => ({ id: s.id, name: s.name, count: s.tasks.length })),
  );

  const priorityCounts = $derived.by(() => {
    const counts: Record<NonNullable<Priority>, number> = { blocker: 0, high: 0, low: 0 };
    for (const t of allTasks) {
      if (t.priority) counts[t.priority]++;
    }
    return counts;
  });

  const dayCounts = $derived.by(() => {
    const counts: Record<Day, number> = {
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
      Sun: 0,
    };
    for (const t of allTasks) {
      if (t.day) counts[t.day]++;
    }
    return counts;
  });

  const checkedCount = $derived(allTasks.filter((t) => t.checked).length);
  const openCount = $derived(total - checkedCount);

  const hasData = $derived(total > 0 || libraryDocs.length > 0);
</script>

{#if hasData}
  <div class="overview-view">
    <div class="stats" aria-label="Vault stats">
      <div class="stat">
        <div class="stat-value">{total}</div>
        <div class="stat-label">tasks</div>
      </div>
      <div class="stat">
        <div class="stat-value">{openCount}</div>
        <div class="stat-label">open</div>
      </div>
      <div class="stat">
        <div class="stat-value">{checkedCount}</div>
        <div class="stat-label">checked</div>
      </div>
      <div class="stat">
        <div class="stat-value">{libraryDocs.length}</div>
        <div class="stat-label">library</div>
      </div>
    </div>

    {#if sectionCounts.length > 0}
      <section class="breakdown" aria-label="Tasks by section">
        <h3>By section</h3>
        <ul>
          {#each sectionCounts as s (s.id)}
            <li>
              <span class="breakdown-label">{s.name}</span>
              <span class="breakdown-value">{s.count}</span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if priorityCounts.blocker + priorityCounts.high + priorityCounts.low > 0}
      <section class="breakdown" aria-label="Tasks by priority">
        <h3>By priority</h3>
        <ul>
          <li>
            <span class="breakdown-label">P0 blocker</span><span class="breakdown-value"
              >{priorityCounts.blocker}</span
            >
          </li>
          <li>
            <span class="breakdown-label">P1 high</span><span class="breakdown-value"
              >{priorityCounts.high}</span
            >
          </li>
          <li>
            <span class="breakdown-label">P3 low</span><span class="breakdown-value"
              >{priorityCounts.low}</span
            >
          </li>
        </ul>
      </section>
    {/if}

    {#if WEEK_DAYS.some((d) => dayCounts[d] > 0)}
      <section class="breakdown" aria-label="Tasks by day">
        <h3>By day</h3>
        <ul>
          {#each WEEK_DAYS as d (d)}
            <li>
              <span class="breakdown-label">{d}</span>
              <span class="breakdown-value">{dayCounts[d]}</span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
{:else}
  <EmptyState title={emptyTitle} hint={emptyHint} />
{/if}

<style>
  .overview-view {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 4px 4px 24px;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
  }

  .stat {
    background: var(--bg-card);
    border: 1px solid var(--border-light);
    border-radius: 12px;
    padding: 16px 18px;
    text-align: center;
    box-shadow: 0 1px 3px var(--shadow);
  }

  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.1;
  }

  .stat-label {
    margin-top: 4px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .breakdown {
    background: var(--bg-card);
    border: 1px solid var(--border-light);
    border-radius: 12px;
    padding: 16px 18px;
    box-shadow: 0 1px 3px var(--shadow);
  }

  .breakdown h3 {
    margin: 0 0 10px 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .breakdown ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .breakdown li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 13px;
    color: var(--text-primary);
  }

  .breakdown-value {
    font-weight: 600;
    color: var(--text-secondary);
  }
</style>
