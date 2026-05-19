/**
 * Edit-handler shapes shared by BoardView and ListView when they forward
 * inline-edit callbacks to TaskCard. Identifies the task + its source
 * section so the shell can mutate the right node in the in-memory vault.
 *
 * Mirrors the `ResolveHandler` / `ResolveTarget` split in `./resolve.ts`:
 * a stable `EditTarget` shape, plus per-action handler types.
 */

export interface EditTarget {
  taskId: string;
  sectionId: string;
}

import type { Day, Task } from '@markdown-board/core';

export type TitleEditHandler = (target: EditTarget, next: string) => void;
export type NoteEditHandler = (target: EditTarget, next: string) => void;
export type SubtaskEditHandler = (target: EditTarget, idx: number, next: string) => void;
export type SubtaskAddHandler = (target: EditTarget, text: string) => void;
export type SubtaskToggleHandler = (target: EditTarget, idx: number) => void;
export type TaskDeleteHandler = (target: EditTarget) => void;

// Slice 6b — priority cycle + project / day picker openers.
//
// The picker-open handlers carry the current value as context so the host
// modal can pre-fill its input. The actual "set next value" mutation
// happens when the modal confirms — not via these handlers. This keeps
// TaskCard ignorant of how the host chose to render the picker
// (BoardView/ListView never opens a modal; that's App.svelte's job).
export type PriorityCycleHandler = (target: EditTarget) => void;
export type ProjectEditOpenHandler = (target: EditTarget, current: string | null) => void;
export type DayEditOpenHandler = (target: EditTarget, current: Day | null) => void;

// Slice 6c — section (column) rename. Identifies the section by its
// runtime id; the new name is the trimmed, non-empty string.
export type SectionRenameHandler = (sectionId: string, nextName: string) => void;

// Slice 6e — open the full task editor modal. Same target shape as the
// per-field handlers; the modal carries the rest in its own state.
export type FullTaskEditHandler = (target: EditTarget) => void;

// Slice 6g — archived tasks rendered under their source column.
//
// `ArchivedTaskRef` pairs a resolved task with its archive H2 timestamp
// so the expander can subtitle each row "Archived YYYY-MM-DD HH:MM".
// The source-section grouping (which active column each ref belongs
// to) happens in the web shell at slice 6g-3; views consume a pre-
// grouped Record keyed by active-section id.
export interface ArchivedTaskRef {
  task: Task;
  archivedAt: string;
}

/**
 * View-level handler fired when the user clicks the `↺` button on an
 * archived task card. The web shell looks the task up in the archive
 * vault by id, calls `removeArchivedTask`, re-inserts into the matching
 * active section, and writes both files.
 */
export type TaskUnresolveHandler = (target: EditTarget) => void;
