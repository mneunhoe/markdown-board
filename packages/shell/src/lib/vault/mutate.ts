// Pure mutation helpers for the in-memory Vault. The web shell wires the
// DnD handlers from `@markdown-board/ui`'s BoardView / ListView to these,
// and Svelte 5's deep $state proxy picks up the in-place splices so an
// `$effect` watching `toMarkdown(vault)` re-fires automatically.
//
// Returns `boolean` (rather than throwing) so the autosave $effect can
// short-circuit silently if a stale handle / no-op move sneaks through.

import { nextPriority, slugifySection } from '@markdown-board/core';
import type { Day, Priority, Section, Task, Vault } from '@markdown-board/core';

export interface TaskMove {
  taskId: string;
  fromSectionId: string;
  toSectionId: string;
  /** Destination index *after* the source has been spliced out. */
  toIndex: number;
}

export interface ColumnMove {
  sectionId: string;
  /** Destination index *after* the source has been spliced out. */
  toIndex: number;
}

export function moveTask(vault: Vault, move: TaskMove): boolean {
  const from = vault.sections.find((s) => s.id === move.fromSectionId);
  const to = vault.sections.find((s) => s.id === move.toSectionId);
  if (!from || !to) return false;
  const idx = from.tasks.findIndex((t) => t.id === move.taskId);
  if (idx === -1) return false;
  const [task] = from.tasks.splice(idx, 1);
  if (!task) return false;
  to.tasks.splice(move.toIndex, 0, task);
  return true;
}

export function moveColumn(vault: Vault, move: ColumnMove): boolean {
  const idx = vault.sections.findIndex((s) => s.id === move.sectionId);
  if (idx === -1) return false;
  const [section] = vault.sections.splice(idx, 1);
  if (!section) return false;
  vault.sections.splice(move.toIndex, 0, section);
  return true;
}

/**
 * Mint missing or duplicate `task.id` values in place. The DnD handlers
 * identify a moved task by `taskId`, so empty / colliding ids must be
 * resolved before any reorder is wired up. Pre-existing unique ids are
 * preserved byte-for-byte.
 *
 * Stop-gap until `parseTasks({ assignMissingIds: true })` lands in core
 * (Q13). Lives in the web shell because that's where the requirement
 * surfaces — pure tests + a core test that already pins the empty-id
 * case make it safe to mint here for now.
 */
export function ensureUniqueTaskIds(vault: Vault): void {
  const seen = new Set<string>();
  for (const section of vault.sections) {
    for (const task of section.tasks) {
      if (task.id && !seen.has(task.id)) {
        seen.add(task.id);
        continue;
      }
      let id = mintId();
      while (seen.has(id)) id = mintId();
      task.id = id;
      seen.add(id);
    }
  }
}

function mintId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface TaskTarget {
  taskId: string;
  sectionId: string;
}

function findTaskInVault(
  vault: Vault,
  target: TaskTarget,
): { tasks: Vault['sections'][number]['tasks']; idx: number } | null {
  const section = vault.sections.find((s) => s.id === target.sectionId);
  if (!section) return null;
  const idx = section.tasks.findIndex((t) => t.id === target.taskId);
  if (idx === -1) return null;
  return { tasks: section.tasks, idx };
}

export function setTaskTitle(vault: Vault, target: TaskTarget, next: string): boolean {
  const found = findTaskInVault(vault, target);
  const task = found && found.tasks[found.idx];
  if (!task) return false;
  task.title = next;
  return true;
}

export function setTaskNote(vault: Vault, target: TaskTarget, next: string): boolean {
  const found = findTaskInVault(vault, target);
  const task = found && found.tasks[found.idx];
  if (!task) return false;
  task.note = next;
  return true;
}

export function deleteTask(vault: Vault, target: TaskTarget): boolean {
  const found = findTaskInVault(vault, target);
  if (!found) return false;
  found.tasks.splice(found.idx, 1);
  return true;
}

export function setSubtaskText(
  vault: Vault,
  target: TaskTarget,
  idx: number,
  next: string,
): boolean {
  const found = findTaskInVault(vault, target);
  const task = found && found.tasks[found.idx];
  if (!task) return false;
  if (idx < 0 || idx >= task.subtasks.length) return false;
  if (next === '') {
    task.subtasks.splice(idx, 1);
    return true;
  }
  const subtask = task.subtasks[idx];
  if (!subtask) return false;
  subtask.text = next;
  return true;
}

export function toggleSubtask(vault: Vault, target: TaskTarget, idx: number): boolean {
  const found = findTaskInVault(vault, target);
  const task = found && found.tasks[found.idx];
  if (!task) return false;
  const subtask = task.subtasks[idx];
  if (!subtask) return false;
  subtask.checked = !subtask.checked;
  return true;
}

export function addSubtask(vault: Vault, target: TaskTarget, text: string): boolean {
  const found = findTaskInVault(vault, target);
  const task = found && found.tasks[found.idx];
  if (!task) return false;
  if (!text) return false;
  task.subtasks.push({ text, checked: false });
  return true;
}

export function setTaskPriority(vault: Vault, target: TaskTarget, next: Priority): boolean {
  const found = findTaskInVault(vault, target);
  const task = found && found.tasks[found.idx];
  if (!task) return false;
  task.priority = next;
  return true;
}

export function cycleTaskPriority(vault: Vault, target: TaskTarget): boolean {
  const found = findTaskInVault(vault, target);
  const task = found && found.tasks[found.idx];
  if (!task) return false;
  task.priority = nextPriority(task.priority);
  return true;
}

