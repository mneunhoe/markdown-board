// Resolve-task helpers — compose core's pure `buildArchiveEntry` +
// `appendToArchive` with FileAdapter I/O. `appendArchiveEntry` reads the
// current `archive/TASKS.md`, builds the entry, and writes the appended
// file. `removeTask` is a pure vault mutation; calling code is expected
// to call it *after* the archive write succeeds so a write failure
// doesn't leave the vault and the archive out of sync.

import type { FileAdapter, Section, Task } from '@markdown-board/core';
import {
  appendToArchive,
  buildArchiveEntry,
  FileNotFoundError,
  removeArchivedTask,
} from '@markdown-board/core';
import type { Vault } from '@markdown-board/core';
import { ensureUniqueTaskIds } from './mutate.js';

export const ARCHIVE_PATH = 'archive/TASKS.md';

export interface AppendArchiveEntryOptions {
  /** Injected for deterministic tests. Defaults to `new Date()`. */
  now?: Date;
}

/**
 * Build a §6.2 archive entry for `task` (resolved out of `section`) and
 * append it to `archive/TASKS.md`. Missing archive file is treated as
 * empty — the first write lays down the `# Archived Tasks` header per
 * core's `appendToArchive` contract.
 */
export async function appendArchiveEntry(
  adapter: FileAdapter,
  task: Task,
  resolution: string,
  section: Section,
  options: AppendArchiveEntryOptions = {},
): Promise<void> {
  const existing = await readOrEmpty(adapter, ARCHIVE_PATH);
  const entry = buildArchiveEntry(
    task,
    resolution,
    section,
    options.now ? { now: options.now } : {},
  );
  const next = appendToArchive(existing, entry);
  await adapter.writeFile(ARCHIVE_PATH, next);
}

async function readOrEmpty(adapter: FileAdapter, path: string): Promise<string> {
  try {
    return await adapter.readFile(path);
  } catch (err) {
    if (err instanceof FileNotFoundError) return '';
    throw err;
  }
}

/**
 * Look up a task + its containing section without mutating the vault.
 * Used to capture the task data for the archive entry *before* the
 * mutation that removes it — that way an archive-write failure can
 * leave the vault untouched.
 */
export function findTask(
  vault: Vault,
  target: { taskId: string; sectionId: string },
): { task: Task; section: Section } | null {
  const section = vault.sections.find((s) => s.id === target.sectionId);
  if (!section) return null;
  const task = section.tasks.find((t) => t.id === target.taskId);
  if (!task) return null;
  return { task, section };
}

/**
 * Remove a task from its section in place. Returns `true` on success,
 * `false` if the target is stale. Svelte 5's deep $state proxy picks up
 * the splice so any `$effect` watching `toMarkdown(vault)` re-fires.
 */
export function removeTask(vault: Vault, target: { taskId: string; sectionId: string }): boolean {
  const section = vault.sections.find((s) => s.id === target.sectionId);
  if (!section) return false;
  const idx = section.tasks.findIndex((t) => t.id === target.taskId);
  if (idx === -1) return false;
  section.tasks.splice(idx, 1);
  return true;
}

export type UnresolveFailure =
  | { ok: false; reason: 'archive-missing' }
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'no-active-sections' };

export interface UnresolveSuccess {
  ok: true;
  /** Id of the active section the task landed in. */
  targetSectionId: string;
  /** Original section name from the archive H2 (empty when the H2 had no ` — Section` suffix). */
  sourceSection: string;
  /**
   * `true` if the source section no longer exists in the active vault
   * (renamed via slice 6c or deleted), so the task fell back to the
   * first active section. The caller can surface a `role="alert"` to
   * tell the user which column the task actually landed in.
   */
  usedFallback: boolean;
}

export type UnresolveTaskResult = UnresolveSuccess | UnresolveFailure;

/**
 * Move an archived task back into the active vault — the symmetric of
 * `confirmResolve`. Reads `archive/TASKS.md`, slices the matching
 * `<!-- id:taskId -->` entry out via core's `removeArchivedTask`,
 * inserts the task at the top of the matching active section with
 * `checked = false`, and writes the slimmed archive content.
 *
 * The merged resolution-and-original note from slice 6f stays in
 * place on the unresolved task — the round-trip is mildly lossy by
 * design (see slice 6g Q8: the user can edit the note via the inline
 * editor afterward if they want to trim it).
 *
 * Section fallback: when no active section's name matches
 * `removed.sourceSection`, the task lands in `vault.sections[0]` and
 * the result carries `usedFallback: true` so App.svelte can surface
 * an alert.
 *
 * `ensureUniqueTaskIds(vault)` runs post-insert so a re-introduced id
 * that collides with one already in the active vault gets re-minted
 * instead of breaking DnD identity. The original archive entry was
 * already written with that id; we don't try to rewrite it.
 */
export async function unresolveTask(
  adapter: FileAdapter,
  vault: Vault,
  taskId: string,
): Promise<UnresolveTaskResult> {
  let content: string;
  try {
    content = await adapter.readFile(ARCHIVE_PATH);
  } catch (err) {
    if (err instanceof FileNotFoundError) return { ok: false, reason: 'archive-missing' };
    throw err;
  }

  const { content: nextContent, removed } = removeArchivedTask(content, taskId);
  if (!removed) return { ok: false, reason: 'not-found' };

  if (vault.sections.length === 0) return { ok: false, reason: 'no-active-sections' };

  const matching = removed.sourceSection
    ? (vault.sections.find((s) => s.name === removed.sourceSection) ?? null)
    : null;
  const targetSection = matching ?? vault.sections[0]!;
  const usedFallback = matching === null;

  // Merge `[res: …]` back into the active note so unresolved tasks
  // never carry a non-empty `resolution` field. Order matches the
  // pre-grammar status quo (resolution first, then ` · `, then the
  // original note). The marker is therefore a write-side concern
  // visible only inside `archive/TASKS.md`.
  const { resolution: res, note: orig } = removed.task;
  const mergedNote = res && orig ? `${res} · ${orig}` : res || orig;
  const restored: Task = {
    ...removed.task,
    checked: false,
    note: mergedNote,
    resolution: '',
  };
  targetSection.tasks.unshift(restored);
  ensureUniqueTaskIds(vault);

  await adapter.writeFile(ARCHIVE_PATH, nextContent);

  return {
    ok: true,
    targetSectionId: targetSection.id,
    sourceSection: removed.sourceSection,
    usedFallback,
  };
}
