<script lang="ts">
  import { ModalShell } from '@markdown-board/ui';

  interface Props {
    /**
     * Non-null open gate: edit an existing file when `path` is set,
     * or create a new file when `path === null` and `mode === 'new'`.
     */
    open: boolean;
    /** Existing file path (e.g. `library/projects/foo.md`) or null for New File. */
    path: string | null;
    /** Initial textarea content. */
    initialContent: string;
    /**
     * Confirm handler. For an existing file, `path` is the original path
     * and `next.content` is the new content. For a new file, the host
     * uses `next.newPath` (constructed from the directory + filename
     * inputs) to write to disk.
     */
    onConfirm: (next: { path: string; content: string }) => void;
    onCancel: () => void;
  }

  const { open, path, initialContent, onConfirm, onCancel }: Props = $props();

  const isNew = $derived(path === null);

  let content = $state('');
  let dirValue = $state('library');
  let nameValue = $state('');
  let textareaEl: HTMLTextAreaElement | undefined = $state();
  let firstInputEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (open) {
      content = initialContent;
      dirValue = 'library';
      nameValue = '';
      queueMicrotask(() => {
        if (isNew) firstInputEl?.focus();
        else textareaEl?.focus();
      });
    }
  });

  function confirm(): void {
    if (isNew) {
      const dir = dirValue.trim().replace(/^\/|\/$/g, '');
      let name = nameValue.trim();
      if (!name) return;
      if (!name.endsWith('.md')) name = `${name}.md`;
      const newPath = dir ? `${dir}/${name}` : name;
      onConfirm({ path: newPath, content });
    } else if (path !== null) {
      onConfirm({ path, content });
    }
  }

  function onTextareaKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      confirm();
    }
  }
</script>

<ModalShell {open} title={isNew ? 'New library file' : `Edit ${path}`} onClose={onCancel}>
  <div class="editor-body">
    {#if isNew}
      <label class="editor-label" for="library-editor-dir">Directory</label>
      <input
        id="library-editor-dir"
        type="text"
        data-testid="library-new-dir"
        bind:this={firstInputEl}
        bind:value={dirValue}
        placeholder="library or library/projects"
      />
      <label class="editor-label" for="library-editor-name">Filename</label>
      <input
        id="library-editor-name"
        type="text"
        data-testid="library-new-name"
        bind:value={nameValue}
        placeholder="my-note.md"
      />
    {/if}
    <label class="editor-label" for="library-editor-textarea">Content</label>
    <textarea
      id="library-editor-textarea"
      data-testid="library-editor-textarea"
      bind:this={textareaEl}
      bind:value={content}
      onkeydown={onTextareaKeydown}
      placeholder={isNew ? '# Title\n\nContents…' : ''}
    ></textarea>
    <p class="hint">⌘/Ctrl + Enter to save</p>
  </div>

  {#snippet footer()}
    <button type="button" class="btn cancel" data-testid="library-editor-cancel" onclick={onCancel}
      >Cancel</button
    >
    <button type="button" class="btn confirm" data-testid="library-editor-save" onclick={confirm}
      >Save</button
    >
  {/snippet}
</ModalShell>

<style>
  .editor-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .editor-label {
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  input,
  textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-card);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 13px;
    line-height: 1.5;
  }

  textarea {
    min-height: 400px;
    resize: vertical;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  input:focus,
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
