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

import { emitTaskBlock, parseTaskBlock } from './tasks.js';
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

export function buildArchiveEntry(
  task: Task,
  resolution: string,
  section: Section,
  options: BuildArchiveEntryOptions = {},
): string {
  const ts = fmtArchiveTimestamp(options.now ?? new Date());
  const sectionName = normaliseLineEndings(section.name).trim();
  const heading = sectionName ? `## ${ts} — ${sectionName}` : `## ${ts}`;

  // Flip `checked = true` and stash the resolution in its own field;
  // the emitter handles formatting as `- [x] **Title** - [res: …] · note`.
  // Original note + subtasks + tokens + id all round-trip verbatim.
  const resolved: Task = {
    ...task,
    checked: true,
    title: normaliseLineEndings(task.title),
    note: collapseToInlineNote(task.note),
    resolution: collapseToInlineNote(resolution),
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

export interface RemovedArchivedTask {
  /** The parsed task itself (with subtasks). `checked` is true as written. */
  task: Task;
  /** The original section name from the H2's ` — Section` suffix (empty when the H2 had no suffix). */
  sourceSection: string;
  /** Raw `YYYY-MM-DD HH:MM` timestamp from the H2. */
  archivedAt: string;
}

export interface RemoveArchivedTaskResult {
  /** New archive content with the matching block sliced out. */
  content: string;
  /** Removed task metadata, or `null` when no entry with the supplied id was found. */
  removed: RemovedArchivedTask | null;
}

const ARCHIVE_H2_RE = /^## (?<ts>\d{4}-\d{2}-\d{2} \d{2}:\d{2})(?: — (?<section>.+?))?\s*$/;

/**
 * Slice out the archive entry whose body contains the matching
 * `<!-- id:taskId -->` comment. Pure string-in / string-out — caller
 * handles I/O and any cross-file mutations.
 *
 * The "entry block" runs from a `## YYYY-MM-DD HH:MM — Section` H2
 * line through to (but not including) the next H2 or end-of-file.
 * Trailing blank lines that belong to the removed block are pulled
 * out with it, so the surrounding boundary stays tight.
 *
 * Used by slice 6g-3's `unresolveTask` flow plus any future "empty
 * archive" / "delete archive entry" command (Phase 3).
 *
 * Returns `removed: null` and unchanged `content` when:
 * - `taskId` is empty
 * - no archive H2 contains a body line with `<!-- id:taskId -->`
 * - the matching block's body fails to parse via `parseTaskBlock`
 *   (malformed entry — likely an old-format archive line that
 *   slipped through; safer to leave it in place than corrupt it)
 */
export function removeArchivedTask(content: string, taskId: string): RemoveArchivedTaskResult {
  if (!taskId) return { content, removed: null };

  const normalized = content.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const idPattern = `<!-- id:${taskId} -->`;

  const h2Indices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (ARCHIVE_H2_RE.test(lines[i]!)) h2Indices.push(i);
  }

  for (let b = 0; b < h2Indices.length; b++) {
    const blockStart = h2Indices[b]!;
    const blockEnd = b + 1 < h2Indices.length ? h2Indices[b + 1]! : lines.length;

    let bodyHasId = false;
    for (let i = blockStart + 1; i < blockEnd; i++) {
      if (lines[i]!.includes(idPattern)) {
        bodyHasId = true;
        break;
      }
    }
    if (!bodyHasId) continue;

    const h2Match = ARCHIVE_H2_RE.exec(lines[blockStart]!)!;
    const archivedAt = h2Match.groups?.['ts'] ?? '';
    const sourceSection = (h2Match.groups?.['section'] ?? '').trim();

    const bodyText = lines
      .slice(blockStart + 1, blockEnd)
      .join('\n')
      .replace(/^\s+|\s+$/g, '');
    const task = parseTaskBlock(bodyText);
    if (!task) continue;

    const remainingLines = [...lines.slice(0, blockStart), ...lines.slice(blockEnd)];
    let nextContent = remainingLines.join('\n');
    // Collapse a run of 3+ blank lines (introduced when both the previous
    // and the removed block had trailing blanks) down to 2.
    nextContent = nextContent.replace(/\n{3,}/g, '\n\n');
    // Ensure the file still ends with a single trailing newline when it
    // had content to begin with (matches `appendToArchive`).
    if (nextContent.length > 0 && !nextContent.endsWith('\n')) nextContent += '\n';

    return {
      content: nextContent,
      removed: { task, sourceSection, archivedAt },
    };
  }

  return { content, removed: null };
}
