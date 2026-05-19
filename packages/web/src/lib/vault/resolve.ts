// Resolve-task helpers — compose core's pure `buildArchiveEntry` +
// `appendToArchive` with FileAdapter I/O. `appendArchiveEntry` reads the
// current `archive/TASKS.md`, builds the entry, and writes the appended
// file. `removeTask` is a pure vault mutation; calling code is expected
// to call it *after* the archive write succeeds so a write failure
// doesn't leave the vault and the archive out of sync.

import type { FileAdapter, Section, Task } from '@markdown-board/core';
import { appendToArchive, buildArchiveEntry, FileNotFoundError } from '@markdown-board/core';
import type { Vault } from '@markdown-board/core';

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
