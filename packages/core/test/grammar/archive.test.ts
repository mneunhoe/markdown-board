import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ARCHIVE_HEADER, appendToArchive, buildArchiveEntry } from '../../src/grammar/archive.js';
import type { Section, Task } from '../../src/grammar/types.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '',
    checked: false,
    title: 'Title',
    note: '',
    priority: null,
    project: null,
    day: null,
    pomodoros: 0,
    subtasks: [],
    ...overrides,
  };
}

function makeSection(name = 'Active'): Section {
  return { id: name.toLowerCase(), name, tasks: [] };
}

const NOW = new Date(2026, 4, 18, 10, 43);

describe('buildArchiveEntry — canonical shape (§6.2 / dashboard.html:3616-3660)', () => {
  it('emits every block when all fields are populated', () => {
    const task = makeTask({
      title: 'Ship release',
      note: 'tagging v0.1.0',
      priority: 'high',
      project: 'markdown-board',
      day: 'Mon',
      pomodoros: 2,
      subtasks: [
        { text: 'done one', checked: true },
        { text: 'skipped two', checked: false },
      ],
    });
    const entry = buildArchiveEntry(task, 'Tagged and pushed.', makeSection(), { now: NOW });
    expect(entry).toBe(
      [
        '',
        '## 2026-05-18 10:43 — Ship release',
        '',
        '**Resolution:**',
        '',
        'Tagged and pushed.',
        '',
        '*section=Active · project=markdown-board · priority=high · day=Mon · pomodoros=2*',
        '',
        '**Original note:** tagging v0.1.0',
        '',
        '**Subtasks:**',
        '- [x] done one',
        '- [ ] skipped two',
        '',
        '---',
      ].join('\n'),
    );
  });

  it('uses ` — ` (em-dash with surrounding spaces) between timestamp and title', () => {
    const entry = buildArchiveEntry(makeTask({ title: 'T' }), '', makeSection(), { now: NOW });
    expect(entry).toContain('## 2026-05-18 10:43 — T');
  });

  it('terminates with a `---` thematic break (entry boundary)', () => {
    const entry = buildArchiveEntry(makeTask(), '', makeSection(), { now: NOW });
    expect(entry.endsWith('\n---')).toBe(true);
  });

  it('starts with a leading blank line so concatenation gives a clean H2 boundary', () => {
    const entry = buildArchiveEntry(makeTask(), '', makeSection(), { now: NOW });
    expect(entry.startsWith('\n## ')).toBe(true);
  });
});

describe('buildArchiveEntry — resolution body (§15.1 / Q15)', () => {
  it('emits **Resolution:** + trimmed body when present', () => {
    const entry = buildArchiveEntry(makeTask(), '  body  ', makeSection(), { now: NOW });
    expect(entry).toContain('**Resolution:**\n\nbody\n');
  });

  it('emits *(no resolution note)* when resolution is empty', () => {
    const entry = buildArchiveEntry(makeTask(), '', makeSection(), { now: NOW });
    expect(entry).toContain('*(no resolution note)*');
    expect(entry).not.toContain('**Resolution:**');
  });

  it('treats whitespace-only resolution as empty', () => {
    const entry = buildArchiveEntry(makeTask(), '   \n  ', makeSection(), { now: NOW });
    expect(entry).toContain('*(no resolution note)*');
    expect(entry).not.toContain('**Resolution:**');
  });

  it('preserves internal Markdown in the resolution verbatim (Q15)', () => {
    const entry = buildArchiveEntry(makeTask(), '## hijacked\n- item\n> quote', makeSection(), {
      now: NOW,
    });
    expect(entry).toContain('**Resolution:**\n\n## hijacked\n- item\n> quote\n');
  });
});

