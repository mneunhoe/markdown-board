<script lang="ts">
  import { ModalShell } from '@markdown-board/ui';

  interface Props {
    /** Title of the task being resolved. `null` ⇒ modal closed. */
    taskTitle: string | null;
    onConfirm: (resolution: string) => void;
    onCancel: () => void;
  }

  const { taskTitle, onConfirm, onCancel }: Props = $props();

  let resolution = $state('');
  let textareaEl: HTMLTextAreaElement | undefined = $state();

  // Reset and focus on each open.
  $effect(() => {
    if (taskTitle !== null) {
      resolution = '';
      queueMicrotask(() => textareaEl?.focus());
    }
  });

  function confirm(): void {
    onConfirm(resolution);
  }

  function onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      confirm();
    }
  }
</script>

<ModalShell open={taskTitle !== null} title="Resolve task" onClose={onCancel}>
  <div class="resolve-body" onkeydown={onKeydown} role="presentation">
    <p class="task-title" data-testid="resolve-task-title">{taskTitle ?? ''}</p>
    <label class="resolution-label" for="resolution-textarea">
      Resolution note <span class="optional">(optional)</span>
    </label>
    <textarea
      id="resolution-textarea"
      data-testid="resolve-textarea"
      bind:this={textareaEl}
      bind:value={resolution}
      rows="5"
      placeholder="What happened? Any takeaways?"
    ></textarea>
    <p class="hint">⌘/Ctrl + Enter to confirm</p>
  </div>

  {#snippet footer()}
    <button type="button" class="btn cancel" data-testid="resolve-cancel" onclick={onCancel}>
      Cancel
    </button>
    <button type="button" class="btn confirm" data-testid="resolve-confirm" onclick={confirm}>
      Resolve
    </button>
  {/snippet}
</ModalShell>

<style>
  .resolve-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .task-title {
    margin: 0 0 4px;
    padding: 10px 12px;
    background: var(--bg-secondary);
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    word-wrap: break-word;
  }

  .resolution-label {
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .resolution-label .optional {
    color: var(--text-muted);
    font-weight: 400;
  }

  textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-card);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 13px;
    line-height: 1.5;
    resize: vertical;
  }

  textarea:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.15);
  }

  .hint {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
    text-align: right;
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