export function setTaskProject(vault: Vault, target: TaskTarget, next: string | null): boolean {
  const found = findTaskInVault(vault, target);
  const task = found && found.tasks[found.idx];
  if (!task) return false;
  task.project = next && next.trim() ? next.trim() : null;
  return true;
}

export function setTaskDay(vault: Vault, target: TaskTarget, next: Day | null): boolean {
  const found = findTaskInVault(vault, target);
  const task = found && found.tasks[found.idx];
  if (!task) return false;
  task.day = next;
  return true;
}

/**
 * Replace a task in place with the supplied `next`. Preserves the task's
 * original `id` and `checked` state (the full-edit modal doesn't expose
 * either — id stays runtime-only per spec §3.15, and checked is gated
 * through the resolve flow). Used by the slice 6e TaskEditModal "Save"
 * confirm.
 *
 * Returns `false` for a stale target. Mutates the array slot rather
 * than the task object's fields one-by-one so the deep $state proxy
 * fires a single reactivity tick instead of N.
 */
export function setTask(vault: Vault, target: TaskTarget, next: Task): boolean {
  const found = findTaskInVault(vault, target);
  const current = found && found.tasks[found.idx];
  if (!found || !current) return false;
  found.tasks[found.idx] = {
    ...next,
    id: current.id,
    checked: current.checked,
  };
  return true;
}

/**
 * Rename a section by id. Updates both `name` and (when the new slug
 * differs) the runtime `id`, mirroring `dashboard.html:3162-3171`. The
 * id sync keeps DnD targets and column lookups consistent with what a
 * fresh `parseTasks` of the next autosave output would produce.
 *
 * Returns `false` when the target section is unknown OR when the
 * proposed name would collide with another section's id (the caller
 * can surface the rejection in the UI; the in-memory vault is left
 * unchanged).
 */
export function renameSection(vault: Vault, sectionId: string, nextName: string): boolean {
  const trimmed = nextName.trim();
  if (!trimmed) return false;
  const section = vault.sections.find((s) => s.id === sectionId);
  if (!section) return false;
  const newId = slugifySection(trimmed);
  if (newId !== sectionId && vault.sections.some((s) => s.id === newId)) {
    return false;
  }
  section.name = trimmed;
  section.id = newId;
  return true;
}

/**
 * Append a new task to the bottom of `sectionId`. Mirrors the
 * prototype's `addNewTask` (`dashboard.html:3303-3338`). Returns the
 * minted task id on success, `null` when the section doesn't exist.
 * Title is trimmed; an empty title yields `null`.
 *
 * The new task gets a freshly-minted id via `ensureUniqueTaskIds` so
 * the DnD subsystem can identify it. All token / note fields default
 * to empty / null — the user can fill them in afterward via inline
 * edit (slice 6a) or the full editor (slice 6e).
 */
export function addTaskToSection(vault: Vault, sectionId: string, title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return null;
  const section = vault.sections.find((s) => s.id === sectionId);
  if (!section) return null;
  const newTask: Task = {
    id: '',
    checked: false,
    title: trimmed,
    note: '',
    resolution: '',
    priority: null,
    project: null,
    day: null,
    pomodoros: 0,
    subtasks: [],
  };
  section.tasks.push(newTask);
  ensureUniqueTaskIds(vault);
  return newTask.id;
}

export type AddSectionResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'empty' | 'collision' };

export type DeleteSectionResult = { ok: true } | { ok: false; reason: 'not-found' | 'not-empty' };

/**
 * Remove a section from the vault by id. Refuses when the section
 * still carries open tasks (`tasks.length > 0`) — the caller is
 * expected to hide the affordance in that case; this defensive check
 * exists in case the helper is invoked from a non-UI surface (future
 * command palette / API).
 *
 * Note: this helper only inspects the active vault. Archived tasks
 * whose source-section name matched the deleted column become
 * "orphaned" in `archive/TASKS.md` (no matching active section) and
 * are folded under the first active column by the slice 6g-3 grouping
 * derivation. The UI hides the delete affordance when the column has
 * any archived refs too, so this normally won't fire in practice.
 */
export function deleteSection(vault: Vault, sectionId: string): DeleteSectionResult {
  const idx = vault.sections.findIndex((s) => s.id === sectionId);
  if (idx === -1) return { ok: false, reason: 'not-found' };
  const section = vault.sections[idx]!;
  if (section.tasks.length > 0) return { ok: false, reason: 'not-empty' };
  vault.sections.splice(idx, 1);
  return { ok: true };
}

/**
 * Append a new section to the end of the vault. Mirrors
 * `startAddingSection` (`dashboard.html:4560-4592`). Name is trimmed;
 * empty → reason='empty'. Slug collides with an existing section's id
 * → reason='collision' (App.svelte surfaces both via `role=alert`).
 */
export function addSection(vault: Vault, name: string): AddSectionResult {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, reason: 'empty' };
  const id = slugifySection(trimmed);
  if (vault.sections.some((s) => s.id === id)) {
    return { ok: false, reason: 'collision' };
  }
  const section: Section = { id, name: trimmed, tasks: [] };
  vault.sections.push(section);
  return { ok: true, id };
}

/**
 * Collect the unique short-project names across the vault (sorted).
 * Used to pre-fill the project picker's `<datalist>` (mirrors
 * `allProjects()` in `dashboard.html:2614-2625`).
 */
export function allProjects(vault: Vault): string[] {
  const set = new Set<string>();
  for (const section of vault.sections) {
    for (const task of section.tasks) {
      if (task.project) set.add(task.project);
    }
  }
  return Array.from(set).sort();
}
