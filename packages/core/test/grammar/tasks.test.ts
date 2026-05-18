import { describe, expect, it } from 'vitest';
import { parseTasks } from '../../src/grammar/tasks.js';
import type { Vault } from '../../src/grammar/types.js';

// First failing test driving the §15.1 locked grammar contract:
// one section, one fully-tokenised task with an existing id.
// Covers H2 → section slug, bold-title extraction, all four token kinds
// in canonical order, note suffix, and `<!-- id:xxx -->` round-trip.
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
