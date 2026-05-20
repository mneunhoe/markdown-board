// Pure RFC 5545 (iCalendar) builder for the current week's scheduled tasks.
// No DOM / plugin-api deps so it's golden-testable. Ported from the legacy
// dashboard.html (~lines 3779–3921): line folding, escaping, and a stable
// FNV-1a UID so re-imports update rather than duplicate events.

import {
  WEEK_DAYS,
  bucketTasksByDay,
  weekDates,
  weekStart,
  type Task,
  type Vault,
} from '@markdown-board/core';

const CRLF = '\r\n';

/** RFC 5545 §3.3.11 text escaping. */
export function icalEscape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/** RFC 5545 §3.1 line folding: max 75 octets per line, continuations indented. */
export function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest.length) parts.push(` ${rest}`);
  return parts.join(CRLF);
}

/** Stable per-task UID (FNV-1a over `project::title`) so re-imports are idempotent. */
export function stableTaskUid(task: Task): string {
  const key = `${task.project ?? ''}::${task.title}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `task-${h.toString(16).padStart(8, '0')}@markdown-board.local`;
}

function fmtDate(d: Date): string {
  const y = d.getFullYear().toString().padStart(4, '0');
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}${m}${day}`;
}

function fmtStamp(d: Date): string {
  const iso = d.toISOString().replace(/[-:]/g, '');
  return `${iso.slice(0, 15)}Z`; // YYYYMMDDTHHMMSSZ
}

function shortProject(project: string | null): string | null {
  if (!project) return null;
  return project.split(/\s+[—–-]\s+/)[0]?.trim() ?? project;
}

function priorityNumber(priority: Task['priority']): number {
  switch (priority) {
    case 'blocker':
      return 1;
    case 'high':
      return 3;
    case 'low':
      return 9;
    default:
      return 5;
  }
}

/**
 * Build a VCALENDAR string for every dated, unchecked task in the week
 * containing `now`. Returns `null` when the week has no events.
 */
export function buildICalForWeek(vault: Vault, now: Date = new Date()): string | null {
  const start = weekStart(now);
  const dates = weekDates(start);
  const buckets = bucketTasksByDay(vault);
  const stamp = fmtStamp(new Date());

  const events: string[] = [];
  WEEK_DAYS.forEach((day, i) => {
    const date = dates[i]!;
    const next = new Date(date);
    next.setDate(date.getDate() + 1);
    for (const { task, sectionName } of buckets[day]) {
      if (task.checked) continue;
      const proj = shortProject(task.project);
      const summary = proj ? `[${proj}] ${task.title}` : task.title;
      const descParts: string[] = [];
      if (task.note) descParts.push(task.note);
      if (task.project) descParts.push(`Project: ${task.project}`);
      if (task.priority) descParts.push(`Priority: ${task.priority}`);
      descParts.push(`Section: ${sectionName}`);
      for (const sub of task.subtasks) descParts.push(`- [${sub.checked ? 'x' : ' '}] ${sub.text}`);
      const lines = [
        'BEGIN:VEVENT',
        `UID:${stableTaskUid(task)}`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${fmtDate(date)}`,
        `DTEND;VALUE=DATE:${fmtDate(next)}`,
        `SUMMARY:${icalEscape(summary)}`,
        `DESCRIPTION:${icalEscape(descParts.join('\n'))}`,
        `CATEGORIES:${icalEscape(proj ?? sectionName)}`,
        `PRIORITY:${priorityNumber(task.priority)}`,
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
      ];
      events.push(...lines);
    }
  });

  if (events.length === 0) return null;

  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//markdown-board//week-export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ];
  return calendar.map(foldLine).join(CRLF) + CRLF;
}

/** Filename for the week's export, e.g. `tasks-week-of-20260518.ics`. */
export function icalFilename(now: Date = new Date()): string {
  return `tasks-week-of-${fmtDate(weekStart(now))}.ics`;
}
