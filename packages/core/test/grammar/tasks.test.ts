import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseTasks, toMarkdown } from '../../src/grammar/tasks.js';
import type { Task, Vault } from '../../src/grammar/types.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

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

describe('toMarkdown — canonical §15.1 example', () => {
  it('round-trips the fully-tokenised task byte-stable on first trip', () => {
    const input =
      '## Active\n' +
      '- [ ] **[P0] [project:Foo] [Mon] [pom:3] Title** - the note <!-- id:a3f8c4e1 -->\n';
    expect(toMarkdown(parseTasks(input))).toBe(input);
  });
});

describe('toMarkdown — token canonical order', () => {
  it('emits tokens in [P*] [project:Name] [Day] [pom:N] order regardless of input order', () => {
    const shuffled =
      '## Active\n' + '- [ ] **[Mon] [pom:3] [project:Foo] [P0] Title** <!-- id:0000aaaa -->\n';
    const expected =
      '## Active\n' + '- [ ] **[P0] [project:Foo] [Mon] [pom:3] Title** <!-- id:0000aaaa -->\n';
    expect(toMarkdown(parseTasks(shuffled))).toBe(expected);
  });

  it('emits each priority tier with the right token', () => {
    const cases: Array<[Task['priority'], string]> = [
      ['blocker', '[P0]'],
      ['high', '[P1]'],
      ['low', '[P3]'],
    ];
    for (const [priority, token] of cases) {
      const v: Vault = {
        prelude: '',
        sections: [
          {
            id: 'active',
            name: 'Active',
            tasks: [
              {
                id: 'deadbeef',
                checked: false,
                title: 'T',
                note: '',
                priority,
                project: null,
                day: null,
                pomodoros: 0,
                subtasks: [],
              },
            ],
          },
        ],
      };
      expect(toMarkdown(v)).toBe(`## Active\n- [ ] **${token} T** <!-- id:deadbeef -->\n`);
    }
  });

  it('omits the priority token entirely when priority is null ([P2] is parsed-and-stripped)', () => {
    const input = '## Active\n- [ ] **[P2] Title** <!-- id:0000bbbb -->\n';
    const expected = '## Active\n- [ ] **Title** <!-- id:0000bbbb -->\n';
    expect(toMarkdown(parseTasks(input))).toBe(expected);
  });

  it('omits [pom:0] on emit', () => {
    const input = '## Active\n- [ ] **[pom:0] Title** <!-- id:0000cccc -->\n';
    const expected = '## Active\n- [ ] **Title** <!-- id:0000cccc -->\n';
    expect(toMarkdown(parseTasks(input))).toBe(expected);
  });

  it('normalises day tokens to the canonical 3-letter abbreviation', () => {
    const input = '## Active\n- [ ] **[Monday] Title** <!-- id:0000dddd -->\n';
    const expected = '## Active\n- [ ] **[Mon] Title** <!-- id:0000dddd -->\n';
    expect(toMarkdown(parseTasks(input))).toBe(expected);
  });

  it('preserves inner whitespace in [project:Name]', () => {
    const input = '## Active\n- [ ] **[project:Hello World] Title** <!-- id:0000eeee -->\n';
    expect(toMarkdown(parseTasks(input))).toBe(input);
  });
});

describe('toMarkdown — task body', () => {
  it('uses lowercase [x] for done tasks', () => {
    const input = '## Active\n- [X] **Title** <!-- id:0000f001 -->\n';
    const expected = '## Active\n- [x] **Title** <!-- id:0000f001 -->\n';
    expect(toMarkdown(parseTasks(input))).toBe(expected);
  });

  it('adds the bold wrap when the input was a plain title', () => {
    const input = '## Active\n- [ ] plain title <!-- id:0000f002 -->\n';
    const expected = '## Active\n- [ ] **plain title** <!-- id:0000f002 -->\n';
    expect(toMarkdown(parseTasks(input))).toBe(expected);
  });

  it('emits the note with a leading " - " separator', () => {
    const v: Vault = {
      prelude: '',
      sections: [
        {
          id: 'active',
          name: 'Active',
          tasks: [
            {
              id: '0000f003',
              checked: false,
              title: 'Title',
              note: 'the note',
              priority: null,
              project: null,
              day: null,
              pomodoros: 0,
              subtasks: [],
            },
          ],
        },
      ],
    };
    expect(toMarkdown(v)).toBe('## Active\n- [ ] **Title** - the note <!-- id:0000f003 -->\n');
  });

  it('omits the trailing id comment when task.id is empty', () => {
    const input = '## Active\n- [ ] **Title**\n';
    expect(toMarkdown(parseTasks(input))).toBe(input);
  });

  it('emits subtasks with two-space indentation immediately under the parent', () => {
    const input =
      '## Active\n' +
      '- [ ] **Parent** <!-- id:0000f004 -->\n' +
      '  - [ ] open sub\n' +
      '  - [x] done sub\n';
    expect(toMarkdown(parseTasks(input))).toBe(input);
  });
});

