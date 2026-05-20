<script lang="ts">
  import { setContext } from 'svelte';
  import { toMarkdown } from '@markdown-board/core';
  import type { Day, Section, Task } from '@markdown-board/core';
  import {
    EmptyState,
    PROJECT_COLOR_OVERRIDES_KEY,
    TASK_ACTIONS_KEY,
    projectShort,
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
  import CommandPalette from './components/CommandPalette.svelte';
  import ConflictModal from './components/ConflictModal.svelte';
  import DayPickerModal from './components/DayPickerModal.svelte';
  import LibraryEditorModal from './components/LibraryEditorModal.svelte';
  import ProjectPickerModal from './components/ProjectPickerModal.svelte';
  import QuickAddModal from './components/QuickAddModal.svelte';
  import ResolveModal from './components/ResolveModal.svelte';
  import SearchModal from './components/SearchModal.svelte';
  import SlotRenderer from './components/SlotRenderer.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import TaskEditModal from './components/TaskEditModal.svelte';
  import VaultWorkspace from './components/VaultWorkspace.svelte';
  import {
    PLUGIN_API_VERSION,
    type Disposable,
    type PluginContext,
  } from '@markdown-board/plugin-api';
  import { type Command } from './lib/commands.js';
  import { createPluginHost } from './lib/plugins/registry.svelte.js';
  import { FIRST_PARTY_PLUGINS, type FirstPartyPlugin } from './lib/plugins/first-party.js';
  import { activatePlugin, type PluginHandle } from './lib/plugins/loader.js';
  import { createScopedStorage } from './lib/plugins/storage.js';
  import { resolvePluginSettings } from './lib/plugins/plugin-settings.js';
  import {
    buildSearchDocs,
    createSearchIndex,
    runSearch,
    type SearchDoc,
    type SearchResult,
  } from './lib/search.js';
  import { applyTheme, loadSettings, saveSettings, type Settings } from './lib/settings.js';
  import {
    comboFromEvent,
    commandForCombo,
    comboHasCommandModifier,
    resolveShortcuts,
  } from './lib/shortcuts.js';
  import { TABS, type TabKey } from './lib/tabs.js';
  import {
    clearVaultTheme,
    loadVaultTheme,
    watchVaultTheme,
    type ThemeStatus,
  } from './lib/theme/index.js';
  import type {
    ExternalOpenEvent,
    RecentVault,
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
  // Recently opened vaults offered on the empty state (desktop only).
  // Seeded from the platform in an effect (below) to keep the prop read
  // inside a reactive context.
  let recents = $state<RecentVault[]>([]);
  let lastWrittenMd = $state<string>('');
  /** Captured at modal-open time so a concurrent external reload can't shift the target. */
  let resolveTarget = $state<{ task: Task; section: Section } | null>(null);
  let resolving = $state(false);
  let settings = $state<Settings>(loadSettings());
  let settingsOpen = $state(false);
  let paletteOpen = $state(false);
  let searchOpen = $state(false);
  let quickAddOpen = $state(false);
  // Set when an external edit to TASKS.md collides with unsaved local changes.
  // `base` = what we last wrote, `mine` = current in-memory, `theirs` = on disk.
  let conflict = $state<{ base: string; mine: string; theirs: string } | null>(null);
  // Active workspace tab, lifted here so the command palette can switch views.
  let activeTab = $state<TabKey>('board');
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

  // Custom-theme (theme.yaml) state. The logo is markup (rendered in the
  // header); the palette/fonts are injected as CSS by the loader. Status
  // surfaces parse/asset problems to the Settings UI.
  let themeLogoUrl = $state<string | null>(null);
  let themeStatus = $state<ThemeStatus>({ state: 'none', errors: [] });
  let vaultPath = $state<string | null>(null);

  // Plugin host — holds the reactive registries (commands/views/slots/task
  // actions) + hook bus that plugins contribute to. Plugins are activated
  // against it once a vault is open (S3); the registries it exposes are folded
  // into the palette, tab list, slot mounts, and TaskCard here.
  const pluginHost = createPluginHost((err) => {
    error = `Plugin hook error: ${err instanceof Error ? err.message : String(err)}`;
  });
  // Active plugin instances keyed by plugin id (not reactive — the registries
  // the plugins feed are what the UI reads).
  const pluginHandles = new Map<string, PluginHandle>();
  // Transient message surfaced via the plugin API's `ui.notify`.
  let pluginNotice = $state<string | null>(null);

  let adapter: VaultAdapter | null = null;
  let autosaver: Autosaver | null = null;
  let watcher: VaultWatcher | null = null;
  let themeWatcherDispose: (() => void) | null = null;
  // Search index, rebuilt each time the search modal opens (cheap; keeps the
  // index in sync with the latest vault without re-indexing on every edit).
  let searchIndex: ReturnType<typeof createSearchIndex> | null = null;
  // mtime of TASKS.md as of our last successful read/write — used to detect
  // out-of-band edits before an autosave would clobber them.
  let lastSyncedMtime = 0;

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

  function refreshRecents(): void {
    recents = platform.listRecentVaults?.() ?? [];
  }

  async function openRecentByPath(path: string): Promise<void> {
    if (loading) return;
    error = null;
    loading = true;
    try {
      const next = await platform.openRecentVault?.(path);
      if (!next) {
        error = 'That vault is no longer available — it may have been moved or deleted.';
        refreshRecents();
        return;
      }
      await mountVault(next);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  async function openNewWindow(): Promise<void> {
    try {
      await platform.openNewWindow?.();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  async function mountVault(next: VaultAdapter): Promise<void> {
    teardownIo();
    adapter = next;
    vaultPath = next.displayPath ?? null;
    const fresh = await loadVault(next, grammarProfile);
    const canonical = serialize(fresh.vault);
    lastWrittenMd = canonical;
    loaded = fresh;
    const initialMtime = await safeMtime(next, TASKS_PATH);
    lastSyncedMtime = initialMtime;
    autosaver = new Autosaver({
      debounceMs: settings.autosaveDelayMs,
      write: async (md) => {
        // Guard against clobbering: if the file changed on disk since we last
        // synced, surface a conflict instead of overwriting the other edit.
        const current = await safeMtime(next, TASKS_PATH);
        if (lastSyncedMtime !== 0 && current !== lastSyncedMtime) {
          conflict = { base: lastWrittenMd, mine: md, theirs: await readTasks(next) };
          return;
        }
        await next.writeFile(TASKS_PATH, md);
        lastWrittenMd = md;
        lastSyncedMtime = await safeMtime(next, TASKS_PATH);
        watcher?.setBaseline(lastSyncedMtime);
        pluginHost.hooks.emit('vault.saved', { vaultPath });
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
        if (!adapter || conflict) return;
        const theirs = await readTasks(adapter);
        const mine = loaded ? serialize(loaded.vault) : lastWrittenMd;
        if (mine !== lastWrittenMd && theirs !== lastWrittenMd && theirs !== mine) {
          // Local edits AND the disk diverged from our baseline → conflict.
          conflict = { base: lastWrittenMd, mine, theirs };
          return;
        }
        // No local divergence (or already converged) → adopt the disk copy.
        const reloaded = await loadVault(adapter, grammarProfile);
        lastWrittenMd = serialize(reloaded.vault);
        loaded = reloaded;
        lastSyncedMtime = await safeMtime(adapter, TASKS_PATH);
        watcher?.setBaseline(lastSyncedMtime);
      },
      onError: () => {
        // Transient mtime failures (file briefly missing during external
        // rewrite) are expected — silently skip the tick.
      },
    });
    await watcher.start();
    // Apply the vault's custom theme (theme.yaml) if present, and hot-reload
    // it on external edits.
    await applyVaultTheme();
    themeWatcherDispose = watchVaultTheme(next, () => void applyVaultTheme());
    // The just-opened vault is now the most-recent; reflect that so the
    // empty state shows it first next time the user opens another vault.
    refreshRecents();
    // Activate plugins for this vault, then announce the open so plugins that
    // subscribed during activation receive it.
    await syncPlugins();
    pluginHost.hooks.emit('vault.opened', { vaultPath });
  }

  async function applyVaultTheme(): Promise<void> {
    if (!adapter) return;
    try {
      const result = await loadVaultTheme(adapter);
      themeStatus = result.status;
      themeLogoUrl = result.logoUrl;
    } catch (err) {
      themeStatus = { state: 'error', errors: [err instanceof Error ? err.message : String(err)] };
    }
  }

  function teardownIo(): void {
    void teardownPlugins();
    autosaver?.dispose();
    watcher?.dispose();
    themeWatcherDispose?.();
    clearVaultTheme();
    autosaver = null;
    watcher = null;
    themeWatcherDispose = null;
    adapter = null;
    themeLogoUrl = null;
    themeStatus = { state: 'none', errors: [] };
    vaultPath = null;
    conflict = null;
    lastSyncedMtime = 0;
  }

  // ── Plugin lifecycle ──────────────────────────────────────────────────────
  // Build the activation context (`api`) for one plugin, bound to live state.
  // Every registration / hook subscription is tracked so the loader can undo
  // them on deactivate.
  function buildPluginContext(
    fp: FirstPartyPlugin,
    currentAdapter: VaultAdapter,
  ): { context: PluginContext; disposables: Disposable[] } {
    const id = fp.manifest.id;
    const disposables: Disposable[] = [];
    const track = (d: Disposable): Disposable => {
      disposables.push(d);
      return d;
    };
    const context: PluginContext = {
      manifest: fp.manifest,
      appVersion: PLUGIN_API_VERSION,
      commands: {
        register: (cid, run, opts) => track(pluginHost.registerCommand(id, cid, run, opts)),
      },
      views: { register: (vid, comp, opts) => track(pluginHost.registerView(id, vid, comp, opts)) },
      slots: {
        register: (slot, comp, opts) => track(pluginHost.registerSlot(id, slot, comp, opts)),
      },
      taskActions: { register: (action) => track(pluginHost.registerTaskAction(id, action)) },
      hooks: { on: (event, handler) => track(pluginHost.hooks.on(event, handler)) },
      storage: createScopedStorage(currentAdapter, id),
      tasks: {
        find: (ref) => (loaded ? (findTask(loaded.vault, ref)?.task ?? null) : null),
        mutate: (ref, mutator) => {
          if (!loaded) return false;
          const found = findTask(loaded.vault, ref);
          if (!found) return false;
          // Direct proxy mutation → the autosave $effect picks it up.
          mutator(found.task);
          return true;
        },
      },
      ui: {
        saveFile: async (name, contents, mime) => {
          if (!platform.saveFile) {
            throw new Error('Saving files is not supported in this environment.');
          }
          await platform.saveFile(name, contents, mime);
        },
        notify: (message) => {
          pluginNotice = message;
        },
      },
      settings: { get: () => resolvePluginSettings(fp.manifest.settings, settings.plugins[id]) },
      log: {
        info: (...args) => console.info(`[plugin:${id}]`, ...args),
        warn: (...args) => console.warn(`[plugin:${id}]`, ...args),
        error: (...args) => console.error(`[plugin:${id}]`, ...args),
      },
    };
    return { context, disposables };
  }

  // Reconcile active plugins against the desired set (enabled + a vault open).
  // Idempotent: safe to call on vault open, vault switch, and settings toggles.
  // Serialised so concurrent triggers can't double-activate the same plugin.
  let syncing = false;
  let resyncQueued = false;
  async function syncPlugins(): Promise<void> {
    if (syncing) {
      resyncQueued = true;
      return;
    }
    syncing = true;
    try {
      await reconcilePlugins();
    } finally {
      syncing = false;
      if (resyncQueued) {
        resyncQueued = false;
        await syncPlugins();
      }
    }
  }

  async function reconcilePlugins(): Promise<void> {
    const currentAdapter = adapter;
    if (!loaded || !currentAdapter) {
      await teardownPlugins();
      return;
    }
    const desired = new Map<string, FirstPartyPlugin>();
    for (const fp of FIRST_PARTY_PLUGINS) {
      if (settings.plugins[fp.manifest.id]?.enabled !== false) desired.set(fp.manifest.id, fp);
    }
    // Deactivate plugins that are no longer wanted.
    for (const [id, handle] of [...pluginHandles]) {
      if (desired.has(id)) continue;
      pluginHandles.delete(id);
      try {
        await handle.deactivate();
      } catch (err) {
        console.error(`[plugin:${id}] deactivate failed`, err);
      }
    }
    // Activate newly wanted plugins (a disabled plugin's code is never imported).
    for (const [id, fp] of desired) {
      if (pluginHandles.has(id)) continue;
      try {
        const mod = await fp.load();
        const { context, disposables } = buildPluginContext(fp, currentAdapter);
        pluginHandles.set(id, await activatePlugin(mod, fp.manifest, context, disposables));
      } catch (err) {
        error = `Plugin "${id}" failed to load: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  }

  async function teardownPlugins(): Promise<void> {
    const handles = [...pluginHandles.values()];
    pluginHandles.clear();
    for (const handle of handles) {
      try {
        await handle.deactivate();
      } catch {
        // A failed teardown of one plugin must not block the rest.
      }
    }
  }

  async function safeMtime(a: VaultAdapter, path: string): Promise<number> {
    try {
      return await a.getMtime(path);
    } catch {
      return 0;
    }
  }

  async function readTasks(a: VaultAdapter): Promise<string> {
    try {
      return await a.readFile(TASKS_PATH);
    } catch {
      return '';
    }
  }

  // Conflict resolution: rewrite TASKS.md with the chosen content, then reload
  // from disk so the in-memory vault matches what's persisted.
  async function resolveConflictWith(content: string): Promise<void> {
    if (!adapter) return;
    try {
      await adapter.writeFile(TASKS_PATH, content);
      const reloaded = await loadVault(adapter, grammarProfile);
      loaded = reloaded;
      lastWrittenMd = serialize(reloaded.vault);
      lastSyncedMtime = await safeMtime(adapter, TASKS_PATH);
      watcher?.setBaseline(lastSyncedMtime);
      conflict = null;
    } catch (err) {
      error = `Could not resolve conflict: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  function keepMine(): void {
    if (conflict) void resolveConflictWith(conflict.mine);
  }
  function takeTheirs(): void {
    if (conflict) void resolveConflictWith(conflict.theirs);
  }
  function applyMerge(merged: string): void {
    void resolveConflictWith(merged);
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

  // Run a task mutation and emit `task.updated` with before/after snapshots.
  // Best-effort: covers the explicit edit handlers below (not every nested
  // proxy write). Snapshots are detached clones so `before` isn't mutated.
  function withTaskUpdate(target: EditTarget, apply: () => void): void {
    if (!loaded) return;
    const before = findTask(loaded.vault, target)?.task;
    const snapshot = before ? $state.snapshot(before) : null;
    apply();
    if (!loaded || !snapshot) return;
    const after = findTask(loaded.vault, target)?.task;
    if (after) {
      pluginHost.hooks.emit('task.updated', {
        ref: target,
        before: snapshot,
        after: $state.snapshot(after),
      });
    }
  }

  const onTitleEdit: TitleEditHandler = (target, next) => {
    withTaskUpdate(target, () => setTaskTitle(loaded!.vault, target, next));
  };

  const onNoteEdit: NoteEditHandler = (target, next) => {
    withTaskUpdate(target, () => setTaskNote(loaded!.vault, target, next));
  };

  const onSubtaskEdit: SubtaskEditHandler = (target, idx, next) => {
    withTaskUpdate(target, () => setSubtaskText(loaded!.vault, target, idx, next));
  };

  const onSubtaskAdd: SubtaskAddHandler = (target, text) => {
    withTaskUpdate(target, () => addSubtask(loaded!.vault, target, text));
  };

  const onSubtaskToggle: SubtaskToggleHandler = (target, idx) => {
    withTaskUpdate(target, () => toggleSubtask(loaded!.vault, target, idx));
  };

  const onTaskDelete: TaskDeleteHandler = (target) => {
    if (!loaded) return;
    deleteTask(loaded.vault, target);
  };

  const onPriorityCycle: PriorityCycleHandler = (target) => {
    withTaskUpdate(target, () => cycleTaskPriority(loaded!.vault, target));
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
      return;
    }
    const created = findTask(loaded.vault, { taskId: id, sectionId });
    if (created) {
      pluginHost.hooks.emit('task.created', {
        ref: { taskId: id, sectionId },
        task: $state.snapshot(created.task),
      });
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
    const { target } = taskEditor;
    withTaskUpdate(target, () => setTask(loaded!.vault, target, next));
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
    const { target } = projectPicker;
    withTaskUpdate(target, () => setTaskProject(loaded!.vault, target, next));
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
    const { target } = dayPicker;
    withTaskUpdate(target, () => setTaskDay(loaded!.vault, target, next));
    dayPicker = null;
  }

  function cancelDayPicker(): void {
    dayPicker = null;
  }

  const projectSuggestions = $derived(loaded ? allProjects(loaded.vault) : []);

  // Distinct short project names — the keys colour overrides are stored under
  // (ProjectPill colours by short name) and the rows shown in Settings.
  const projectColorTargets = $derived(
    Array.from(
      new Set(projectSuggestions.map((p) => projectShort(p)).filter((s): s is string => !!s)),
    ),
  );

  // Make project-colour overrides reactively available to ProjectPill.
  setContext(PROJECT_COLOR_OVERRIDES_KEY, () => settings.projectColorOverrides);

  // Expose plugin-contributed task actions to TaskCard (read reactively).
  setContext(TASK_ACTIONS_KEY, () => pluginHost.taskActions);

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
    loaded.archive = await loadArchive(adapter, grammarProfile);
  }

  const onTaskUnresolve: TaskUnresolveHandler = async (target) => {
    if (!loaded || !adapter) return;
    try {
      const result = await unresolveTask(adapter, loaded.vault, target.taskId, grammarProfile);
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
      await appendArchiveEntry(adapter, task, resolution, section, { profile: grammarProfile });
      removeTask(loaded.vault, { taskId: task.id, sectionId: section.id });
      pluginHost.hooks.emit('task.resolved', {
        ref: { taskId: task.id, sectionId: section.id },
        task: $state.snapshot(task),
        resolution,
      });
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
    const prevPlugins = settings.plugins;
    settings = next;
    saveSettings(next);
    applyTheme(next.theme);
    // Re-reconcile when the per-plugin enable flags changed (live enable/disable).
    if (next.plugins !== prevPlugins) void syncPlugins();
  }

  function toggleTheme(): void {
    handleSettingsChange({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' });
  }

  // Active grammar profile + a serialize helper used everywhere TASKS.md is
  // written, so a profile switch re-serialises the in-memory vault. Reading
  // `settings.grammarProfile` here makes the autosave $effect re-run on switch.
  const grammarProfile = $derived(settings.grammarProfile);
  function serialize(v: Parameters<typeof toMarkdown>[0]): string {
    return toMarkdown(v, { profile: grammarProfile });
  }

  function openSearch(): void {
    if (!loaded) return;
    const docs: SearchDoc[] = buildSearchDocs(loaded.vault, loaded.libraryDocs);
    searchIndex = createSearchIndex(docs);
    searchOpen = true;
  }

  function searchVault(query: string): SearchResult[] {
    return searchIndex ? runSearch(searchIndex, query) : [];
  }

  function jumpToResult(result: SearchResult): void {
    if (!loaded) return;
    if (result.type === 'task' && result.sectionId && result.taskId) {
      onFullTaskEdit({ taskId: result.taskId, sectionId: result.sectionId });
    } else if (result.type === 'library' && result.path) {
      openLibraryEditor(result.path);
    }
  }

  // Commands surfaced in the palette (Cmd/Ctrl-K). Built reactively so
  // availability tracks whether a vault is open and which platform features
  // exist. VaultApp owns the `run` handlers; the registry stays UI-free.
  const commands = $derived<Command[]>([
    {
      id: 'open-vault',
      title: loaded ? 'Open another vault…' : 'Open vault…',
      group: 'Vault',
      keywords: ['folder', 'directory'],
      run: pickAndLoad,
      enabled: supported,
    },
    {
      id: 'new-window',
      title: 'New window',
      group: 'Vault',
      run: openNewWindow,
      enabled: Boolean(platform.openNewWindow),
    },
    {
      id: 'search',
      title: 'Search tasks and library',
      group: 'Vault',
      keywords: ['find', 'notes'],
      run: openSearch,
      enabled: Boolean(loaded),
    },
    {
      id: 'quick-add',
      title: 'New task',
      group: 'Vault',
      keywords: ['add', 'create', 'todo'],
      run: () => {
        quickAddOpen = true;
      },
      enabled: Boolean(loaded) && (loaded?.vault.sections.length ?? 0) > 0,
    },
    {
      id: 'open-settings',
      title: 'Open settings',
      group: 'App',
      keywords: ['preferences', 'options'],
      run: () => {
        settingsOpen = true;
      },
    },
    {
      id: 'toggle-theme',
      title: 'Toggle light / dark theme',
      group: 'Appearance',
      keywords: ['dark', 'light', 'mode'],
      run: toggleTheme,
    },
    {
      id: 'reload-theme',
      title: 'Reload custom theme',
      group: 'Appearance',
      keywords: ['yaml', 'css'],
      run: applyVaultTheme,
      enabled: Boolean(loaded),
    },
    ...TABS.map((tab) => ({
      id: `go-${tab.key}`,
      title: `Go to ${tab.label}`,
      group: 'Navigate',
      run: () => {
        activeTab = tab.key;
      },
      enabled: Boolean(loaded),
    })),
    // A go-to command per plugin view, so the palette can switch to it.
    ...pluginHost.views.map((view) => ({
      id: `go-${view.key}`,
      title: `Go to ${view.title}`,
      group: 'Navigate',
      run: () => {
        activeTab = view.key;
      },
      enabled: Boolean(loaded),
    })),
    // Plugin-contributed commands (namespaced + bound by the host). Disabled
    // wholesale until a vault is open so they don't fire without context.
    ...pluginHost.commands.map((c) => ({ ...c, enabled: c.enabled !== false && Boolean(loaded) })),
  ]);

  // Effective shortcut bindings: built-in defaults, then plugin-declared
  // defaults, then user overrides win (resolveShortcuts layers its own
  // built-in defaults under whatever overrides we pass).
  const shortcutMap = $derived(
    resolveShortcuts({ ...pluginHost.defaultShortcuts, ...settings.shortcuts }),
  );

  function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
  }

  function handleGlobalKeydown(event: KeyboardEvent): void {
    const combo = comboFromEvent(event);
    if (!combo) return;
    const commandId = commandForCombo(combo, shortcutMap);
    if (!commandId) return;
    // Don't steal plain typing in a field unless the combo carries Mod/Alt.
    if (isEditableTarget(event.target) && !comboHasCommandModifier(combo)) return;

    // While an overlay is open it owns the keyboard; only the palette's own
    // toggle (to close it) is honoured globally.
    if (paletteOpen || searchOpen) {
      if (paletteOpen && commandId === 'command-palette') {
        event.preventDefault();
        paletteOpen = false;
      }
      return;
    }

    event.preventDefault();
    if (commandId === 'command-palette') {
      paletteOpen = true;
      return;
    }
    const command = commands.find((c) => c.id === commandId);
    if (command && command.enabled !== false) void command.run();
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
    const md = serialize(loaded.vault);
    // Pause autosave while a conflict is open so we don't loop on the
    // unresolved divergence.
    if (conflict) return;
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

  // Seed the recent-vaults list once the platform is available.
  $effect(() => {
    refreshRecents();
  });
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<main class="shell">
  <header class="topbar">
    <div class="brand">
      {#if themeLogoUrl}
        <img class="brand-logo" src={themeLogoUrl} alt="" data-testid="brand-logo" />
      {/if}
      <h1 class="brand-title">markdown-board</h1>
    </div>
    <div class="topbar-actions">
      {#if themeStatus.state === 'error'}
        <span
          class="theme-warning"
          role="alert"
          title={themeStatus.errors.join('\n')}
          data-testid="theme-warning"
        >
          Theme issue
        </span>
      {/if}
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
      {#if platform.openNewWindow}
        <button
          type="button"
          class="topbar-action"
          onclick={openNewWindow}
          data-testid="new-window"
        >
          New window
        </button>
      {/if}
      {#each pluginHost.slotsFor('header') as slot (slot.pluginId + ':' + slot.seq)}
        <div class="header-slot"><SlotRenderer component={slot.component} /></div>
      {/each}
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
        pluginViews={pluginHost.views}
        toolbarSlots={pluginHost.slotsFor('view-toolbar')}
        active={activeTab}
        onActiveChange={(k) => (activeTab = k)}
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
        {#if recents.length}
          <div class="recents" data-testid="recent-vaults">
            <p class="recents-label">Recent vaults</p>
            <ul class="recents-list">
              {#each recents as recent (recent.path)}
                <li>
                  <button
                    type="button"
                    class="recent"
                    onclick={() => openRecentByPath(recent.path)}
                    disabled={loading}
                    title={recent.path}
                  >
                    <span class="recent-name">{recent.name}</span>
                    <span class="recent-path">{recent.path}</span>
                  </button>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </EmptyState>
    {/if}

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}

    {#if pluginNotice}
      <p class="plugin-notice" role="status" data-testid="plugin-notice">{pluginNotice}</p>
    {/if}
  </section>

  <ResolveModal
    taskTitle={resolveTarget?.task.title ?? null}
    onConfirm={confirmResolve}
    onCancel={cancelResolve}
  />

  <CommandPalette open={paletteOpen} {commands} onClose={() => (paletteOpen = false)} />

  <SearchModal
    open={searchOpen}
    search={searchVault}
    onJump={jumpToResult}
    onClose={() => (searchOpen = false)}
  />

  <QuickAddModal
    open={quickAddOpen}
    sections={loaded?.vault.sections.map((s) => ({ id: s.id, name: s.name })) ?? []}
    onAdd={onTaskAdd}
    onClose={() => (quickAddOpen = false)}
  />

  <ConflictModal
    open={conflict !== null}
    base={conflict?.base ?? ''}
    mine={conflict?.mine ?? ''}
    theirs={conflict?.theirs ?? ''}
    onKeepMine={keepMine}
    onTakeTheirs={takeTheirs}
    onApplyMerge={applyMerge}
  />

  <SettingsModal
    open={settingsOpen}
    {settings}
    {vaultPath}
    {themeStatus}
    projects={projectColorTargets}
    onReloadTheme={applyVaultTheme}
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
    profile={grammarProfile}
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
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand-logo {
    height: 24px;
    width: auto;
    display: block;
  }

  .brand-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-slot {
    display: inline-flex;
    align-items: center;
  }

  .theme-warning {
    font-size: 12px;
    color: var(--priority-high);
    border: 1px solid var(--priority-high);
    border-radius: 6px;
    padding: 2px 8px;
    cursor: help;
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

  .plugin-notice {
    margin: 8px auto 16px;
    max-width: 480px;
    padding: 8px 14px;
    border-radius: 6px;
    background: var(--surface-2, rgba(0, 0, 0, 0.05));
    color: var(--text-muted, inherit);
    font-size: 13px;
    text-align: center;
  }

  .recents {
    margin-top: 28px;
    width: 100%;
    max-width: 420px;
    text-align: left;
  }

  .recents-label {
    margin: 0 0 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
  }

  .recents-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .recent {
    display: flex;
    flex-direction: column;
    gap: 1px;
    width: 100%;
    appearance: none;
    border: 1px solid var(--border);
    background: var(--bg-card);
    border-radius: 6px;
    padding: 8px 12px;
    cursor: pointer;
    text-align: left;
  }

  .recent:hover:not(:disabled) {
    border-color: var(--accent);
  }

  .recent:disabled {
    opacity: 0.6;
    cursor: progress;
  }

  .recent-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .recent-path {
    font-size: 11px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
