import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ARCHIVE_HEADER, appendToArchive, buildArchiveEntry } from '../../src/grammar/archive.js';
import { parseTasks } from '../../src/grammar/tasks.js';
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

describe('buildArchiveEntry — task-grammar shape (slice 6f)', () => {
  it('emits a `## YYYY-MM-DD HH:MM — SectionName` header followed by a regular `- [x]` task line', () => {
    const task = makeTask({
      id: 'abc12345',
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
        '## 2026-05-18 10:43 — Active',
        '',
        '- [x] **[P1] [project:markdown-board] [Mon] [pom:2] Ship release** - Tagged and pushed. · tagging v0.1.0 <!-- id:abc12345 -->',
        '  - [x] done one',
        '  - [ ] skipped two',
      ].join('\n'),
    );
  });

  it('starts with a leading blank line so concatenation produces a clean H2 boundary', () => {
    const entry = buildArchiveEntry(makeTask(), '', makeSection(), { now: NOW });
    expect(entry.startsWith('\n## ')).toBe(true);
  });

  it('does NOT end with a trailing newline (appendToArchive adds one)', () => {
    const entry = buildArchiveEntry(makeTask(), '', makeSection(), { now: NOW });
    expect(entry.endsWith('\n')).toBe(false);
  });

  it('the H2 carries the original section name (preserves context for the Done-column merge)', () => {
    const entry = buildArchiveEntry(makeTask(), '', makeSection('Doing'), { now: NOW });
    expect(entry).toContain('## 2026-05-18 10:43 — Doing');
  });

  it('omits the ` — Section` suffix when section.name is empty', () => {
    const entry = buildArchiveEntry(
      makeTask({ title: 'T' }),
      '',
      { id: '', name: '', tasks: [] },
      { now: NOW },
    );
    expect(entry).toContain('## 2026-05-18 10:43\n');
    expect(entry).not.toContain('—');
  });

  it('flips `checked` to true regardless of the input task state', () => {
    const entry = buildArchiveEntry(makeTask({ checked: false }), '', makeSection(), { now: NOW });
    expect(entry).toContain('- [x] **Title**');
  });

  it('round-trips through parseTasks as one task in one section', () => {
    const task = makeTask({
      id: 'abc12345',
      title: 'Ship',
      priority: 'high',
      project: 'foo',
      day: 'Tue',
      pomodoros: 3,
      subtasks: [{ text: 'a', checked: true }],
    });
    const entry = buildArchiveEntry(task, 'done', makeSection('Done'), { now: NOW });
    const parsed = parseTasks(entry.trimStart());
    expect(parsed.sections).toHaveLength(1);
    const section = parsed.sections[0]!;
    expect(section.name).toBe('2026-05-18 10:43 — Done');
    expect(section.tasks).toHaveLength(1);
    const round = section.tasks[0]!;
    expect(round.checked).toBe(true);
    expect(round.title).toBe('Ship');
    expect(round.priority).toBe('high');
    expect(round.project).toBe('foo');
    expect(round.day).toBe('Tue');
    expect(round.pomodoros).toBe(3);
    expect(round.note).toBe('done');
    expect(round.subtasks).toEqual([{ text: 'a', checked: true }]);
    expect(round.id).toBe('abc12345');
  });
});

describe('buildArchiveEntry — note merge (resolution + original)', () => {
  it('uses just the resolution when the task has no note', () => {
    const entry = buildArchiveEntry(makeTask(), 'done', makeSection(), { now: NOW });
    expect(entry).toContain('- [x] **Title** - done');
  });

  it('uses just the original note when the resolution is empty', () => {
    const entry = buildArchiveEntry(makeTask({ note: 'context' }), '', makeSection(), { now: NOW });
    expect(entry).toContain('- [x] **Title** - context');
  });

  it('emits no note suffix when both are empty', () => {
    const entry = buildArchiveEntry(makeTask(), '', makeSection(), { now: NOW });
    expect(entry).toMatch(/- \[x\] \*\*Title\*\*$/);
    expect(entry).not.toMatch(/\*\* - /);
  });

  it('joins resolution (first) and original note (second) with ` · ` when both are present', () => {
    const entry = buildArchiveEntry(makeTask({ note: 'context' }), 'done', makeSection(), {
      now: NOW,
    });
    expect(entry).toContain('- [x] **Title** - done · context');
  });

  it('collapses multi-line resolutions with ` · ` separators', () => {
    const entry = buildArchiveEntry(makeTask(), 'line one\nline two\nline three', makeSection(), {
      now: NOW,
    });
    expect(entry).toContain('- [x] **Title** - line one · line two · line three');
  });

  it('drops blank lines inside multi-line input before joining', () => {
    const entry = buildArchiveEntry(makeTask(), 'one\n\n\ntwo', makeSection(), { now: NOW });
    expect(entry).toContain('- [x] **Title** - one · two');
  });

  it('trims surrounding whitespace from each line', () => {
    const entry = buildArchiveEntry(makeTask(), '  one  \n  two  ', makeSection(), { now: NOW });
    expect(entry).toContain('- [x] **Title** - one · two');
  });
});