describe('buildArchiveEntry — metadata line (`*section=… · project=… · …*`)', () => {
  it('joins fields with ` · ` (space middle-dot space) inside `*…*`', () => {
    const task = makeTask({ priority: 'high', day: 'Mon', pomodoros: 2 });
    const entry = buildArchiveEntry(task, '', makeSection(), { now: NOW });
    expect(entry).toContain('*section=Active · priority=high · day=Mon · pomodoros=2*');
  });

  it('omits the metadata line entirely when no fields are populated', () => {
    const task = makeTask();
    const entry = buildArchiveEntry(task, '', { id: '', name: '', tasks: [] }, { now: NOW });
    expect(entry).not.toMatch(/\*section=|\*project=|\*priority=|\*day=|\*pomodoros=/);
  });

  it('omits `section=` when section.name is empty', () => {
    const entry = buildArchiveEntry(
      makeTask({ priority: 'high' }),
      '',
      { id: '', name: '', tasks: [] },
      { now: NOW },
    );
    expect(entry).toContain('*priority=high*');
    expect(entry).not.toContain('section=');
  });

  it('omits `project=` when task.project is null', () => {
    const entry = buildArchiveEntry(makeTask({ priority: 'high' }), '', makeSection(), {
      now: NOW,
    });
    expect(entry).not.toContain('project=');
  });

  it('omits `priority=` when task.priority is null', () => {
    const entry = buildArchiveEntry(makeTask({ day: 'Mon' }), '', makeSection(), { now: NOW });
    expect(entry).not.toContain('priority=');
  });

  it('omits `day=` when task.day is null', () => {
    const entry = buildArchiveEntry(makeTask({ priority: 'low' }), '', makeSection(), {
      now: NOW,
    });
    expect(entry).not.toContain('day=');
  });

  it('omits `pomodoros=` when pomodoros is 0', () => {
    const entry = buildArchiveEntry(
      makeTask({ pomodoros: 0, priority: 'high' }),
      '',
      makeSection(),
      {
        now: NOW,
      },
    );
    expect(entry).not.toContain('pomodoros=');
  });

  it('includes pomodoros when count is positive', () => {
    const entry = buildArchiveEntry(makeTask({ pomodoros: 5 }), '', makeSection(), { now: NOW });
    expect(entry).toContain('· pomodoros=5*');
  });

  it('preserves the canonical field order: section, project, priority, day, pomodoros', () => {
    const task = makeTask({
      project: 'Foo',
      priority: 'blocker',
      day: 'Fri',
      pomodoros: 3,
    });
    const entry = buildArchiveEntry(task, '', makeSection('Doing'), { now: NOW });
    expect(entry).toContain(
      '*section=Doing · project=Foo · priority=blocker · day=Fri · pomodoros=3*',
    );
  });
});

describe('buildArchiveEntry — original note', () => {
  it('emits `**Original note:** …` inline when present', () => {
    const task = makeTask({ note: 'background context' });
    const entry = buildArchiveEntry(task, '', makeSection(), { now: NOW });
    expect(entry).toContain('**Original note:** background context');
  });

  it('omits the note line entirely when task.note is empty', () => {
    const entry = buildArchiveEntry(makeTask(), '', makeSection(), { now: NOW });
    expect(entry).not.toContain('**Original note:**');
  });

  it('treats whitespace-only note as empty', () => {
    const entry = buildArchiveEntry(makeTask({ note: '   ' }), '', makeSection(), { now: NOW });
    expect(entry).not.toContain('**Original note:**');
  });

  it('trims surrounding whitespace from the note body', () => {
    const entry = buildArchiveEntry(makeTask({ note: '  trimmed  ' }), '', makeSection(), {
      now: NOW,
    });
    expect(entry).toContain('**Original note:** trimmed');
  });
});

describe('buildArchiveEntry — subtasks', () => {
  it('renders `[x]` for checked and `[ ]` for unchecked subtasks', () => {
    const task = makeTask({
      subtasks: [
        { text: 'a', checked: true },
        { text: 'b', checked: false },
      ],
    });
    const entry = buildArchiveEntry(task, '', makeSection(), { now: NOW });
    expect(entry).toContain('**Subtasks:**\n- [x] a\n- [ ] b\n');
  });

  it('omits the **Subtasks:** block entirely when no subtasks', () => {
    const entry = buildArchiveEntry(makeTask(), '', makeSection(), { now: NOW });
    expect(entry).not.toContain('**Subtasks:**');
  });
});

describe('buildArchiveEntry — line endings (Q4)', () => {
  it('normalises CRLF in the title to LF', () => {
    const entry = buildArchiveEntry(makeTask({ title: 'A\r\nB' }), '', makeSection(), { now: NOW });
    expect(entry).toContain('## 2026-05-18 10:43 — A\nB');
  });

  it('normalises CRLF in the resolution body to LF', () => {
    const entry = buildArchiveEntry(makeTask(), 'one\r\ntwo', makeSection(), { now: NOW });
    expect(entry).toContain('**Resolution:**\n\none\ntwo\n');
  });

  it('normalises CRLF in the original note to LF', () => {
    const entry = buildArchiveEntry(makeTask({ note: 'one\r\ntwo' }), '', makeSection(), {
      now: NOW,
    });
    expect(entry).toContain('**Original note:** one\ntwo');
  });

  it('normalises CRLF in subtask text to LF', () => {
    const entry = buildArchiveEntry(
      makeTask({ subtasks: [{ text: 'one\r\ntwo', checked: false }] }),
      '',
      makeSection(),
      { now: NOW },
    );
    expect(entry).toContain('- [ ] one\ntwo');
  });

  it('output is LF-only (no `\\r` anywhere)', () => {
    const entry = buildArchiveEntry(
      makeTask({
        title: 'a\r\nb',
        note: 'n\r\no',
        subtasks: [{ text: 's\r\nt', checked: false }],
      }),
      'r\r\nb',
      makeSection(),
      { now: NOW },
    );
    expect(entry).not.toContain('\r');
  });
});

