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

import type { Day } from '@markdown-board/core';

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
