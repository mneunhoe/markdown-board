// View context — the bridge a plugin-contributed view reads to render against
// the open vault. VaultWorkspace (which already owns the vault + handler
// props) publishes it via `setViewContext`; a plugin view component reads it
// via `getViewContext()`. Getters (not snapshots) so reads stay reactive.

import { getContext, setContext } from 'svelte';

import type { LibraryDoc, Vault } from '@markdown-board/core';
import type {
  ColumnMoveHandler,
  DayEditOpenHandler,
  FullTaskEditHandler,
  NoteEditHandler,
  PriorityCycleHandler,
  ProjectEditOpenHandler,
  ResolveHandler,
  SectionAddHandler,
  SectionDeleteHandler,
  SectionRenameHandler,
  SubtaskAddHandler,
  SubtaskEditHandler,
  SubtaskToggleHandler,
  TaskAddHandler,
  TaskDeleteHandler,
  TaskMoveHandler,
  TitleEditHandler,
} from '@markdown-board/ui';

/** The same optional handler set VaultWorkspace forwards to the built-in views. */
export interface ViewHandlers {
  onTaskMove?: TaskMoveHandler;
  onColumnMove?: ColumnMoveHandler;
  onResolve?: ResolveHandler;
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
  onFullTaskEdit?: FullTaskEditHandler;
  onTaskAdd?: TaskAddHandler;
  onSectionAdd?: SectionAddHandler;
  onSectionDelete?: SectionDeleteHandler;
}

export interface ViewContext {
  /** Current vault (reactive — read at call time). */
  getVault: () => Vault;
  /** Current library docs (reactive). */
  getLibraryDocs: () => LibraryDoc[];
  /** Vault mutation / edit handlers, wired by the host (reactive). */
  getHandlers: () => ViewHandlers;
}

const VIEW_CONTEXT_KEY = Symbol('markdown-board:view-context');

export function setViewContext(ctx: ViewContext): void {
  setContext(VIEW_CONTEXT_KEY, ctx);
}

export function getViewContext(): ViewContext {
  const ctx = getContext<ViewContext | undefined>(VIEW_CONTEXT_KEY);
  if (!ctx) {
    throw new Error(
      'getViewContext() must be called from a component rendered inside a vault view',
    );
  }
  return ctx;
}
