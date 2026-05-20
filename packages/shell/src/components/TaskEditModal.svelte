<script lang="ts">
  import { WEEK_DAYS, emitTaskBlock, parseTaskBlock } from '@markdown-board/core';
  import type { Day, GrammarProfileId, Priority, Subtask, Task } from '@markdown-board/core';
  import { ModalShell } from '@markdown-board/ui';

  interface Props {
    /** Non-null `task` opens the modal; null closes it. */
    task: Task | null;
    /** Known projects across the vault (drives the `<datalist>`). */
    suggestions: string[];
    /** Token encoding for the raw markdown tab. Defaults to `default`. */
    profile?: GrammarProfileId;
    onConfirm: (next: Task) => void;
    onCancel: () => void;
  }

  const { task, suggestions, profile, onConfirm, onCancel }: Props = $props();

  // Local form state — initialised on each open from the supplied task.
  // Subtasks are deep-cloned so Cancel can revert without touching the
  // original.
  let tab = $state<'form' | 'raw'>('form');
  let title = $state('');
  let note = $state('');
  let project = $state('');
  let day = $state<Day | null>(null);
  let priority = $state<Priority>(null);
  let pomodoros = $state(0);
  let subtasks = $state<Subtask[]>([]);
  let rawValue = $state('');
  let rawError = $state<string | null>(null);

  $effect(() => {
    if (task === null) return;
    title = task.title;
    note = task.note;
    project = task.project ?? '';
    day = task.day;
    priority = task.priority;
    pomodoros = task.pomodoros;
    subtasks = task.subtasks.map((s) => ({ ...s }));
    tab = 'form';
    rawError = null;
    // Pre-fill the raw textarea lazily — only when the user switches to
    // that tab the first time per open. Otherwise the raw text and the
    // form fields could drift and the user would be confused which one
    // wins. See `switchTo('raw')` below.
    rawValue = '';
  });

  function switchTo(next: 'form' | 'raw'): void {
    if (next === tab) return;
    if (next === 'raw') {
      // Form → Raw: serialize the current form state into markdown.
      rawValue = emitTaskBlock(buildTaskFromForm(), { profile });
      rawError = null;
    } else {
      // Raw → Form: parse the raw markdown back into form fields. If
      // parsing fails we surface the error and stay on the raw tab.
      const parsed = parseTaskBlock(rawValue, { profile });
      if (!parsed) {
        rawError = 'Couldn’t parse the markdown — expected one `- [ ]` task line.';
        return;
      }
      title = parsed.title;
      note = parsed.note;
      project = parsed.project ?? '';
      day = parsed.day;
      priority = parsed.priority;
      pomodoros = parsed.pomodoros;
      subtasks = parsed.subtasks.map((s) => ({ ...s }));
      rawError = null;
    }
    tab = next;
  }

  function buildTaskFromForm(): Task {
    return {
      // `id` and `checked` are preserved by `setTask` in the host shell;
      // putting the originals here keeps the type complete.
      id: task?.id ?? '',
      checked: task?.checked ?? false,
      title: title.trim(),
      note: note.trim(),
      // `resolution` is archive-only metadata (slice 6h) — the inline
      // form editor never exposes it; preserve whatever the original
      // task carried so the round-trip stays non-lossy.
      resolution: task?.resolution ?? '',
      priority,
      project: project.trim() ? project.trim() : null,
      day,
      pomodoros: Math.max(0, Math.floor(pomodoros) || 0),
      subtasks: subtasks
        .map((s) => ({ text: s.text.trim(), checked: s.checked }))
        .filter((s) => s.text !== ''),
    };
  }

  function buildTaskFromRaw(): Task | null {
    const parsed = parseTaskBlock(rawValue, { profile });
    if (!parsed) return null;
    return {
      ...parsed,
      id: task?.id ?? parsed.id,
      checked: task?.checked ?? parsed.checked,
    };
  }

  function confirm(): void {
    if (tab === 'raw') {
      const next = buildTaskFromRaw();
      if (!next) {
        rawError = 'Couldn’t parse the markdown — expected one `- [ ]` task line.';
        return;
      }
      onConfirm(next);
    } else {
      const next = buildTaskFromForm();
      if (!next.title) return; // title is required
      onConfirm(next);
    }
  }

  function addSubtask(): void {
    subtasks = [...subtasks, { text: '', checked: false }];
  }

  function removeSubtask(i: number): void {
    subtasks = subtasks.filter((_, idx) => idx !== i);
  }

  function onModalKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      confirm();
    }
  }
