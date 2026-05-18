import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { migrateLegacyH3Buckets } from '../../src/grammar/migrate.js';
import { parseTasks, toMarkdown } from '../../src/grammar/tasks.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

describe('migrateLegacyH3Buckets — basic rewrite', () => {
  it('removes the H3 line and tags every task underneath', () => {
    const input = `## Active
### Foo
- [ ] **One**
- [ ] **Two**
`;
    const result = migrateLegacyH3Buckets(input);
    expect(result.content).toBe(`## Active
- [ ] **[project:Foo] One**
- [ ] **[project:Foo] Two**
`);
    expect(result.h3RemovedCount).toBe(1);
    expect(result.taskTaggedCount).toBe(2);
  });

  it('tracks multiple H3 buckets independently within a section', () => {
    const input = `## Active
### Foo
- [ ] **A**
### Bar
- [ ] **B**
- [ ] **C**
`;
    const result = migrateLegacyH3Buckets(input);
    expect(result.content).toBe(`## Active
- [ ] **[project:Foo] A**
- [ ] **[project:Bar] B**
- [ ] **[project:Bar] C**
`);
    expect(result.h3RemovedCount).toBe(2);
    expect(result.taskTaggedCount).toBe(3);
  });

  it('resets the active project at each H2 boundary', () => {
    const input = `## Active
### Foo
- [ ] **A**
## Done
- [x] **B**
`;
    const result = migrateLegacyH3Buckets(input);
    expect(result.content).toBe(`## Active
- [ ] **[project:Foo] A**
## Done
- [x] **B**
`);
  });

  it('leaves untagged tasks above the first H3 untouched (§3.13 pattern)', () => {
    const input = `## Active
- [ ] **Untagged**
### Foo
- [ ] **Tagged**
`;
    const result = migrateLegacyH3Buckets(input);
    expect(result.content).toBe(`## Active
- [ ] **Untagged**
- [ ] **[project:Foo] Tagged**
`);
    expect(result.taskTaggedCount).toBe(1);
  });

  it('strips the bold wrap on H3 and preserves the full captured project name', () => {
    const input = `## Active
### **PSD_GAN — production runs**
- [ ] **A**
`;
    const result = migrateLegacyH3Buckets(input);
    expect(result.content).toBe(`## Active
- [ ] **[project:PSD_GAN — production runs] A**
`);
  });
});

describe('migrateLegacyH3Buckets — token interaction', () => {
  it('skips tasks that already carry a [project:Name] token (existing token wins)', () => {
    const input = `## Active
### Foo
- [ ] **[project:Bar] A**
`;
    const result = migrateLegacyH3Buckets(input);
    expect(result.content).toBe(`## Active
- [ ] **[project:Bar] A**
`);
    expect(result.h3RemovedCount).toBe(1);
    expect(result.taskTaggedCount).toBe(0);
  });

  it('inserts the token inside the bold span when other tokens precede the title', () => {
    const input = `## Active
### Foo
- [ ] **[P1] [Mon] Title**
`;
    const result = migrateLegacyH3Buckets(input);
    expect(result.content).toBe(`## Active
- [ ] **[project:Foo] [P1] [Mon] Title**
`);
  });

  it('inserts the token before the title when the task has no bold wrap', () => {
    const input = `## Active
### Foo
- [ ] plain title
`;
    const result = migrateLegacyH3Buckets(input);
    expect(result.content).toBe(`## Active
- [ ] [project:Foo] plain title
`);
  });

  it('does not tag subtasks underneath a tagged parent', () => {
    const input = `## Active
### Foo
- [ ] **Parent**
  - [ ] open sub
  - [x] done sub
`;
    const result = migrateLegacyH3Buckets(input);
    expect(result.content).toBe(`## Active
- [ ] **[project:Foo] Parent**
  - [ ] open sub
  - [x] done sub
`);
    expect(result.taskTaggedCount).toBe(1);
  });
});

