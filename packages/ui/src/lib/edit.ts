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

export type TitleEditHandler = (target: EditTarget, next: string) => void;
export type NoteEditHandler = (target: EditTarget, next: string) => void;
export type SubtaskEditHandler = (target: EditTarget, idx: number, next: string) => void;
export type SubtaskAddHandler = (target: EditTarget, text: string) => void;
export type SubtaskToggleHandler = (target: EditTarget, idx: number) => void;
export type TaskDeleteHandler = (target: EditTarget) => void;
