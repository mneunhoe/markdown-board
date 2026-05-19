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
  import type { TabKey } from '../lib/tabs.js';

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
  }: Props = $props();

  let active = $state<TabKey>('board');

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
    // List view exposes only `onSectionAdd` from the add bag — per the
    // prototype, only the Board has a per-column `+ Add task`.
    ...(onSectionAdd ? { onSectionAdd } : {}),
  });
</script>

<div class="workspace">
  <TabBar {active} onSelect={(k) => (active = k)} />

  <div class="view" role="tabpanel" data-active={active}>
    {#if active === 'board'}
      <BoardView {vault} {...boardMoveProps} />
    {:else if active === 'list'}
      <ListView {vault} {...listMoveProps} />
    {:else if active === 'library'}
      <LibraryView docs={libraryDocs} {...onLibraryEdit ? { onEdit: onLibraryEdit } : {}} />
    {:else if active === 'overview'}
      <OverviewView {vault} {libraryDocs} />
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

  .view {
    flex: 1;
    overflow: auto;
    padding: 20px;
    min-height: 0;
  }
</style>
