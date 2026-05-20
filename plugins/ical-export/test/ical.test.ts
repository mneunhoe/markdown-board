import type { Task, Vault } from '@markdown-board/core';
import { describe, expect, it } from 'vitest';

import {
  buildICalForWeek,
  foldLine,
  icalEscape,
  icalFilename,
  stableTaskUid,
} from '../src/ical.js';

function task(over: Partial<Task> = {}): Task {
  return {
    id: Math.random().toString(36).slice(2),
    checked: false,
    title: 'T',
    note: '',
    resolution: '',
    priority: null,
    project: null,
    day: null,
    pomodoros: 0,
    subtasks: [],
    ...over,
  };
}

// 2026-05-20 is a Wednesday → week of Mon 2026-05-18.
const NOW = new Date('2026-05-20T10:00:00');

describe('icalEscape', () => {
  it('escapes backslash, newline, comma, semicolon', () => {
    expect(icalEscape('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });
});

describe('foldLine', () => {
  it('leaves short lines untouched', () => {
    expect(foldLine('SHORT:value')).toBe('SHORT:value');
  });
  it('folds long lines at 75 octets with an indented continuation', () => {
    const line = 'X:' + 'a'.repeat(120);
    const folded = foldLine(line);
    expect(folded).toContain('\r\n ');
    expect(folded.split('\r\n')[0]!.length).toBe(75);
  });
});

describe('stableTaskUid', () => {
  it('is stable for the same project+title and differs otherwise', () => {
    const a = stableTaskUid(task({ title: 'Ship it', project: 'PSD' }));
    const b = stableTaskUid(task({ title: 'Ship it', project: 'PSD' }));
    const c = stableTaskUid(task({ title: 'Ship it', project: 'OTHER' }));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^task-[0-9a-f]{8}@markdown-board\.local$/);
  });
});

describe('icalFilename', () => {
  it('names the file after the week-start date', () => {
    expect(icalFilename(NOW)).toBe('tasks-week-of-20260518.ics');
  });
});

describe('buildICalForWeek', () => {
  it('returns null when no tasks are scheduled this week', () => {
    const vault: Vault = { prelude: '', sections: [{ id: 's', name: 'Active', tasks: [task()] }] };
    expect(buildICalForWeek(vault, NOW)).toBeNull();
  });

  it('emits a VCALENDAR with a VEVENT per dated task, CRLF-terminated', () => {
    const vault: Vault = {
      prelude: '',
      sections: [
        {
          id: 's',
          name: 'Active',
          tasks: [
            task({ title: 'Wire shell', day: 'Mon', project: 'PSD — extra', priority: 'high' }),
            task({ title: 'Skip me', day: 'Tue', checked: true }),
          ],
        },
      ],
    };
    const ics = buildICalForWeek(vault, NOW)!;
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics.endsWith('\r\n')).toBe(true);
    // Monday of the week is 2026-05-18.
    expect(ics).toContain('DTSTART;VALUE=DATE:20260518');
    expect(ics).toContain('DTEND;VALUE=DATE:20260519');
    expect(ics).toContain('SUMMARY:[PSD] Wire shell');
    expect(ics).toContain('PRIORITY:3');
    // Checked task is skipped.
    expect(ics).not.toContain('Skip me');
    // Exactly one event.
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });
});
