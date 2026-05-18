import { describe, expect, it } from 'vitest';
import { parseTasks } from '../../src/grammar/tasks.js';
import type { Task, Vault } from '../../src/grammar/types.js';

// Canonical §15.1 example: one section, one fully-tokenised task with an
// existing id. Covers H2 → section slug, bold-title extraction, all four
// token kinds in canonical order, note suffix, and `<!-- id:xxx -->`
// round-trip.
describe('parseTasks — canonical §15.1 example', () => {
  it('parses a single section with one fully-tokenised task', () => {
    const input =
      '## Active\n' +
      '- [ ] **[P0] [project:Foo] [Mon] [pom:3] Title** - the note <!-- id:a3f8c4e1 -->\n';

    const expected: Vault = {
      prelude: '',
      sections: [
        {
          id: 'active',
          name: 'Active',
          tasks: [
            {
              id: 'a3f8c4e1',
              checked: false,
              title: 'Title',
              note: 'the note',
              priority: 'blocker',
              project: 'Foo',
              day: 'Mon',
              pomodoros: 3,
              subtasks: [],
            },
          ],
        },
      ],
    };

    expect(parseTasks(input)).toEqual(expected);
  });
});

describe('parseTasks — sections', () => {
  it('slugifies H2 names with spaces', () => {
    const v = parseTasks('## Waiting On\n');
    expect(v.sections[0]).toMatchObject({ id: 'waiting-on', name: 'Waiting On' });
  });

  it('preserves multiple sections in document order', () => {
    const v = parseTasks('## Active\n## Doing\n## Done\n');
    expect(v.sections.map((s) => s.id)).toEqual(['active', 'doing', 'done']);
  });

  it('strips flanking asterisks on H2 names', () => {
    const v = parseTasks('## **Active**\n');
    expect(v.sections[0]?.name).toBe('Active');
  });

  it('merges tasks under sections whose slugs collide', () => {
    const input =
      '## Active\n' +
      '- [ ] **First** <!-- id:aaaaaaaa -->\n' +
      '## active\n' +
      '- [ ] **Second** <!-- id:bbbbbbbb -->\n';
    const v = parseTasks(input);
    expect(v.sections).toHaveLength(1);
    expect(v.sections[0]?.tasks.map((t) => t.title)).toEqual(['First', 'Second']);
  });

  it('preserves empty sections', () => {
    const v = parseTasks('## Active\n## Done\n');
    expect(v.sections).toHaveLength(2);
    expect(v.sections[1]?.tasks).toEqual([]);
  });

  it('does not create task objects for task-shaped lines before any H2', () => {
    const v = parseTasks('- [ ] **Orphan** <!-- id:cccccccc -->\n## Active\n');
    expect(v.sections).toHaveLength(1);
    expect(v.sections[0]?.tasks).toHaveLength(0);
  });
});

describe('parseTasks — token grammar', () => {
  function firstTask(taskLine: string): Task {
    const v = parseTasks(`## Active\n${taskLine}\n`);
    const task = v.sections[0]?.tasks[0];
    if (!task) throw new Error('expected a task in section Active');
    return task;
  }

  it('maps each priority token to the right tier', () => {
    expect(firstTask('- [ ] **[P0] A** <!-- id:00000000 -->').priority).toBe('blocker');
    expect(firstTask('- [ ] **[P1] B** <!-- id:00000001 -->').priority).toBe('high');
    expect(firstTask('- [ ] **[P2] C** <!-- id:00000002 -->').priority).toBeNull();
    expect(firstTask('- [ ] **[P3] D** <!-- id:00000003 -->').priority).toBe('low');
  });

  it('strips [P2] from the title (parsed-and-stripped)', () => {
    expect(firstTask('- [ ] **[P2] Title** <!-- id:00000004 -->').title).toBe('Title');
  });

  it('normalises day variants to the canonical 3-letter abbreviation', () => {
    expect(firstTask('- [ ] **[Monday] A** <!-- id:00000005 -->').day).toBe('Mon');
    expect(firstTask('- [ ] **[tuesday] B** <!-- id:00000006 -->').day).toBe('Tue');
    expect(firstTask('- [ ] **[Thur] C** <!-- id:00000007 -->').day).toBe('Thu');
    expect(firstTask('- [ ] **[Sun] D** <!-- id:00000008 -->').day).toBe('Sun');
  });

  it('parses [pom:N] as a non-negative integer', () => {
    expect(firstTask('- [ ] **[pom:0] A** <!-- id:00000009 -->').pomodoros).toBe(0);
    expect(firstTask('- [ ] **[pom:7] B** <!-- id:0000000a -->').pomodoros).toBe(7);
  });

  it('preserves inner whitespace in [project:Name]', () => {
    expect(firstTask('- [ ] **[project:Hello World] A** <!-- id:0000000b -->').project).toBe(
      'Hello World',
    );
  });

  it('accepts tokens in any order on read', () => {
    const t = firstTask('- [ ] **[Mon] [pom:3] [project:Foo] [P0] Title** <!-- id:0000000c -->');
    expect(t).toMatchObject({
      title: 'Title',
      priority: 'blocker',
      project: 'Foo',
      day: 'Mon',
      pomodoros: 3,
    });
  });

  it('keeps the first match when a token kind repeats', () => {
    const t = firstTask('- [ ] **[P1] [P3] Title** <!-- id:0000000d -->');
    expect(t.priority).toBe('high');
    expect(t.title).toBe('[P3] Title');
  });
});

