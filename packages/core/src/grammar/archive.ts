// Archive entry shape and append-only writer for `archive/TASKS.md`.
//
// Two pure helpers, both string-in / string-out:
//
// - `buildArchiveEntry(task, resolution, section, { now })` produces the
//   per-resolution Markdown block — a `## YYYY-MM-DD HH:MM — SectionName`
//   header followed by a regular §3.4 task line (checked) carrying the
//   merged resolution + original note. Mirrors active TASKS.md grammar
//   so the archive file parses cleanly through `parseTasks`.
// - `appendToArchive(existing, entry)` returns the new file contents,
//   laying down the `# Archived Tasks` prelude on the first call and
//   appending with a clean `\n` boundary thereafter.
//
// File I/O lives in the adapter layer (FSA web shell, Tauri desktop).
// Core only knows about strings — keeps the helpers fully testable and
// reusable regardless of host environment.
//
// **Format change (2026-05-19, slice 6f):** the entry shape used to be
// a structured "resolution log" with `**Resolution:**`, `*section=…*`
// metadata, and an `---` thematic break. That format wasn't parseable
// by `parseTasks`. The new shape is a real task line so the archive
// reads back as a regular vault — prerequisite for surfacing archived
// tasks in the Done column. **Breaking change:** existing archives in
// the old format stay as-is; the parser tolerates mixed-format files
// (old entries are silently skipped) but writers only ever emit the
// new shape from this commit forward.

import { emitTaskBlock } from './tasks.js';
import type { Section, Task } from './types.js';

export const ARCHIVE_HEADER =
  '# Archived Tasks\n\nResolved tasks moved out of `TASKS.md` by the dashboard.\n';

export interface BuildArchiveEntryOptions {
  /** Injected for deterministic tests. Defaults to `new Date()`. */
  now?: Date;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function fmtArchiveTimestamp(d: Date): string {
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    ` ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  );
}

function normaliseLineEndings(s: string): string {
  return s.replace(/\r\n?/g, '\n');
}

/**
 * Collapse multi-line text into a single-line ` · `-separated string
 * suitable for the §3.5 inline note suffix. Empty lines are dropped
 * after trimming. CRLF is normalised to LF first.
 */
function collapseToInlineNote(text: string): string {
  return normaliseLineEndings(text)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' · ');
}

/**
 * Merge the original task note (left) with the resolution (right) into
 * a single inline note. When both are present, the resolution comes
 * first (it's the most recent context — "what happened"), then ` · `,
 * then the original note ("what it was about"). Either may be empty.
 */
function mergeNote(original: string, resolution: string): string {
  const o = collapseToInlineNote(original);
  const r = collapseToInlineNote(resolution);
  if (o && r) return `${r} · ${o}`;
  return r || o;
}

export function buildArchiveEntry(
  task: Task,
  resolution: string,
  section: Section,
  options: BuildArchiveEntryOptions = {},
): string {
  const ts = fmtArchiveTimestamp(options.now ?? new Date());
  const sectionName = normaliseLineEndings(section.name).trim();
  const heading = sectionName ? `## ${ts} — ${sectionName}` : `## ${ts}`;

  // Build the resolved task: merge original note with resolution and
  // flip `checked = true`. Everything else (title, tokens, subtasks,
  // id) round-trips verbatim through `emitTaskBlock`.
  const resolved: Task = {
    ...task,
    checked: true,
    title: normaliseLineEndings(task.title),
    note: mergeNote(task.note, resolution),
    subtasks: task.subtasks.map((st) => ({
      text: normaliseLineEndings(st.text),
      checked: st.checked,
    })),
  };

  return `\n${heading}\n\n${emitTaskBlock(resolved)}`;
}

export function appendToArchive(existing: string, entry: string): string {
  if (!existing.trim()) {
    return `${ARCHIVE_HEADER}${entry}\n`;
  }
  const sep = existing.endsWith('\n') ? '' : '\n';
  return `${existing}${sep}${entry}\n`;
}
