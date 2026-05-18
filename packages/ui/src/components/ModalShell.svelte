<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    title: string;
    onClose?: () => void;
    /** Modal body. */
    children?: Snippet;
    /** Optional footer (e.g. action buttons). */
    footer?: Snippet;
  }

  const { open, title, onClose, children, footer }: Props = $props();

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) onClose?.();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose?.();
    }
  }
</script>

<svelte:window onkeydown={open ? handleKeydown : null} />

{#if open}
  <div
    class="modal-overlay visible"
    role="dialog"
    aria-modal="true"
    aria-label={title}
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    tabindex="-1"
  >
    <div class="modal" role="document">
      <header class="modal-header">
        <h3>{title}</h3>
        <button type="button" class="modal-close" aria-label="Close" onclick={() => onClose?.()}>
          &times;
        </button>
      </header>
      <div class="modal-body">
        {@render children?.()}
      </div>
      {#if footer}
        <footer class="modal-footer">
          {@render footer()}
        </footer>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(20, 20, 19, 0.5);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
  }

  .modal {
    background: var(--bg-card);
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    max-height: 85vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(20, 20, 19, 0.2);
  }

  .modal-header {
    padding: 20px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .modal-close {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  .modal-close:hover {
    color: var(--text-primary);
  }

  .modal-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .modal-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
</style>