describe('parseTasks — task body', () => {
  it('extracts the trailing id comment and leaves the title clean', () => {
    const v = parseTasks('## Active\n- [ ] **Title** <!-- id:abc12345 -->\n');
    expect(v.sections[0]?.tasks[0]).toMatchObject({ id: 'abc12345', title: 'Title' });
  });

  it('parses the note after the bold span with or without the leading dash', () => {
    const withDash = parseTasks('## Active\n- [ ] **Title** - the note <!-- id:00000010 -->\n');
    expect(withDash.sections[0]?.tasks[0]?.note).toBe('the note');

    const noDash = parseTasks('## Active\n- [ ] **Title** the note <!-- id:00000011 -->\n');
    expect(noDash.sections[0]?.tasks[0]?.note).toBe('the note');
  });

  it('treats unbolded titles as the entire line', () => {
    const v = parseTasks('## Active\n- [ ] plain title <!-- id:00000012 -->\n');
    expect(v.sections[0]?.tasks[0]).toMatchObject({ title: 'plain title', note: '' });
  });

  it('parses both [x] and [X] as checked', () => {
    const x = parseTasks('## Active\n- [x] **A** <!-- id:00000013 -->\n');
    const big = parseTasks('## Active\n- [X] **B** <!-- id:00000014 -->\n');
    expect(x.sections[0]?.tasks[0]?.checked).toBe(true);
    expect(big.sections[0]?.tasks[0]?.checked).toBe(true);
  });

  it('returns an empty id when the trailing comment is absent', () => {
    const v = parseTasks('## Active\n- [ ] **Title**\n');
    expect(v.sections[0]?.tasks[0]?.id).toBe('');
  });
});

describe('parseTasks — subtasks', () => {
  it('attaches indented checkbox lines to the most recent task', () => {
    const input =
      '## Active\n' +
      '- [ ] **Parent** <!-- id:00000020 -->\n' +
      '  - [ ] Open\n' +
      '  - [x] Done\n';
    const v = parseTasks(input);
    expect(v.sections[0]?.tasks[0]?.subtasks).toEqual([
      { text: 'Open', checked: false },
      { text: 'Done', checked: true },
    ]);
  });

  it('accepts tab and 4-space indentation', () => {
    const input =
      '## Active\n' +
      '- [ ] **Parent** <!-- id:00000021 -->\n' +
      '\t- [ ] tab indent\n' +
      '    - [x] four spaces\n';
    const v = parseTasks(input);
    expect(v.sections[0]?.tasks[0]?.subtasks).toEqual([
      { text: 'tab indent', checked: false },
      { text: 'four spaces', checked: true },
    ]);
  });

  it('ignores subtask-shaped lines when there is no current task', () => {
    const v = parseTasks('## Active\n  - [ ] orphan subtask\n');
    expect(v.sections[0]?.tasks).toHaveLength(0);
  });
});

describe('parseTasks — prelude', () => {
  it('captures content before the first H2 verbatim, trimmed of trailing blanks', () => {
    const v = parseTasks('# Tasks\n\nA description.\n\n## Active\n');
    expect(v.prelude).toBe('# Tasks\n\nA description.');
  });

  it('is empty when the file starts with H2', () => {
    expect(parseTasks('## Active\n').prelude).toBe('');
  });

  it('is empty for an empty input', () => {
    expect(parseTasks('').prelude).toBe('');
  });
});

describe('parseTasks — line endings', () => {
  it('normalises CRLF on read', () => {
    const input = '## Active\r\n- [ ] **Title** <!-- id:00000030 -->\r\n';
    const v = parseTasks(input);
    expect(v.sections[0]?.tasks[0]?.title).toBe('Title');
  });
});
