<script lang="ts">
  import { toMarkdown } from '@markdown-board/core';
  import type { Day, Section, Task } from '@markdown-board/core';
  import {
    EmptyState,
    type ColumnMoveHandler,
    type DayEditOpenHandler,
    type EditTarget,
    type FullTaskEditHandler,
    type NoteEditHandler,
    type PriorityCycleHandler,
    type ProjectEditOpenHandler,
    type ResolveHandler,
    type SectionRenameHandler,
    type SubtaskAddHandler,
    type SubtaskEditHandler,
    type SubtaskToggleHandler,
    type TaskDeleteHandler,
    type TaskMoveHandler,
    type TitleEditHandler,
  } from '@markdown-board/ui';
  import { FSAFileAdapter } from './lib/adapters/index.js';
  import DayPickerModal from './components/DayPickerModal.svelte';
  import LibraryEditorModal from './components/LibraryEditorModal.svelte';
  import ProjectPickerModal from './components/ProjectPickerModal.svelte';
  import ResolveModal from './components/ResolveModal.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import TaskEditModal from './components/TaskEditModal.svelte';
  import VaultWorkspace from './components/VaultWorkspace.svelte';
  import { applyTheme, loadSettings, saveSettings, type Settings } from './lib/settings.js';
  import {
    Autosaver,
    ExternalChangeWatcher,
    FileSystemAccessUnsupportedError,
    VaultPickerCancelledError,
    addSubtask,
    allProjects,
    appendArchiveEntry,
    cycleTaskPriority,
    deleteTask,
    findTask,
    isFileSystemAccessSupported,
    loadVault,
    moveColumn,
    moveTask,
    pickVaultDirectory,
    removeTask,
    renameSection,
    saveLibraryFile,
    setSubtaskText,
    setTask,
    setTaskDay,
    setTaskNote,
    setTaskProject,
    setTaskTitle,
    toggleSubtask,
    type LoadedVault,
  } from './lib/vault/index.js';

  const TASKS_PATH = 'TASKS.md';

  let loaded = $state<LoadedVault | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let lastWrittenMd = $state<string>('');
  /** Captured at modal-open time so a concurrent external reload can't shift the target. */
  let resolveTarget = $state<{ task: Task; section: Section } | null>(null);
  let resolving = $state(false);
  let settings = $state<Settings>(loadSettings());
  let settingsOpen = $state(false);
  // Slice 6b picker state. A non-null `target` opens the corresponding
  // modal. The target is captured at open-time so a concurrent external
  // reload can't shift the picker between picks.
  let projectPicker = $state<{ target: EditTarget; current: string | null } | null>(null);
  let dayPicker = $state<{ target: EditTarget; current: Day | null } | null>(null);
  // Library editor (slice 6d). `path: null` ⇒ New File dialog.
  let libraryEditor = $state<{ path: string | null; initialContent: string } | null>(null);
  let savingLibrary = $state(false);
  // Full task editor (slice 6e). `target` identifies the task being
  // edited; `snapshot` is captured at open-time so a concurrent external
  // reload can't shift the form data.
  let taskEditor = $state<{ target: EditTarget; snapshot: Task } | null>(null);

  let adapter: FSAFileAdapter | null = null;
  let autosaver: Autosaver | null = null;
  let watcher: ExternalChangeWatcher | null = null;

  const supported = isFileSystemAccessSupported();

  async function pickAndLoad(): Promise<void> {
    error = null;
    loading = true;
    try {
      const handle = await pickVaultDirectory();
      await mountVault(new FSAFileAdapter(handle));
    } catch (err) {
      if (err instanceof VaultPickerCancelledError) return;
      if (err instanceof FileSystemAccessUnsupportedError) {
        error = err.message;
        return;
      }
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  async function mountVault(next: FSAFileAdapter): Promise<void> {
    teardownIo();
    adapter = next;
    const fresh = await loadVault(next);
    const canonical = toMarkdown(fresh.vault);
    lastWrittenMd = canonical;
    loaded = fresh;
    const initialMtime = await safeMtime(next, TASKS_PATH);
    autosaver = new Autosaver({
      write: async (md) => {
        await next.writeFile(TASKS_PATH, md);
        lastWrittenMd = md;
        const mtime = await safeMtime(next, TASKS_PATH);
        watcher?.setBaseline(mtime);
      },
      onError: (err: unknown) => {
        error = `Autosave failed: ${err instanceof Error ? err.message : String(err)}`;
      },
    });
    watcher = new ExternalChangeWatcher({
      getMtime: () => next.getMtime(TASKS_PATH),
      initialMtime,
      isLocalWritePending: () => autosaver?.isPending ?? false,
      onExternalChange: async () => {
        if (!adapter || autosaver?.isPending) return;
        const reloaded = await loadVault(adapter);
        lastWrittenMd = toMarkdown(reloaded.vault);
        loaded = reloaded;
        watcher?.setBaseline(await safeMtime(adapter, TASKS_PATH));
      },
      onError: () => {
        // Transient mtime failures (file briefly missing during external
        // rewrite) are expected — silently skip the tick.
      },
    });
    watcher.start();
  }

  function teardownIo(): void {
    autosaver?.dispose();
    watcher?.dispose();
    autosaver = null;
    watcher = null;
    adapter = null;
  }

  async function safeMtime(a: FSAFileAdapter, path: string): Promise<number> {
    try {
      return await a.getMtime(path);
    } catch {
      return 0;
    }
  }

  const onTaskMove: TaskMoveHandler = (move) => {
    if (!loaded) return;
    moveTask(loaded.vault, move);
  };

  const onColumnMove: ColumnMoveHandler = (move) => {
    if (!loaded) return;
    moveColumn(loaded.vault, move);
  };

  const onResolve: ResolveHandler = (target) => {
    if (!loaded) return;
    const found = findTask(loaded.vault, target);
    if (!found) return;
    resolveTarget = found;
  };

  const onTitleEdit: TitleEditHandler = (target, next) => {
    if (!loaded) return;
    setTaskTitle(loaded.vault, target, next);
  };

  const onNoteEdit: NoteEditHandler = (target, next) => {
    if (!loaded) return;
    setTaskNote(loaded.vault, target, next);
  };

  const onSubtaskEdit: SubtaskEditHandler = (target, idx, next) => {
    if (!loaded) return;
    setSubtaskText(loaded.vault, target, idx, next);
  };

  const onSubtaskAdd: SubtaskAddHandler = (target, text) => {
    if (!loaded) return;
    addSubtask(loaded.vault, target, text);
  };

  const onSubtaskToggle: SubtaskToggleHandler = (target, idx) => {
    if (!loaded) return;
    toggleSubtask(loaded.vault, target, idx);
  };

  const onTaskDelete: TaskDeleteHandler = (target) => {
    if (!loaded) return;
    deleteTask(loaded.vault, target);
  };

  const onPriorityCycle: PriorityCycleHandler = (target) => {
    if (!loaded) return;
    cycleTaskPriority(loaded.vault, target);
  };

  const onProjectEdit: ProjectEditOpenHandler = (target, current) => {
    projectPicker = { target, current };
  };

  const onDayEdit: DayEditOpenHandler = (target, current) => {
    dayPicker = { target, current };
  };

  const onSectionRename: SectionRenameHandler = (sectionId, nextName) => {
    if (!loaded) return;
    const ok = renameSection(loaded.vault, sectionId, nextName);
    if (!ok) {
      error = `Couldn't rename section: a section named "${nextName}" already exists.`;
    } else if (error?.startsWith("Couldn't rename section")) {
      error = null;
    }
  };

  function openLibraryEditor(path: string | null): void {
    if (!loaded) return;
    if (path === null) {
      libraryEditor = { path: null, initialContent: '' };
      return;
    }
    const doc = loaded.libraryDocs.find((d) => d.path === path);
    libraryEditor = { path, initialContent: doc?.rawContent ?? '' };
  }

  async function confirmLibraryEditor(next: { path: string; content: string }): Promise<void> {
    if (!loaded || !adapter || savingLibrary) return;
    savingLibrary = true;
    try {
      await saveLibraryFile(adapter, loaded.libraryDocs, next.path, next.content);
      libraryEditor = null;
    } catch (err) {
      error = `Library save failed: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      savingLibrary = false;
    }
  }

  function cancelLibraryEditor(): void {
    if (savingLibrary) return;
    libraryEditor = null;
  }

  const onFullTaskEdit: FullTaskEditHandler = (target) => {
    if (!loaded) return;
    const found = findTask(loaded.vault, target);
    if (!found) return;
    // Snapshot the task so the modal owns its own form state — mutations
    // on the live proxy from elsewhere (external reload, autosave round-
    // trip) don't leak into the open form.
    taskEditor = {
      target,
      snapshot: { ...found.task, subtasks: found.task.subtasks.map((s) => ({ ...s })) },
    };
  };

  function confirmTaskEditor(next: Task): void {
    if (!loaded || !taskEditor) {
      taskEditor = null;
      return;
    }
    setTask(loaded.vault, taskEditor.target, next);
    taskEditor = null;
  }

  function cancelTaskEditor(): void {
    taskEditor = null;
  }

  function confirmProjectPicker(next: string | null): void {
    if (!projectPicker || !loaded) {
      projectPicker = null;
      return;
    }
    setTaskProject(loaded.vault, projectPicker.target, next);
    projectPicker = null;
  }

  function cancelProjectPicker(): void {
    projectPicker = null;
  }

  function confirmDayPicker(next: Day | null): void {
    if (!dayPicker || !loaded) {
      dayPicker = null;
      return;
    }
    setTaskDay(loaded.vault, dayPicker.target, next);
    dayPicker = null;
  }

  function cancelDayPicker(): void {
    dayPicker = null;
  }

  const projectSuggestions = $derived(loaded ? allProjects(loaded.vault) : []);

  async function confirmResolve(resolution: string): Promise<void> {
    if (!resolveTarget || !adapter || !loaded || resolving) return;
    const { task, section } = resolveTarget;
    resolving = true;
    try {
      // Flush any pending autosave first so the archive entry mirrors what's
      // about to be on disk in TASKS.md.
      await autosaver?.flush();
      await appendArchiveEntry(adapter, task, resolution, section);
      removeTask(loaded.vault, { taskId: task.id, sectionId: section.id });
      resolveTarget = null;
    } catch (err) {
      error = `Resolve failed: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      resolving = false;
    }
  }

  function cancelResolve(): void {
    if (resolving) return;
    resolveTarget = null;
  }

  function handleSettingsChange(next: Settings): void {
    settings = next;
    saveSettings(next);
    applyTheme(next.theme);
  }

  // Autosave $effect — re-runs on any deep mutation of `loaded.vault`
  // (Svelte 5's proxy traverses sections/tasks). Schedules a write when
  // the canonical markdown drifts from what we last wrote.
  //
  // IMPORTANT: read the deep dependencies (loaded.vault via toMarkdown)
  // *before* checking `autosaver`. `autosaver` is a plain `let`, not
  // $state — if we short-circuit on `!autosaver` first, the effect's
  // tracked deps never include `loaded.vault.sections[*].tasks[*]`, so
  // subsequent mutations don't re-run the effect. This bit slice 6a's
  // first end-to-end autosave test: handlers ran, mutations landed in
  // memory, but the disk file was never rewritten.
  $effect(() => {
    if (!loaded) return;
    const md = toMarkdown(loaded.vault);
    if (md === lastWrittenMd) return;
    autosaver?.schedule(md);
  });

  $effect(() => {
    return () => teardownIo();
  });
</script>

<main class="shell">
  <header class="topbar">
    <h1 class="brand">markdown-board</h1>
    <div class="topbar-actions">
      {#if loaded}
        <button
          type="button"
          class="topbar-action"
          onclick={pickAndLoad}
          disabled={loading}
          data-testid="reopen-vault"
        >
          {loading ? 'Loading…' : 'Open another vault…'}
        </button>
      {/if}
      <button
        type="button"
        class="topbar-action"
        aria-label="Open settings"
        data-testid="open-settings"
        onclick={() => (settingsOpen = true)}
      >
        Settings
      </button>
    </div>
  </header>

  <section class="body" class:empty={!loaded}>
    {#if loaded}
      <VaultWorkspace
        vault={loaded.vault}
        libraryDocs={loaded.libraryDocs}
        {onTaskMove}
        {onColumnMove}
        {onResolve}
        {onTitleEdit}
        {onNoteEdit}
        {onSubtaskEdit}
        {onSubtaskAdd}
        {onSubtaskToggle}
        {onTaskDelete}
        {onPriorityCycle}
        {onProjectEdit}
        {onDayEdit}
        {onSectionRename}
        onLibraryEdit={openLibraryEditor}
        {onFullTaskEdit}
      />
    {:else if !supported}
      <EmptyState
        title="File System Access API not supported"
        hint="Open this page in Chrome, Edge, or another Chromium-based browser to pick a vault."
      />
    {:else}
      <EmptyState
        title="No vault open"
        hint="Pick a folder containing TASKS.md and an optional library/ directory."
      >
        <button
          type="button"
          class="primary"
          onclick={pickAndLoad}
          disabled={loading}
          data-testid="pick-vault"
        >
          {loading ? 'Loading…' : 'Pick a vault folder'}
        </button>
      </EmptyState>
    {/if}

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}
  </section>

  <ResolveModal
    taskTitle={resolveTarget?.task.title ?? null}
    onConfirm={confirmResolve}
    onCancel={cancelResolve}
  />

  <SettingsModal
    open={settingsOpen}
    {settings}
    onChange={handleSettingsChange}
    onClose={() => (settingsOpen = false)}
  />

  <ProjectPickerModal
    open={projectPicker !== null}
    current={projectPicker?.current ?? null}
    suggestions={projectSuggestions}
    onConfirm={confirmProjectPicker}
    onCancel={cancelProjectPicker}
  />

  <DayPickerModal
    open={dayPicker !== null}
    current={dayPicker?.current ?? null}
    onConfirm={confirmDayPicker}
    onCancel={cancelDayPicker}
  />

  <LibraryEditorModal
    open={libraryEditor !== null}
    path={libraryEditor?.path ?? null}
    initialContent={libraryEditor?.initialContent ?? ''}
    onConfirm={confirmLibraryEditor}
    onCancel={cancelLibraryEditor}
  />

  <TaskEditModal
    task={taskEditor?.snapshot ?? null}
    suggestions={projectSuggestions}
    onConfirm={confirmTaskEditor}
    onCancel={cancelTaskEditor}
  />
</main>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    padding: 12px 20px;
    background: var(--bg-secondary);
  }

  .brand {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .topbar-actions {
    display: flex;
    gap: 8px;
  }

  .topbar-action {
    appearance: none;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-primary);
    font: inherit;
    font-size: 12px;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
  }

  .topbar-action:hover:not(:disabled) {
    border-color: var(--accent);
  }

  .topbar-action:disabled {
    opacity: 0.6;
    cursor: progress;
  }

  .body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .body.empty {
    align-items: center;
    justify-content: center;
  }

  .primary {
    appearance: none;
    border: 0;
    background: var(--accent);
    color: white;
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    padding: 8px 18px;
    border-radius: 6px;
    cursor: pointer;
  }

  .primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .primary:disabled {
    opacity: 0.6;
    cursor: progress;
  }

  .error {
    margin: 16px auto 24px;
    max-width: 480px;
    padding: 10px 14px;
    border-radius: 6px;
    background: rgba(192, 57, 43, 0.1);
    color: var(--priority-high);
    font-size: 13px;
    text-align: center;
  }
</style>
