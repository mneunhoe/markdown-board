<script lang="ts">
  import type { SearchResult } from '../lib/search.js';

  interface Props {
    open: boolean;
    search: (query: string) => SearchResult[];
    onJump: (result: SearchResult) => void;
    onClose: () => void;
  }

  const { open, search, onJump, onClose }: Props = $props();

  let query = $state('');
  let selected = $state(0);
  let inputEl = $state<HTMLInputElement | null>(null);

  const results = $derived(query.trim() === '' ? [] : search(query));

  $effect(() => {
    if (open) {
      query = '';
      selected = 0;
      queueMicrotask(() => inputEl?.focus());
    }
  });
  $effect(() => {
    if (selected >= results.length) selected = Math.max(0, results.length - 1);
  });

  function jump(result: SearchResult | undefined): void {
    if (!result) return;
    onClose();
    onJump(result);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.length > 0) selected = (selected + 1) % results.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length > 0) selected = (selected - 1 + results.length) % results.length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      jump(results[selected]);
    }
  }

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) onClose();
  }
</script>

{#if open}
  <div
    class="search-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Search"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    tabindex="-1"
  >
    <div class="search" role="document">
      <input
        bind:this={inputEl}
        bind:value={query}
        class="search-input"
        type="text"
        placeholder="Search tasks and library…"
        aria-label="Search query"
        data-testid="search-input"
        autocomplete="off"
        spellcheck="false"
      />
      {#if query.trim() === ''}
        <p class="search-hint" data-testid="search-hint">Type to search across tasks and notes.</p>
      {:else if results.length === 0}
        <p class="search-hint" data-testid="search-empty">No results</p>
      {:else}
        <ul class="search-list" role="listbox" aria-label="Search results">
          {#each results as result, i (result.id)}
            <li>
              <button
                type="button"
                class="search-item"
                class:selected={i === selected}
                role="option"
                aria-selected={i === selected}
                data-testid="search-item"
                onclick={() => jump(result)}
                onmousemove={() => (selected = i)}
              >
                <span class="search-item-head">
                  <span class="search-item-type">{result.type}</span>
                  <span class="search-item-title">{result.title}</span>
                  <span class="search-item-context">{result.context}</span>
                </span>
                {#if result.snippet}
                  <span class="search-item-snippet">{result.snippet}</span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
{/if}

<style>
  .search-overlay {
    position: fixed;
    inset: 0;
    background: rgba(20, 20, 19, 0.5);
    z-index: 200;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 12vh;
    font-family: inherit;
  }

  .search {
    background: var(--bg-card);
    border-radius: 12px;
    width: 90%;
    max-width: 620px;
    max-height: 72vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(20, 20, 19, 0.2);
  }

  .search-input {
    appearance: none;
    border: 0;
    border-bottom: 1px solid var(--border);
    background: transparent;
    color: var(--text-primary);
    font-family: inherit;
    font-size: 16px;
    padding: 16px 20px;
    outline: none;
  }

  .search-hint {
    margin: 0;
    padding: 16px 20px;
    color: var(--text-muted);
    font-size: 14px;
  }

  .search-list {
    list-style: none;
    margin: 0;
    padding: 6px;
    overflow-y: auto;
  }

  .search-item {
    appearance: none;
    width: 100%;
    text-align: left;
    background: transparent;
    border: 0;
    border-radius: 8px;
    color: var(--text-primary);
    cursor: pointer;
    font-family: inherit;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .search-item.selected {
    background: var(--bg-secondary);
  }

  .search-item-head {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .search-item-type {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--bg-card);
    background: var(--text-muted);
    border-radius: 4px;
    padding: 1px 5px;
    flex-shrink: 0;
  }

  .search-item-title {
    font-size: 14px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .search-item-context {
    font-size: 12px;
    color: var(--text-muted);
    margin-left: auto;
    flex-shrink: 0;
  }

  .search-item-snippet {
    font-size: 12px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
