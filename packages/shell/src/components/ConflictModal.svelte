<script lang="ts">
  interface Props {
    open: boolean;
    /** What we last wrote (the common ancestor). */
    base: string;
    /** Current in-memory content. */
    mine: string;
    /** Content now on disk (edited out-of-band). */
    theirs: string;
    onKeepMine: () => void;
    onTakeTheirs: () => void;
    onApplyMerge: (merged: string) => void;
  }

  const { open, base, mine, theirs, onKeepMine, onTakeTheirs, onApplyMerge }: Props = $props();

  let merged = $state('');
  let showBase = $state(false);

  // Seed the merge editor with the on-disk copy each time the modal opens.
  $effect(() => {
    if (open) {
      merged = theirs;
      showBase = false;
    }
  });
</script>

{#if open}
  <div class="conflict-overlay" role="dialog" aria-modal="true" aria-label="Resolve edit conflict">
    <div class="conflict">
      <header class="conflict-header">
        <h3>TASKS.md changed outside the app</h3>
        <p class="conflict-sub">
          Your unsaved edits and the version on disk have diverged. Pick one, or edit a merged
          version below.
        </p>
      </header>

      <div class="panes">
        <section class="pane">
          <h4>Yours (unsaved)</h4>
          <pre data-testid="conflict-mine">{mine}</pre>
        </section>
        <section class="pane">
          <h4>On disk</h4>
          <pre data-testid="conflict-theirs">{theirs}</pre>
        </section>
      </div>

      <button type="button" class="link-btn" onclick={() => (showBase = !showBase)}>
        {showBase ? 'Hide' : 'Show'} last-saved version
      </button>
      {#if showBase}
        <pre class="base-pane" data-testid="conflict-base">{base}</pre>
      {/if}

      <label class="merge-field">
        <span class="merge-label">Merged result</span>
        <textarea
          bind:value={merged}
          rows="8"
          class="merge-input"
          data-testid="conflict-merge"
          spellcheck="false"
        ></textarea>
      </label>

      <footer class="conflict-actions">
        <button
          type="button"
          class="ghost-btn"
          data-testid="conflict-keep-mine"
          onclick={onKeepMine}
        >
          Keep mine
        </button>
        <button
          type="button"
          class="ghost-btn"
          data-testid="conflict-take-theirs"
          onclick={onTakeTheirs}
        >
          Take theirs
        </button>
        <button
          type="button"
          class="primary-btn"
          data-testid="conflict-apply-merge"
          onclick={() => onApplyMerge(merged)}
        >
          Apply merge
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .conflict-overlay {
    position: fixed;
    inset: 0;
    background: rgba(20, 20, 19, 0.6);
    z-index: 300;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    font-family: inherit;
  }

  .conflict {
    background: var(--bg-card);
    border-radius: 12px;
    width: 100%;
    max-width: 760px;
    max-height: 88vh;
    overflow-y: auto;
    padding: 20px 24px;
    box-shadow: 0 20px 60px rgba(20, 20, 19, 0.25);
  }

  .conflict-header h3 {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .conflict-sub {
    margin: 0 0 16px;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .panes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .pane h4 {
    margin: 0 0 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .pane pre,
  .base-pane {
    margin: 0;
    background: var(--bg-secondary);
    border: 1px solid var(--border-light);
    border-radius: 6px;
    padding: 10px;
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.4;
    max-height: 200px;
    overflow: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .base-pane {
    margin-top: 8px;
  }

  .link-btn {
    appearance: none;
    background: transparent;
    border: 0;
    color: var(--accent);
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    padding: 8px 0;
  }

  .merge-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 8px;
  }

  .merge-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .merge-input {
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-card);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 13px;
    padding: 10px;
    resize: vertical;
  }

  .conflict-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 16px;
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
</style>
