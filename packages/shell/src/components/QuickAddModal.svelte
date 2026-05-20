<script lang="ts">
  import { ModalShell } from '@markdown-board/ui';

  interface SectionRef {
    id: string;
    name: string;
  }

  interface Props {
    open: boolean;
    sections: SectionRef[];
    onAdd: (sectionId: string, title: string) => void;
    onClose: () => void;
  }

  const { open, sections, onAdd, onClose }: Props = $props();

  let title = $state('');
  let sectionId = $state('');
  let inputEl = $state<HTMLInputElement | null>(null);

  // Reset + focus on open; default to the first section.
  $effect(() => {
    if (open) {
      title = '';
      sectionId = sections[0]?.id ?? '';
      queueMicrotask(() => inputEl?.focus());
    }
  });

  const canAdd = $derived(title.trim() !== '' && sectionId !== '');

  function submit(): void {
    if (!canAdd) return;
    onAdd(sectionId, title.trim());
    onClose();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  }
</script>

<ModalShell {open} title="New task" {onClose}>
  <div class="quick-add">
    <label class="field">
      <span class="field-label">Title</span>
      <input
        bind:this={inputEl}
        bind:value={title}
        type="text"
        class="text-input"
        placeholder="What needs doing?"
        data-testid="quick-add-title"
        autocomplete="off"
        onkeydown={handleKeydown}
      />
    </label>
    <label class="field">
      <span class="field-label">Section</span>
      <select
        class="select"
        data-testid="quick-add-section"
        onchange={(e) => (sectionId = e.currentTarget.value)}
      >
        {#each sections as section (section.id)}
          <option value={section.id} selected={section.id === sectionId}>{section.name}</option>
        {/each}
      </select>
    </label>
  </div>
  {#snippet footer()}
    <button
      type="button"
      class="ghost-btn"
      data-testid="quick-add-cancel"
      onclick={() => onClose()}
    >
      Cancel
    </button>
    <button
      type="button"
      class="primary-btn"
      data-testid="quick-add-confirm"
      disabled={!canAdd}
      onclick={submit}
    >
      Add task
    </button>
  {/snippet}
</ModalShell>

<style>
  .quick-add {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .text-input,
  .select {
    appearance: auto;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-primary);
    font: inherit;
    font-size: 14px;
    padding: 8px 10px;
    border-radius: 6px;
  }

  .text-input {
    appearance: none;
  }

  .ghost-btn,
  .primary-btn {
    appearance: none;
    border: 1px solid var(--border);
    font: inherit;
    font-size: 13px;
    padding: 6px 14px;
    border-radius: 6px;
    cursor: pointer;
  }

  .ghost-btn {
    background: var(--bg-card);
    color: var(--text-primary);
  }

  .primary-btn {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .primary-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