describe('toMarkdown — section spacing', () => {
  it('separates sections with exactly one blank line and no leading/trailing blanks', () => {
    const input =
      '## Active\n' +
      '- [ ] **A** <!-- id:0000aa01 -->\n' +
      '## Done\n' +
      '- [x] **B** <!-- id:0000aa02 -->\n';
    const expected =
      '## Active\n' +
      '- [ ] **A** <!-- id:0000aa01 -->\n' +
      '\n' +
      '## Done\n' +
      '- [x] **B** <!-- id:0000aa02 -->\n';
    expect(toMarkdown(parseTasks(input))).toBe(expected);
  });

  it('preserves empty sections', () => {
    const input = '## Active\n## Done\n';
    const expected = '## Active\n\n## Done\n';
    expect(toMarkdown(parseTasks(input))).toBe(expected);
  });

  it('strips the bold wrap on H2 names (first-trip normalisation)', () => {
    const input = '## **Active**\n- [ ] **T** <!-- id:0000aa03 -->\n';
    const expected = '## Active\n- [ ] **T** <!-- id:0000aa03 -->\n';
    expect(toMarkdown(parseTasks(input))).toBe(expected);
  });
});

describe('toMarkdown — prelude', () => {
  it('emits the prelude verbatim followed by a blank line before the first H2', () => {
    const input = '# Tasks\n\nA description.\n\n## Active\n';
    expect(toMarkdown(parseTasks(input))).toBe(input);
  });

  it('omits any leading content when the prelude is empty', () => {
    const v: Vault = {
      prelude: '',
      sections: [{ id: 'active', name: 'Active', tasks: [] }],
    };
    expect(toMarkdown(v)).toBe('## Active\n');
  });

  it('returns an empty string for an empty vault', () => {
    expect(toMarkdown({ prelude: '', sections: [] })).toBe('');
  });
});

describe('toMarkdown — round-trip invariants (§15.1)', () => {
  it('is byte-stable on the second trip for a non-canonical input', () => {
    const denormalised =
      '## **Active**\r\n' +
      '- [X] **[Mon] [pom:0] [P2] plain title**\r\n' +
      '## Done\r\n' +
      '- [ ] **[pom:3] [project:Foo] [P1] Title** the note <!-- id:0000bb01 -->\r\n';

    const first = toMarkdown(parseTasks(denormalised));
    const second = toMarkdown(parseTasks(first));
    expect(second).toBe(first);
  });

  it('is byte-stable on the first trip for an already-canonical input', () => {
    const canonical =
      '# Tasks\n' +
      '\n' +
      '## Active\n' +
      '- [ ] **[P0] [project:Foo] [Mon] [pom:3] Title** - the note <!-- id:a3f8c4e1 -->\n' +
      '  - [ ] open sub\n' +
      '  - [x] done sub\n' +
      '\n' +
      '## Done\n' +
      '- [x] **[P1] Other** <!-- id:b71e0c4d -->\n';
    expect(toMarkdown(parseTasks(canonical))).toBe(canonical);
  });

  // Golden-file round-trip for the real claude_life/TASKS.md (Phase 1 task 1e).
  // The raw fixture is the unmodified pre-rewrite ledger: it uses the legacy
  // H3-bucket project pattern that §15.1 / Q1 removes from the v1 grammar,
  // so the *first* trip is intentionally lossy — H3 lines are silently
  // dropped and their tasks merge into the parent H2. The H3 → [project:Name]
  // rewrite is a separate consented migration step (plan §6.1) that lives
  // outside the parse/emit cycle.
  //
  // The locked contract here is the byte-stability invariant: whatever the
  // v1 grammar normalises the legacy file *to* on the first trip, every
  // subsequent trip must round-trip that output unchanged. The canonical
  // fixture lets future grammar changes surface as an explicit diff.
  describe('claude_life/TASKS.md golden file', () => {
    const legacyRaw = readFileSync(join(fixturesDir, 'legacy-tasks.md'), 'utf8');

    it('first trip matches the locked canonical fixture', async () => {
      const first = toMarkdown(parseTasks(legacyRaw));
      await expect(first).toMatchFileSnapshot(join(fixturesDir, 'legacy-tasks.canonical.md'));
    });

    it('is byte-stable on the second trip', () => {
      const first = toMarkdown(parseTasks(legacyRaw));
      const second = toMarkdown(parseTasks(first));
      expect(second).toBe(first);
    });
  });
});