describe('buildArchiveEntry — tokens are written in canonical order', () => {
  it('order: [P*] [project:…] [Day] [pom:N] (matches active task grammar)', () => {
    const task = makeTask({
      title: 'X',
      priority: 'blocker',
      project: 'Foo',
      day: 'Fri',
      pomodoros: 3,
    });
    const entry = buildArchiveEntry(task, '', makeSection(), { now: NOW });
    expect(entry).toContain('**[P0] [project:Foo] [Fri] [pom:3] X**');
  });

  it('omits absent tokens', () => {
    const entry = buildArchiveEntry(makeTask({ title: 'X', priority: 'low' }), '', makeSection(), {
      now: NOW,
    });
    expect(entry).toContain('**[P3] X**');
    expect(entry).not.toContain('project:');
    expect(entry).not.toContain('[Mon]');
    expect(entry).not.toContain('pom:');
  });
});

describe('buildArchiveEntry — subtasks', () => {
  it('renders subtasks as two-space-indented task lines (matches active TASKS.md grammar)', () => {
    const task = makeTask({
      subtasks: [
        { text: 'a', checked: true },
        { text: 'b', checked: false },
      ],
    });
    const entry = buildArchiveEntry(task, '', makeSection(), { now: NOW });
    expect(entry).toMatch(/^ {2}- \[x\] a$/m);
    expect(entry).toMatch(/^ {2}- \[ \] b$/m);
  });

  it('emits no subtask lines when the task has none', () => {
    const entry = buildArchiveEntry(makeTask(), '', makeSection(), { now: NOW });
    expect(entry.split('\n').filter((l) => /^ {2}- \[/.test(l))).toEqual([]);
  });
});

describe('buildArchiveEntry — id round-trip', () => {
  it('keeps the original `<!-- id:… -->` suffix when present', () => {
    const entry = buildArchiveEntry(makeTask({ id: 'feedbeef' }), '', makeSection(), { now: NOW });
    expect(entry).toContain('<!-- id:feedbeef -->');
  });

  it('omits the id suffix when the task has no id', () => {
    const entry = buildArchiveEntry(makeTask({ id: '' }), '', makeSection(), { now: NOW });
    expect(entry).not.toContain('<!-- id:');
  });
});

describe('buildArchiveEntry — line endings (Q4)', () => {
  it('normalises CRLF in the title to LF', () => {
    const entry = buildArchiveEntry(makeTask({ title: 'A\r\nB' }), '', makeSection(), { now: NOW });
    expect(entry).not.toContain('\r');
  });

  it('normalises CRLF in the resolution input to LF before collapse', () => {
    const entry = buildArchiveEntry(makeTask(), 'one\r\ntwo', makeSection(), { now: NOW });
    expect(entry).toContain('- [x] **Title** - one · two');
    expect(entry).not.toContain('\r');
  });

  it('normalises CRLF in the original note to LF', () => {
    const entry = buildArchiveEntry(makeTask({ note: 'one\r\ntwo' }), '', makeSection(), {
      now: NOW,
    });
    expect(entry).toContain('one · two');
    expect(entry).not.toContain('\r');
  });

  it('normalises CRLF in subtask text to LF', () => {
    const entry = buildArchiveEntry(
      makeTask({ subtasks: [{ text: 'one\r\ntwo', checked: false }] }),
      '',
      makeSection(),
      { now: NOW },
    );
    expect(entry).not.toContain('\r');
  });
});

describe('buildArchiveEntry — timestamp format', () => {
  it('formats as `YYYY-MM-DD HH:MM` zero-padded', () => {
    const entry = buildArchiveEntry(makeTask(), '', makeSection(), {
      now: new Date(2024, 0, 3, 4, 5),
    });
    expect(entry).toContain('## 2024-01-03 04:05 — Active');
  });

  it('uses local time, no timezone marker', () => {
    const entry = buildArchiveEntry(makeTask(), '', makeSection(), { now: NOW });
    expect(entry).toMatch(/## \d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
    expect(entry).not.toMatch(/\d{2}:\d{2}[ZT+]/);
  });

  it('defaults `now` to the wall clock when no option is provided', () => {
    const entry = buildArchiveEntry(makeTask(), '', makeSection());
    expect(entry).toMatch(/## \d{4}-\d{2}-\d{2} \d{2}:\d{2} — Active/);
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

  it('ARCHIVE_HEADER preserves the original prelude (still tolerant to parseTasks)', () => {
    expect(ARCHIVE_HEADER).toBe(
      '# Archived Tasks\n\nResolved tasks moved out of `TASKS.md` by the dashboard.\n',
    );
  });
});

describe('appendToArchive — append path', () => {
  it('appends to non-empty existing content with a trailing `\\n`', () => {
    const existing = `${ARCHIVE_HEADER}\n## 2026-05-17 09:00 — Active\n\n- [x] **Old**\n`;
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
    const earlier = `${ARCHIVE_HEADER}\n## 2026-05-17 09:00 — Active\n\n- [x] **A**\n`;
    const entry = buildArchiveEntry(makeTask({ title: 'B' }), 'note', makeSection(), {
      now: NOW,
    });
    const out = appendToArchive(earlier, entry);
    expect(out.startsWith(earlier)).toBe(true);
  });
});

describe('appendToArchive — golden file (new task-grammar format)', () => {
  it('reproduces the on-disk archive byte-for-byte from a first-write', () => {
    const fixture = readFileSync(join(fixturesDir, 'archive-tasks.md'), 'utf8');

    const task = makeTask({
      id: '04c6b021',
      title: "Confirm the date of Xiao-Li Meng's R&R letter",
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
