<script lang="ts">
  import { filterCommands, type Command } from '../lib/commands.js';

  interface Props {
    open: boolean;
    commands: Command[];
    onClose: () => void;
  }

  const { open, commands, onClose }: Props = $props();

  let query = $state('');
  let selected = $state(0);
  let inputEl = $state<HTMLInputElement | null>(null);

  const results = $derived(filterCommands(commands, query));

  // Reset + focus whenever the palette opens; clamp the selection whenever
  // the result list shrinks below the current index.
  $effect(() => {
    if (open) {
      query = '';
      selected = 0;
      // Focus after the input is in the DOM.
      queueMicrotask(() => inputEl?.focus());
    }
  });
  $effect(() => {
    if (selected >= results.length) selected = Math.max(0, results.length - 1);
  });

  async function runCommand(command: Command | undefined): Promise<void> {
    if (!command) return;
    onClose();
    await command.run();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.length > 0) selected = (selected + 1) % results.length;
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length > 0) selected = (selected - 1 + results.length) % results.length;
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      void runCommand(results[selected]);
    }
  }

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) onClose();
  }
</script>

{#if open}
  <div
    class="palette-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Command palette"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    tabindex="-1"
  >
    <div class="palette" role="document">
      <input
        bind:this={inputEl}
        bind:value={query}
        class="palette-input"
        type="text"
        placeholder="Type a command…"
        aria-label="Command"
        data-testid="palette-input"
        autocomplete="off"
        spellcheck="false"
      />
      {#if results.length === 0}
        <p class="palette-empty" data-testid="palette-empty">No matching commands</p>
      {:else}
        <ul class="palette-list" role="listbox" aria-label="Commands">
          {#each results as command, i (command.id)}
            <li>
              <button
                type="button"
                class="palette-item"
                class:selected={i === selected}
                role="option"
                aria-selected={i === selected}
                data-testid="palette-item"
                onclick={() => runCommand(command)}
                onmousemove={() => (selected = i)}
              >
                <span class="palette-item-title">{command.title}</span>
                {#if command.group}
                  <span class="palette-item-group">{command.group}</span>
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
  .palette-overlay {
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

  .palette {
    background: var(--bg-card);
    border-radius: 12px;
    width: 90%;
    max-width: 560px;
    max-height: 70vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(20, 20, 19, 0.2);
  }

  .palette-input {
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

  .palette-empty {
    margin: 0;
    padding: 16px 20px;
    color: var(--text-muted);
    font-size: 14px;
  }

  .palette-list {
    list-style: none;
    margin: 0;
    padding: 6px;
    overflow-y: auto;
  }

  .palette-item {
    appearance: none;
    width: 100%;
    text-align: left;
    background: transparent;
    border: 0;
    border-radius: 8px;
    color: var(--text-primary);
    cursor: pointer;
    font-family: inherit;
    font-size: 14px;
    padding: 10px 14px;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  .palette-item.selected {
    background: var(--bg-secondary);
  }

  .palette-item-group {
    color: var(--text-muted);
    font-size: 12px;
    flex-shrink: 0;
  }
</style>