</script>

<ModalShell open={task !== null} title="Edit task" onClose={onCancel}>
  <div class="editor-body" onkeydown={onModalKeydown} role="presentation">
    <div class="tab-strip" role="tablist" aria-label="Edit mode">
      <button
        type="button"
        class="tab-btn"
        class:active={tab === 'form'}
        role="tab"
        aria-selected={tab === 'form'}
        data-testid="task-edit-tab-form"
        onclick={() => switchTo('form')}>Form</button
      >
      <button
        type="button"
        class="tab-btn"
        class:active={tab === 'raw'}
        role="tab"
        aria-selected={tab === 'raw'}
        data-testid="task-edit-tab-raw"
        onclick={() => switchTo('raw')}>Raw markdown</button
      >
    </div>

    {#if tab === 'form'}
      <div class="grid">
        <label for="task-edit-title">Title</label>
        <input id="task-edit-title" type="text" data-testid="task-edit-title" bind:value={title} />

        <label for="task-edit-note">Note</label>
        <textarea id="task-edit-note" rows="2" data-testid="task-edit-note" bind:value={note}
        ></textarea>

        <label for="task-edit-project">Project</label>
        <input
          id="task-edit-project"
          list="task-edit-project-list"
          type="text"
          data-testid="task-edit-project"
          bind:value={project}
          placeholder="empty to clear"
          autocomplete="off"
        />
        <datalist id="task-edit-project-list">
          {#each suggestions as suggestion}
            <option value={suggestion}></option>
          {/each}
        </datalist>

        <span class="grid-label">Day</span>
        <div class="day-row" data-testid="task-edit-day-row">
          <button
            type="button"
            class="day-btn"
            class:active={day === null}
            data-testid="task-edit-day-clear"
            onclick={() => (day = null)}>None</button
          >
          {#each WEEK_DAYS as d}
            <button
              type="button"
              class="day-btn"
              class:active={day === d}
              data-testid="task-edit-day-{d}"
              onclick={() => (day = d)}>{d}</button
            >
          {/each}
        </div>

        <span class="grid-label">Priority</span>
        <div class="priority-row" data-testid="task-edit-priority-row">
          <button
            type="button"
            class="prio-btn"
            class:active={priority === null}
            data-testid="task-edit-priority-none"
            onclick={() => (priority = null)}>None</button
          >
          <button
            type="button"
            class="prio-btn p0"
            class:active={priority === 'blocker'}
            data-testid="task-edit-priority-blocker"
            onclick={() => (priority = 'blocker')}>P0</button
          >
          <button
            type="button"
            class="prio-btn p1"
            class:active={priority === 'high'}
            data-testid="task-edit-priority-high"
            onclick={() => (priority = 'high')}>P1</button
          >
          <button
            type="button"
            class="prio-btn p3"
            class:active={priority === 'low'}
            data-testid="task-edit-priority-low"
            onclick={() => (priority = 'low')}>P3</button
          >
        </div>

        <label for="task-edit-pomodoros">Pomodoros</label>
        <input
          id="task-edit-pomodoros"
          type="number"
          min="0"
          data-testid="task-edit-pomodoros"
          bind:value={pomodoros}
        />
      </div>

      <fieldset class="subtask-list" data-testid="task-edit-subtask-list">
        <legend>Subtasks</legend>
        {#each subtasks as sub, i (i)}
          <div class="subtask-row">
            <input
              type="checkbox"
              data-testid="task-edit-subtask-checkbox-{i}"
              bind:checked={sub.checked}
            />
            <input
              type="text"
              data-testid="task-edit-subtask-text-{i}"
              bind:value={sub.text}
              placeholder="Subtask text"
            />
            <button
              type="button"
              class="subtask-del"
              aria-label="Remove subtask {i + 1}"
              data-testid="task-edit-subtask-del-{i}"
              onclick={() => removeSubtask(i)}>×</button
            >
          </div>
        {/each}
        <button
          type="button"
          class="subtask-add"
          data-testid="task-edit-subtask-add"
          onclick={addSubtask}>+ Add subtask</button
        >
      </fieldset>
    {:else}
      <label class="raw-label" for="task-edit-raw">Raw task block</label>
      <textarea
        id="task-edit-raw"
        class="raw-textarea"
        data-testid="task-edit-raw"
        bind:value={rawValue}
        spellcheck="false"
      ></textarea>
      {#if rawError}
        <p class="raw-error" role="alert" data-testid="task-edit-raw-error">{rawError}</p>
      {/if}
      <p class="hint">
        Tokens: <code>[P0]</code> / <code>[P1]</code> / <code>[P3]</code>,
        <code>[project:Name]</code>, <code>[Mon]</code>…<code>[Sun]</code>,
        <code>[pom:N]</code>. Subtasks are two-space-indented <code>- [ ]</code> lines.
      </p>
    {/if}

    <p class="shortcut">⌘/Ctrl + Enter to save</p>
  </div>

  {#snippet footer()}
    <button type="button" class="btn cancel" data-testid="task-edit-cancel" onclick={onCancel}
      >Cancel</button
    >
    <button type="button" class="btn confirm" data-testid="task-edit-save" onclick={confirm}
      >Save</button
    >
  {/snippet}
</ModalShell>

<style>
  .editor-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .tab-strip {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--border-light);
    padding-bottom: 4px;
  }

  .tab-btn {
    appearance: none;
    background: transparent;
    border: 0;
    color: var(--text-muted);
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    padding: 6px 12px;
    border-radius: 6px 6px 0 0;
    cursor: pointer;
  }

  .tab-btn:hover {
    color: var(--text-primary);
  }

  .tab-btn.active {
    color: var(--text-primary);
    background: var(--bg-secondary);
    border-bottom: 2px solid var(--accent);
    margin-bottom: -1px;
  }

  .grid {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 10px 12px;
    align-items: center;
  }

  .grid > label,
  .grid-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    justify-self: end;
  }

  input[type='text'],
  input[type='number'],
  textarea {
    box-sizing: border-box;
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-card);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 13px;
    width: 100%;
  }

  textarea {
    resize: vertical;
  }

  input[type='text']:focus,
  input[type='number']:focus,
  textarea:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.15);
  }

  .day-row,
  .priority-row {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .day-btn,
  .prio-btn {
    appearance: none;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-primary);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
  }

  .day-btn:hover,
  .prio-btn:hover {
    border-color: var(--accent);
  }

  .day-btn.active,
  .prio-btn.active {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
  }

  .subtask-list {
    border: 1px solid var(--border-light);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .subtask-list legend {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    padding: 0 6px;
  }

  .subtask-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .subtask-row input[type='text'] {
    flex: 1;
  }

  .subtask-del {
    appearance: none;
    background: transparent;
    border: 0;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0 6px;
    font-size: 16px;
    line-height: 1;
  }

  .subtask-del:hover {
    color: var(--priority-high, #c0392b);
  }

  .subtask-add {
    appearance: none;
    background: transparent;
    border: 1px dashed var(--border);
    color: var(--text-muted);
    font: inherit;
    font-size: 12px;
    font-style: italic;
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
  }

  .subtask-add:hover {
    border-color: var(--accent);
    color: var(--text-primary);
  }

  .raw-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .raw-textarea {
    min-height: 220px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    line-height: 1.4;
  }

  .raw-error {
    margin: 0;
    padding: 8px 10px;
    border-radius: 6px;
    background: rgba(192, 57, 43, 0.1);
    color: var(--priority-high);
    font-size: 12px;
  }

  .hint {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .hint code {
    background: var(--bg-secondary);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .shortcut {
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
