<script lang="ts">
  import type { LibraryDoc, Vault } from '@markdown-board/core';
  import {
    BoardView,
    LibraryView,
    ListView,
    OverviewView,
    type ArchivedTaskRef,
    type ColumnMoveHandler,
    type DayEditOpenHandler,
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
  import TabBar from './TabBar.svelte';
  import { TABS, type TabDescriptor, type TabKey } from '../lib/tabs.js';
  import type { RegisteredSlot, RegisteredView } from '../lib/plugins/registry.svelte.js';
  import { setViewContext } from '../lib/plugins/view-context.js';

  interface Props {
    vault: Vault;
    libraryDocs: LibraryDoc[];
    /** Wired by App.svelte when a writable vault is open. Omitted ⇒ DnD off. */
    onTaskMove?: TaskMoveHandler;
    onColumnMove?: ColumnMoveHandler;
    /** Opens the resolve modal in App.svelte. Omitted ⇒ checkboxes presentation-only. */
    onResolve?: ResolveHandler;
    /** Inline-edit handlers (slice 6a). Omitted ⇒ edit affordances hidden. */
    onTitleEdit?: TitleEditHandler;
    onNoteEdit?: NoteEditHandler;
    onSubtaskEdit?: SubtaskEditHandler;
    onSubtaskAdd?: SubtaskAddHandler;
    onSubtaskToggle?: SubtaskToggleHandler;
    onTaskDelete?: TaskDeleteHandler;
    onPriorityCycle?: PriorityCycleHandler;
    onProjectEdit?: ProjectEditOpenHandler;
    onDayEdit?: DayEditOpenHandler;
    onSectionRename?: SectionRenameHandler;
    /** Slice 6d — opens the library editor modal. `null` ⇒ New File. */
    onLibraryEdit?: (path: string | null) => void;
    /** Slice 6e — opens the full task editor modal. */
    onFullTaskEdit?: FullTaskEditHandler;
    /** Slice 6g — archived tasks grouped by source-section id. */
    archivedTasksBySection?: Record<string, ArchivedTaskRef[]>;
    /** Slice 6g — fires when the user clicks `↺` on an archived card. */
    onTaskUnresolve?: TaskUnresolveHandler;
    /** Slice 6i — `+ Add task` per Board column. Omitted ⇒ hidden. */
    onTaskAdd?: TaskAddHandler;
    /** Slice 6i — `+ Add Section` placeholder on Board and List. */
    onSectionAdd?: SectionAddHandler;
    /** Slice 6j — `×` on empty section headers (Board + List). */
    onSectionDelete?: SectionDeleteHandler;
    /** Controlled active tab (command palette / shortcuts). Omitted ⇒ internal state. */
    active?: TabKey;
    /** Fired on tab change when controlled. */
    onActiveChange?: (key: TabKey) => void;
    /** Plugin-contributed views, appended as tabs after the built-ins. */
    pluginViews?: readonly RegisteredView[];
    /** Plugin-contributed components for the view-toolbar slot. */
    toolbarSlots?: readonly RegisteredSlot[];
  }

  const {
    vault,
    libraryDocs,
    onTaskMove,
    onColumnMove,
    onResolve,
    onTitleEdit,
    onNoteEdit,
    onSubtaskEdit,
    onSubtaskAdd,
    onSubtaskToggle,
    onTaskDelete,
    onPriorityCycle,
    onProjectEdit,
    onDayEdit,
    onSectionRename,
    onLibraryEdit,
    onFullTaskEdit,
    archivedTasksBySection = {},
    onTaskUnresolve,
    onTaskAdd,
    onSectionAdd,
    onSectionDelete,
    active: activeProp,
    onActiveChange,
    pluginViews = [],
    toolbarSlots = [],
  }: Props = $props();

  // Controlled when `activeProp` is supplied (VaultApp drives it via the
  // command palette); otherwise the workspace owns the tab state internally.
  let internalActive = $state<TabKey>('board');
  const active = $derived(activeProp ?? internalActive);

  function selectTab(key: TabKey): void {
    if (onActiveChange) onActiveChange(key);
    else internalActive = key;
  }

  // Built-in tabs + a tab per plugin view.
  const tabs = $derived<TabDescriptor[]>([
    ...TABS,
    ...pluginViews.map((v) => ({ key: v.key, label: v.title })),
  ]);
  const activePluginView = $derived(pluginViews.find((v) => v.key === active) ?? null);

  // The handler bag exposed to plugin views, recomputed reactively so prop
  // changes propagate (and reads stay inside a reactive scope).
  const viewHandlers = $derived({
    ...(onTaskMove ? { onTaskMove } : {}),
    ...(onColumnMove ? { onColumnMove } : {}),
    ...(onResolve ? { onResolve } : {}),
    ...(onTitleEdit ? { onTitleEdit } : {}),
    ...(onNoteEdit ? { onNoteEdit } : {}),
    ...(onSubtaskEdit ? { onSubtaskEdit } : {}),
    ...(onSubtaskAdd ? { onSubtaskAdd } : {}),
    ...(onSubtaskToggle ? { onSubtaskToggle } : {}),
    ...(onTaskDelete ? { onTaskDelete } : {}),
    ...(onPriorityCycle ? { onPriorityCycle } : {}),
    ...(onProjectEdit ? { onProjectEdit } : {}),
    ...(onDayEdit ? { onDayEdit } : {}),
    ...(onSectionRename ? { onSectionRename } : {}),
    ...(onFullTaskEdit ? { onFullTaskEdit } : {}),
    ...(onTaskAdd ? { onTaskAdd } : {}),
    ...(onSectionAdd ? { onSectionAdd } : {}),
    ...(onSectionDelete ? { onSectionDelete } : {}),
  });

  // Publish the view context so plugin views can read the live vault + the
  // host's mutation/edit handlers. Getters keep reads reactive.
  setViewContext({
    getVault: () => vault,
    getLibraryDocs: () => libraryDocs,
    getHandlers: () => viewHandlers,
  });

  // Conditionally-keyed prop bags so an undefined handler is *absent*
  // rather than passed as `undefined` — required under
  // `exactOptionalPropertyTypes` since BoardView / ListView declare
  // their move / resolve / edit props as `?: T`.
  const editProps = $derived({
    ...(onTitleEdit ? { onTitleEdit } : {}),
    ...(onNoteEdit ? { onNoteEdit } : {}),
    ...(onSubtaskEdit ? { onSubtaskEdit } : {}),
    ...(onSubtaskAdd ? { onSubtaskAdd } : {}),
    ...(onSubtaskToggle ? { onSubtaskToggle } : {}),
    ...(onTaskDelete ? { onTaskDelete } : {}),
    ...(onPriorityCycle ? { onPriorityCycle } : {}),
    ...(onProjectEdit ? { onProjectEdit } : {}),
    ...(onDayEdit ? { onDayEdit } : {}),
    ...(onSectionRename ? { onSectionRename } : {}),
    ...(onFullTaskEdit ? { onFullTaskEdit } : {}),
  });
  const archiveProps = $derived({
    archivedTasksBySection,
    ...(onTaskUnresolve ? { onTaskUnresolve } : {}),
  });
  const addProps = $derived({
    ...(onTaskAdd ? { onTaskAdd } : {}),
    ...(onSectionAdd ? { onSectionAdd } : {}),
    ...(onSectionDelete ? { onSectionDelete } : {}),
  });
  const boardMoveProps = $derived({
    ...(onTaskMove ? { onTaskMove } : {}),
    ...(onColumnMove ? { onColumnMove } : {}),
    ...(onResolve ? { onResolve } : {}),
    ...editProps,
    ...archiveProps,
    ...addProps,
  });
  const listMoveProps = $derived({
    ...(onTaskMove ? { onTaskMove } : {}),
    ...(onResolve ? { onResolve } : {}),
    ...editProps,
    ...archiveProps,
    // List view exposes section-level adds but not per-column `+ Add
    // task` — matches the prototype (only the Board carries that).
    ...(onSectionAdd ? { onSectionAdd } : {}),
    ...(onSectionDelete ? { onSectionDelete } : {}),
  });
</script>

<div class="workspace">
  <TabBar {active} {tabs} onSelect={selectTab} />

  {#if toolbarSlots.length > 0}
    <div class="view-toolbar" data-testid="view-toolbar">
      {#each toolbarSlots as slot (slot.pluginId + ':' + slot.seq)}
        {@const ToolbarSlot = slot.component}
        <ToolbarSlot />
      {/each}
    </div>
  {/if}

  <div class="view" role="tabpanel" data-active={active}>
    {#if active === 'board'}
      <BoardView {vault} {...boardMoveProps} />
    {:else if active === 'list'}
      <ListView {vault} {...listMoveProps} />
    {:else if active === 'library'}
      <LibraryView docs={libraryDocs} {...onLibraryEdit ? { onEdit: onLibraryEdit } : {}} />
    {:else if active === 'overview'}
      <OverviewView {vault} {libraryDocs} />
    {:else if activePluginView}
      {@const PluginView = activePluginView.component}
      <PluginView />
    {/if}
  </div>
</div>

<style>
  .workspace {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .view-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-secondary);
  }

  .view {
    flex: 1;
    overflow: auto;
    padding: 20px;
    min-height: 0;
  }
</style>