describe('buildArchiveEntry — timestamp format (dashboard.html:3605-3608)', () => {
  it('formats as `YYYY-MM-DD HH:MM` zero-padded', () => {
    const entry = buildArchiveEntry(makeTask(), '', makeSection(), {
      now: new Date(2024, 0, 3, 4, 5),
    });
    expect(entry).toContain('## 2024-01-03 04:05 — Title');
  });

  it('uses local time, no timezone marker', () => {
    const entry = buildArchiveEntry(makeTask(), '', makeSection(), { now: NOW });
    // No `Z`, `+`, `T`, etc. in the timestamp portion.
    expect(entry).toMatch(/## \d{4}-\d{2}-\d{2} \d{2}:\d{2} — /);
    expect(entry).not.toMatch(/\d{2}:\d{2}[ZT+]/);
  });

  it('defaults `now` to the wall clock when no option is provided', () => {
    const entry = buildArchiveEntry(makeTask(), '', makeSection());
    expect(entry).toMatch(/## \d{4}-\d{2}-\d{2} \d{2}:\d{2} — Title/);
  });
});

describe('appendToArchive — first-write header path', () => {
  it('lays down the ARCHIVE_HEADER and trailing `\\n` on an empty existing file', () => {
    const entry = buildArchiveEntry(makeTask({ title: 'T' }), 'r', makeSection(), { now: NOW });
    const out = appendToArchive('', entry);
    expect(out.startsWith(ARCHIVE_HEADER)).toBe(true);
    expect(out.endsWith('\n')).toBe(true);
    expect(out).toBe(`${ARCHIVE_HEADER}${entry}\n`);
  });

  it('treats whitespace-only existing content as empty (uses .trim() check)', () => {
    const entry = buildArchiveEntry(makeTask(), '', makeSection(), { now: NOW });
    const out = appendToArchive('   \n\n  ', entry);
    expect(out.startsWith(ARCHIVE_HEADER)).toBe(true);
  });

  it('ARCHIVE_HEADER matches the prototype byte-for-byte (dashboard.html:3680)', () => {
    expect(ARCHIVE_HEADER).toBe(
      '# Archived Tasks\n\nResolved tasks moved out of `TASKS.md` by the dashboard.\n',
    );
  });
});

describe('appendToArchive — append path', () => {
  it('appends to non-empty existing content with a trailing `\\n`', () => {
    const existing = `${ARCHIVE_HEADER}\n## 2026-05-17 09:00 — Old\n\n*(no resolution note)*\n\n---\n`;
    const entry = buildArchiveEntry(makeTask({ title: 'New' }), '', makeSection(), { now: NOW });
    const out = appendToArchive(existing, entry);
    expect(out).toBe(`${existing}${entry}\n`);
    expect(out.endsWith('\n')).toBe(true);
  });

  it('inserts a `\\n` boundary when existing content does NOT end with `\\n`', () => {
    const existing = '# Archived Tasks\n\nnotrailing';
    const entry = buildArchiveEntry(makeTask(), '', makeSection(), { now: NOW });
    const out = appendToArchive(existing, entry);
    expect(out).toBe(`${existing}\n${entry}\n`);
  });

  it('does NOT insert a duplicate `\\n` when existing content already ends with `\\n`', () => {
    const existing = '# Archived Tasks\n\nbody\n';
    const entry = buildArchiveEntry(makeTask(), '', makeSection(), { now: NOW });
    const out = appendToArchive(existing, entry);
    expect(out).toBe(`${existing}${entry}\n`);
    expect(out).not.toContain('body\n\n\n## ');
  });

  it('preserves earlier entries byte-for-byte (append-only contract)', () => {
    const earlier = `${ARCHIVE_HEADER}\n## 2026-05-17 09:00 — A\n\n*(no resolution note)*\n\n---\n`;
    const entry = buildArchiveEntry(makeTask({ title: 'B' }), 'note', makeSection(), {
      now: NOW,
    });
    const out = appendToArchive(earlier, entry);
    expect(out.startsWith(earlier)).toBe(true);
  });
});

describe('appendToArchive — golden file (claude_life/archive/TASKS.md)', () => {
  it('reproduces the on-disk archive byte-for-byte from a first-write', () => {
    const fixture = readFileSync(join(fixturesDir, 'archive-tasks.md'), 'utf8');

    const task = makeTask({
      title: "Confirm the date of Xiao-Li Meng's R&R letter",
      // The prototype parser leaves leading em-dash in the note body
      // (parseTasks strips a leading `- ` only, not `— `). The on-disk
      // archive entry preserves the em-dash, so the test reproduces that
      // exact shape.
      note: '— the six-week deadline runs from that date. Find the email and compute the resubmission deadline.',
      priority: 'high',
      project: 'ADA-HDSR — revised proposal (six-week clock)',
      day: 'Mon',
      pomodoros: 0,
    });
    const section = makeSection('Active');
    const entry = buildArchiveEntry(task, 'The email was sent on 05/13/26', section, {
      now: new Date(2026, 4, 18, 10, 43),
    });

    const out = appendToArchive('', entry);
    expect(out).toBe(fixture);
  });
});
