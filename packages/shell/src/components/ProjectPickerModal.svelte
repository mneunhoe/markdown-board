<script lang="ts">
  import { ModalShell } from '@markdown-board/ui';

  interface Props {
    /** Open gate: a non-null target opens the modal; null closes it. */
    open: boolean;
    /** Current project tag for the target task (pre-fill). */
    current: string | null;
    /** Known projects across the vault — drives the `<datalist>` suggestions. */
    suggestions: string[];
    onConfirm: (next: string | null) => void;
    onCancel: () => void;
  }

  const { open, current, suggestions, onConfirm, onCancel }: Props = $props();

  let value = $state('');
  let inputEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (open) {
      value = current ?? '';
      queueMicrotask(() => {
        inputEl?.focus();
        inputEl?.select();
      });
    }
  });

  function confirm(): void {
    const trimmed = value.trim();
    onConfirm(trimmed ? trimmed : null);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      confirm();
    }
  }
</script>

<ModalShell {open} title="Project tag" onClose={onCancel}>
  <div class="picker-body" onkeydown={onKeydown} role="presentation">
    <label class="picker-label" for="project-picker-input">
      Project tag <span class="optional">(empty to clear)</span>
    </label>
    <input
      id="project-picker-input"
      list="project-picker-list"
      type="text"
      data-testid="project-picker-input"
      bind:this={inputEl}
      bind:value
      placeholder="e.g. PSD_GAN — production runs"
      autocomplete="off"
    />
    <datalist id="project-picker-list">
      {#each suggestions as suggestion}
        <option value={suggestion}></option>
      {/each}
    </datalist>
    <p class="hint">Press Enter to save.</p>
  </div>

  {#snippet footer()}
    <button type="button" class="btn cancel" data-testid="project-picker-cancel" onclick={onCancel}
      >Cancel</button
    >
    <button type="button" class="btn confirm" data-testid="project-picker-confirm" onclick={confirm}
      >Save</button
    >
  {/snippet}
</ModalShell>

<style>
  .picker-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .picker-label {
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .picker-label .optional {
    color: var(--text-muted);
    font-weight: 400;
  }

  input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-card);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 13px;
  }

  input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.15);
  }

  .hint {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
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
