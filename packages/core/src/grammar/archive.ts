// Archive entry shape and append-only writer for `archive/TASKS.md`.
//
// Two pure helpers, both string-in / string-out:
//
// - `buildArchiveEntry(task, resolution, section, { now })` produces the
//   per-resolution Markdown block from §6.2 / dashboard.html:3616-3660.
// - `appendToArchive(existing, entry)` returns the new file contents, laying
//   down the `# Archived Tasks` header on the first call and appending with
//   a clean `\n` boundary on every subsequent call (dashboard.html:3662-3690).
//
// File I/O lives in the adapter layer (FSA web shell, Tauri desktop). Core
// only knows about strings — keeps the helpers fully testable and reusable
// regardless of host environment.

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

export function buildArchiveEntry(
  task: Task,
  resolution: string,
  section: Section,
  options: BuildArchiveEntryOptions = {},
): string {
  const ts = fmtArchiveTimestamp(options.now ?? new Date());
  const lines: string[] = [];
  lines.push('');
  lines.push(`## ${ts} — ${normaliseLineEndings(task.title)}`);
  lines.push('');

  const trimmedResolution = resolution.trim();
  if (trimmedResolution) {
    lines.push('**Resolution:**');
    lines.push('');
    lines.push(normaliseLineEndings(trimmedResolution));
    lines.push('');
  } else {
    lines.push('*(no resolution note)*');
    lines.push('');
  }

  const meta: string[] = [];
  if (section.name) meta.push(`section=${section.name}`);
  if (task.project) meta.push(`project=${task.project}`);
  if (task.priority) meta.push(`priority=${task.priority}`);
  if (task.day) meta.push(`day=${task.day}`);
  if (task.pomodoros > 0) meta.push(`pomodoros=${task.pomodoros}`);
  if (meta.length > 0) {
    lines.push(`*${meta.join(' · ')}*`);
    lines.push('');
  }

  const noteTrimmed = task.note.trim();
  if (noteTrimmed) {
    lines.push(`**Original note:** ${normaliseLineEndings(noteTrimmed)}`);
    lines.push('');
  }

  if (task.subtasks.length > 0) {
    lines.push('**Subtasks:**');
    for (const st of task.subtasks) {
      const box = st.checked ? '[x]' : '[ ]';
      lines.push(`- ${box} ${normaliseLineEndings(st.text)}`);
    }
    lines.push('');
  }

  lines.push('---');
  return lines.join('\n');
}

export function appendToArchive(existing: string, entry: string): string {
  if (!existing.trim()) {
    return `${ARCHIVE_HEADER}${entry}\n`;
  }
  const sep = existing.endsWith('\n') ? '' : '\n';
  return `${existing}${sep}${entry}\n`;
}
