<script lang="ts">
  import { toMarkdown } from '@markdown-board/core';
  import type { Day, Section, Task } from '@markdown-board/core';
  import {
    EmptyState,
    type ArchivedTaskRef,
    type ColumnMoveHandler,
    type DayEditOpenHandler,
    type EditTarget,
    type FullTaskEditHandler,
    type NoteEditHandler,
    type PriorityCycleHandler,
    type ProjectEditOpenHandler,
    type ResolveHandler,
    type SectionAddHandler,
    type SectionDeleteHandler,
    type SectionRenameHandler,
    type SubtaskAddHandler,
    type SubtaskEditHandler,
    type SubtaskToggleHandler,
    type TaskAddHandler,
    type TaskDeleteHandler,
    type TaskMoveHandler,
    type TaskUnresolveHandler,
    type TitleEditHandler,
  } from '@markdown-board/ui';
  import DayPickerModal from './components/DayPickerModal.svelte';
  import LibraryEditorModal from './components/LibraryEditorModal.svelte';
  import ProjectPickerModal from './components/ProjectPickerModal.svelte';
  import ResolveModal from './components/ResolveModal.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import TaskEditModal from './components/TaskEditModal.svelte';
  import VaultWorkspace from './components/VaultWorkspace.svelte';
  import { applyTheme, loadSettings, saveSettings, type Settings } from './lib/settings.js';
  import type {
    ExternalOpenEvent,
    VaultAdapter,
    VaultPlatform,
    VaultWatcher,
  } from './lib/platform.js';
  import {
    Autosaver,
    addSection,
    addSubtask,
    addTaskToSection,
    allProjects,
    appendArchiveEntry,
    cycleTaskPriority,
    deleteSection,
    deleteTask,
    findTask,
    loadArchive,
    loadVault,
    moveColumn,
    moveTask,
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
    unresolveTask,
    type LoadedVault,
  } from './lib/vault/index.js';

  const { platform }: { platform: VaultPlatform } = $props();

  const TASKS_PATH = 'TASKS.md';

  let loaded = $state<LoadedVault | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  // True while a folder is being dragged over the window (desktop DnD).
  let dragActive = $state(false);
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

  let adapter: VaultAdapter | null = null;
  let autosaver: Autosaver | null = null;
  let watcher: VaultWatcher | null = null;

  const supported = $derived(platform.isSupported());

  async function pickAndLoad(): Promise<void> {
    error = null;
    loading = true;
    try {
      const next = await platform.pickVault();
      if (!next) return; // user cancelled
      await mountVault(next);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  // Host-driven opens (desktop drag-and-drop, later the recent-vaults menu)
  // arrive through the platform's optional `subscribeExternalOpen` channel.
  // The shell owns the mount/error/loading reaction so the host stays a thin
  // event translator.
  async function handleExternalOpen(event: ExternalOpenEvent): Promise<void> {
    if (event.kind === 'dragstate') {
      dragActive = event.active;
      return;
    }
    if (event.kind === 'error') {
      dragActive = false;
      error = event.message;
      return;
    }
    dragActive = false;
    error = null;
    loading = true;
    try {
      await mountVault(event.adapter);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  async function mountVault(next: VaultAdapter): Promise<void> {
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
    watcher = platform.createWatcher(next, {
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
    await watcher.start();
  }

  function teardownIo(): void {
    autosaver?.dispose();
    watcher?.dispose();
    autosaver = null;
    watcher = null;
    adapter = null;
  }

  async function safeMtime(a: VaultAdapter, path: string): Promise<number> {
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

  const onTaskAdd: TaskAddHandler = (sectionId, title) => {
    if (!loaded) return;
    const id = addTaskToSection(loaded.vault, sectionId, title);
    if (!id) {
      error = "Couldn't add the task — the section may have been removed.";
    }
  };

  const onSectionAdd: SectionAddHandler = (name) => {
    if (!loaded) return;
    const result = addSection(loaded.vault, name);
    if (!result.ok) {
      error =
        result.reason === 'collision'
          ? `Couldn't add section: a section named "${name}" already exists.`
          : "Couldn't add section: the name can't be empty.";
    } else if (error?.startsWith("Couldn't add section")) {
      error = null;
    }
  };

  const onSectionDelete: SectionDeleteHandler = (sectionId) => {
    if (!loaded) return;
    const result = deleteSection(loaded.vault, sectionId);
    if (!result.ok) {
      error =
        result.reason === 'not-empty'
          ? "Couldn't delete section: it still has tasks."
          : "Couldn't delete section: it doesn't exist anymore.";
    } else if (error?.startsWith("Couldn't delete section")) {
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

  // Slice 6g-3 — group archive entries by source-section name and map
  // to the matching active section's id. Orphans (source section
  // missing from the active vault) fall back to the first section so
  // the user can still see + unresolve them. Newest first within each
  // group, since the archive file is append-only / chronological.
  const ARCHIVE_H2_PARSE_RE = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})(?: — (.+))?$/;
  const archivedTasksBySection = $derived.by<Record<string, ArchivedTaskRef[]>>(() => {
    if (!loaded || !loaded.archive) return {};
    const firstSectionId = loaded.vault.sections[0]?.id;
    if (!firstSectionId) return {};
    const out: Record<string, ArchivedTaskRef[]> = {};
    for (const archiveSection of loaded.archive.sections) {
      const m = ARCHIVE_H2_PARSE_RE.exec(archiveSection.name);
      if (!m) continue;
      const archivedAt = m[1]!;
      const sourceSection = (m[2] ?? '').trim();
      const matching = sourceSection
        ? loaded.vault.sections.find((s) => s.name === sourceSection)
        : null;
      const targetId = matching?.id ?? firstSectionId;
      for (const task of archiveSection.tasks) {
        (out[targetId] ??= []).push({ task, archivedAt });
      }
    }
    // Newest first within each column.
    for (const id of Object.keys(out)) {
      out[id]!.sort((a, b) =>
        a.archivedAt < b.archivedAt ? 1 : a.archivedAt > b.archivedAt ? -1 : 0,
      );
    }
    return out;
  });

  async function refreshArchive(): Promise<void> {
    if (!adapter || !loaded) return;
    loaded.archive = await loadArchive(adapter);
  }

  const onTaskUnresolve: TaskUnresolveHandler = async (target) => {
    if (!loaded || !adapter) return;
    try {
      const result = await unresolveTask(adapter, loaded.vault, target.taskId);
      if (!result.ok) {
        if (result.reason === 'archive-missing') {
          error = 'No archive file to unresolve from.';
        } else if (result.reason === 'not-found') {
          error = "Couldn't find that task in the archive.";
        } else if (result.reason === 'no-active-sections') {
          error = 'No active section to move the task to.';
        }
        return;
      }
      if (result.usedFallback) {
        const fromName = result.sourceSection || '(no section)';
        const toName =
          loaded.vault.sections.find((s) => s.id === result.targetSectionId)?.name ?? '?';
        error = `Section "${fromName}" is gone — moved the task to "${toName}".`;
      } else if (error?.startsWith('Section "')) {
        error = null;
      }
      await refreshArchive();
    } catch (err) {
      error = `Unresolve failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  };

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
      // Refresh the in-memory archive Vault so the Archived expander
      // under the source column updates in the same render frame.
      await refreshArchive();
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

  // Subscribe to host-driven open events (e.g. desktop drag-and-drop). No-op
  // on platforms that don't implement the channel (web).
  $effect(() => {
    const unsubscribe = platform.subscribeExternalOpen?.(handleExternalOpen);
    return () => unsubscribe?.();
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
        {archivedTasksBySection}
        {onTaskUnresolve}
        {onTaskAdd}
        {onSectionAdd}
        {onSectionDelete}
      />
    {:else if !supported}
      <EmptyState
        title={platform.unsupportedMessage?.title ?? 'Opening a vault is unavailable here'}
        hint={platform.unsupportedMessage?.hint ?? ''}
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

  {#if dragActive}
    <div class="drop-overlay" data-testid="drop-overlay">
      <div class="drop-card">
        <p class="drop-title">Drop a folder to open it as a vault</p>
        <p class="drop-hint">The folder should contain a TASKS.md and an optional library/.</p>
      </div>
    </div>
  {/if}
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

  .drop-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--bg-secondary) 75%, transparent);
    backdrop-filter: blur(2px);
    pointer-events: none;
  }

  .drop-card {
    border: 2px dashed var(--accent);
    border-radius: 12px;
    padding: 28px 36px;
    background: var(--bg-card);
    text-align: center;
  }

  .drop-title {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .drop-hint {
    margin: 0;
    font-size: 12px;
    color: var(--text-secondary);
  }
</style>
