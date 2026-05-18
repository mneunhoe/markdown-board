<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    name: string;
    count: number;
    children?: Snippet;
  }

  const { name, count, children }: Props = $props();
</script>

<section class="column" aria-label="Section {name}">
  <header class="column-header">
    <span class="column-title">{name}</span>
    <span class="count" aria-label="{count} tasks">{count}</span>
  </header>
  <div class="cards">
    {@render children?.()}
  </div>
</section>

<style>
  .column {
    display: flex;
    flex-direction: column;
    background: var(--bg-secondary);
    border-radius: 12px;
    min-width: 280px;
    flex: 1;
  }

  .column-header {
    padding: 16px 18px;
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .column-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    flex: 1;
  }

  .count {
    background: var(--bg-card);
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
    flex-shrink: 0;
    margin-left: 8px;
  }

  .cards {
    flex: 1;
    overflow-y: auto;
    padding: 0 12px 12px;
    min-height: 100px;
  }
</style>
