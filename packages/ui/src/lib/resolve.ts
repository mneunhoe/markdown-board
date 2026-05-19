/**
 * Resolve-task callback shape, shared by BoardView and ListView when they
 * forward their TaskCard checkbox click. Identifies the task + its source
 * section so the shell can write to `archive/TASKS.md` (per §6.4) and
 * remove the row from the in-memory vault.
 */
export type ResolveTarget = {
  taskId: string;
  sectionId: string;
};

export type ResolveHandler = (target: ResolveTarget) => void;
