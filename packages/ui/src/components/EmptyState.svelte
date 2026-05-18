<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    hint?: string;
    /** Optional action area — typically a button. */
    children?: Snippet;
  }

  const { title, hint, children }: Props = $props();
</script>

<div class="empty-state" role="status">
  <p class="empty-title">{title}</p>
  {#if hint}
    <p class="empty-hint">{hint}</p>
  {/if}
  {#if children}
    <div class="empty-action">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .empty-state {
    text-align: center;
    padding: 80px 40px;
    color: var(--text-muted);
    font-family: inherit;
  }

  .empty-title {
    font-size: 16px;
    color: var(--text-secondary);
    margin: 0 0 8px 0;
  }

  .empty-hint {
    font-size: 13px;
    color: var(--text-muted);
    margin: 0;
  }

  .empty-action {
    margin-top: 20px;
  }
</style>