describe('migrateLegacyH3Buckets — edge cases', () => {
  it('preserves blank lines and free prose verbatim', () => {
    const input = `# Tasks

A description.

## Active

### Foo

- [ ] **A**
`;
    const result = migrateLegacyH3Buckets(input);
    expect(result.content).toBe(`# Tasks

A description.

## Active


- [ ] **[project:Foo] A**
`);
  });

  it('preserves an H3 that appears outside any H2 (no project bucket to migrate)', () => {
    const input = `### Stray
## Active
### Foo
- [ ] **A**
`;
    const result = migrateLegacyH3Buckets(input);
    expect(result.content).toBe(`### Stray
## Active
- [ ] **[project:Foo] A**
`);
    expect(result.h3RemovedCount).toBe(1);
  });

  it('drops an empty H3 (no tasks underneath) and tags nothing', () => {
    const input = `## Active
### Empty
## Done
- [x] **A**
`;
    const result = migrateLegacyH3Buckets(input);
    expect(result.content).toBe(`## Active
## Done
- [x] **A**
`);
    expect(result.h3RemovedCount).toBe(1);
    expect(result.taskTaggedCount).toBe(0);
  });

  it('is idempotent: a second run on already-migrated content is a no-op', () => {
    const legacy = `## Active
### Foo
- [ ] **A**
`;
    const first = migrateLegacyH3Buckets(legacy);
    const second = migrateLegacyH3Buckets(first.content);
    expect(second.content).toBe(first.content);
    expect(second.h3RemovedCount).toBe(0);
    expect(second.taskTaggedCount).toBe(0);
  });

  it('normalises CRLF on input; output is LF-only', () => {
    const input = '## Active\r\n### Foo\r\n- [ ] **A**\r\n';
    const result = migrateLegacyH3Buckets(input);
    expect(result.content).toBe('## Active\n- [ ] **[project:Foo] A**\n');
  });

  it('reports zero counts for input with no H3 buckets', () => {
    const input = `## Active
- [ ] **A**
`;
    const result = migrateLegacyH3Buckets(input);
    expect(result).toEqual({
      content: `## Active
- [ ] **A**
`,
      h3RemovedCount: 0,
      taskTaggedCount: 0,
    });
  });
});

describe('migrateLegacyH3Buckets — integration with parseTasks / toMarkdown', () => {
  it('produces output that parses to the right project assignments', () => {
    const input = `## Active
### Foo
- [ ] **A**
### Bar
- [ ] **[P1] B**
`;
    const migrated = migrateLegacyH3Buckets(input).content;
    const vault = parseTasks(migrated);
    expect(vault.sections[0]?.tasks.map((t) => ({ title: t.title, project: t.project }))).toEqual([
      { title: 'A', project: 'Foo' },
      { title: 'B', project: 'Bar' },
    ]);
  });

  it('round-trips byte-stable on the second trip after migration', () => {
    const legacy = `## Active
### Foo
- [ ] **[P1] A** <!-- id:00001111 -->
`;
    const migrated = migrateLegacyH3Buckets(legacy).content;
    const first = toMarkdown(parseTasks(migrated));
    const second = toMarkdown(parseTasks(first));
    expect(second).toBe(first);
  });

  // Golden-file: full `claude_life/TASKS.md` migration. The raw fixture uses
  // the legacy H3-bucket pattern that §15.1 / Q1 removes from v1; the
  // helper rewrites every bucket inline. Two snapshots:
  //
  // - `legacy-tasks.migrated.md` locks the immediate text-level output of
  //   the migration helper. Reviewers see exactly which lines were dropped
  //   and which tokens were injected.
  // - `legacy-tasks.migrated.canonical.md` locks the post-parse-and-emit
  //   form (i.e. what the file looks like after the v1 grammar's
  //   canonicalisation runs on top — token order normalised to
  //   `[P*] [project:Name] [Day] [pom:N]`, spacing normalised, etc.).
  //
  // Together they bracket the migration contract: legacy →
  // helper output → canonical v1 form, every step diffable on PR.
  describe('claude_life/TASKS.md golden file', () => {
    const legacyRaw = readFileSync(join(fixturesDir, 'legacy-tasks.md'), 'utf8');

    it('migration output matches the locked migrated fixture', async () => {
      const { content } = migrateLegacyH3Buckets(legacyRaw);
      await expect(content).toMatchFileSnapshot(join(fixturesDir, 'legacy-tasks.migrated.md'));
    });

    it('migrated output parses + emits to the locked canonical fixture', async () => {
      const { content } = migrateLegacyH3Buckets(legacyRaw);
      const canonical = toMarkdown(parseTasks(content));
      await expect(canonical).toMatchFileSnapshot(
        join(fixturesDir, 'legacy-tasks.migrated.canonical.md'),
      );
    });

    it('migrated canonical output is byte-stable on every subsequent trip', () => {
      const { content } = migrateLegacyH3Buckets(legacyRaw);
      const first = toMarkdown(parseTasks(content));
      const second = toMarkdown(parseTasks(first));
      expect(second).toBe(first);
    });

    it('every task in the migrated vault carries a project assignment', () => {
      const { content } = migrateLegacyH3Buckets(legacyRaw);
      const vault = parseTasks(content);
      const tasks = vault.sections.flatMap((s) => s.tasks);
      const withoutProject = tasks.filter((t) => t.project === null);
      expect(withoutProject).toEqual([]);
    });
  });
});
