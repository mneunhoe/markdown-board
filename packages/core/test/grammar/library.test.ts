import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseLibrary } from '../../src/grammar/library.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

describe('parseLibrary — title (§7.2)', () => {
  it('captures the H1 as title', () => {
    const doc = parseLibrary(`# Foo\n\nbody\n`);
    expect(doc.title).toBe('Foo');
  });

  it("returns title='' when no H1 is present", () => {
    const doc = parseLibrary(`## Section\n\nbody\n`);
    expect(doc.title).toBe('');
  });

  it('keeps the last H1 when multiple are present', () => {
    const doc = parseLibrary(`# First\n\n# Second\n`);
    expect(doc.title).toBe('Second');
  });

  it('trims surrounding whitespace from the title', () => {
    const doc = parseLibrary(`#   Trimmed   \n`);
    expect(doc.title).toBe('Trimmed');
  });

  it('does not push the H1 into _intro', () => {
    const doc = parseLibrary(`# T\n\nintro line\n`);
    expect(doc.sections._intro).toBe('intro line');
  });
});

describe('parseLibrary — sections & _intro (§7.2, §7.3)', () => {
  it('captures content before the first H2 under _intro', () => {
    const doc = parseLibrary(`intro a\nintro b\n\n## After\nbody\n`);
    expect(doc.sections._intro).toBe('intro a\nintro b');
    expect(doc.sections.After).toBe('body');
  });

  it('initialises _intro as empty string when the file opens with H2', () => {
    const doc = parseLibrary(`## Only\nbody\n`);
    expect(doc.sections._intro).toBe('');
  });

  it('captures one section per distinct H2', () => {
    const doc = parseLibrary(`## A\na\n## B\nb\n`);
    expect(doc.sections.A).toBe('a');
    expect(doc.sections.B).toBe('b');
  });

  it('trims surrounding whitespace from each section body', () => {
    const doc = parseLibrary(`## A\n\n  spaced  \n\n`);
    expect(doc.sections.A).toBe('spaced');
  });

  it('preserves blank lines inside a section body', () => {
    const doc = parseLibrary(`## A\nline 1\n\nline 2\n`);
    expect(doc.sections.A).toBe('line 1\n\nline 2');
  });

  it('preserves an empty section (no body lines)', () => {
    const doc = parseLibrary(`## Empty\n## After\nbody\n`);
    expect(doc.sections.Empty).toBe('');
    expect(doc.sections.After).toBe('body');
  });

  it('matches the prototype: duplicate H2 resets the section body', () => {
    const doc = parseLibrary(`## Dup\nfirst\n## Dup\nsecond\n`);
    expect(doc.sections.Dup).toBe('second');
  });

  it('does not treat H3 / H4 lines as section boundaries', () => {
    const doc = parseLibrary(`## Outer\n### Inner\nbody\n#### Deeper\n`);
    expect(doc.sections.Outer).toBe('### Inner\nbody\n#### Deeper');
    expect(Object.keys(doc.sections)).not.toContain('Inner');
  });

  it('does not bold-strip H2 names (§7.5)', () => {
    const doc = parseLibrary(`## **Bold**\nbody\n`);
    expect(doc.sections['**Bold**']).toBe('body');
  });
});

describe('parseLibrary — column-0 fields (§7.2)', () => {
  it('parses `**Key:** value` at column 0', () => {
    const doc = parseLibrary(`**Role:** Researcher\n`);
    expect(doc.fields).toEqual({ Role: 'Researcher' });
  });

  it('parses multiple column-0 fields in order', () => {
    const doc = parseLibrary(`**A:** 1\n**B:** 2\n`);
    expect(doc.fields).toEqual({ A: '1', B: '2' });
  });

  it('parses fields that appear inside a section (not just in _intro)', () => {
    const doc = parseLibrary(`## Identity\n**Name:** Foo\n`);
    expect(doc.fields).toEqual({ Name: 'Foo' });
  });

  it('lifts fields out of the section body (does not duplicate them)', () => {
    const doc = parseLibrary(`## S\n**K:** v\nfree prose\n`);
    expect(doc.sections.S).toBe('free prose');
    expect(doc.fields).toEqual({ K: 'v' });
  });

  it('keeps the last value when a key repeats', () => {
    const doc = parseLibrary(`**K:** one\n**K:** two\n`);
    expect(doc.fields).toEqual({ K: 'two' });
  });

  it('accepts an empty value after the colon', () => {
    const doc = parseLibrary(`**K:**\n`);
    expect(doc.fields).toEqual({ K: '' });
  });

  it('does not parse fields that are merely bolded prose (no colon)', () => {
    const doc = parseLibrary(`**Just bold**\n`);
    expect(doc.fields).toEqual({});
    expect(doc.sections._intro).toBe('**Just bold**');
  });
});

describe('parseLibrary — list-form fields (§15.1 / Q17)', () => {
  it('parses `- **Key:** value` inside a top-level list item', () => {
    const doc = parseLibrary(`- **Working title:** *Method or Implementation?*\n`);
    expect(doc.fields).toEqual({
      'Working title': '*Method or Implementation?*',
    });
  });

  it('parses list-form fields inside an H2 section', () => {
    const doc = parseLibrary(`## Identity\n- **Authors:** Marcel, Jörg\n`);
    expect(doc.fields).toEqual({ Authors: 'Marcel, Jörg' });
  });

  it('does not parse nested-list `- **Key:** value` (>0 leading whitespace)', () => {
    const doc = parseLibrary(`- top\n  - **Inner:** v\n`);
    expect(doc.fields).toEqual({});
  });

  it('does not parse blockquoted `> - **Key:** value`', () => {
    const doc = parseLibrary(`> - **Inner:** v\n`);
    expect(doc.fields).toEqual({});
  });

  it('lifts list-form fields out of the section body', () => {
    const doc = parseLibrary(`## S\n- **K:** v\nprose\n`);
    expect(doc.sections.S).toBe('prose');
    expect(doc.fields).toEqual({ K: 'v' });
  });

  it('treats `* **Key:** value` like `- **Key:** value` (top-level bullet)', () => {
    const doc = parseLibrary(`- **K:** v\n`);
    expect(doc.fields).toEqual({ K: 'v' });
  });
});

describe('parseLibrary — tables (§7.4, §15.1 / Q18)', () => {
  it('extracts a single GFM-style pipe table', () => {
    const doc = parseLibrary(`## S\n| H1 | H2 |\n|---|---|\n| a | b |\n`);
    expect(doc.tables).toHaveLength(1);
    expect(doc.tables[0]).toEqual({
      headers: ['H1', 'H2'],
      rows: [['a', 'b']],
    });
  });

  it('preserves empty middle cells (Q18 fix vs prototype)', () => {
    const doc = parseLibrary(`| A | B | C |\n|---|---|---|\n| 1 |  | 3 |\n`);
    expect(doc.tables[0]!.rows[0]).toEqual(['1', '', '3']);
  });

  it('preserves empty trailing cells', () => {
    const doc = parseLibrary(`| A | B |\n|---|---|\n| x |  |\n`);
    expect(doc.tables[0]!.rows[0]).toEqual(['x', '']);
  });

  it('extracts multiple tables from the same document', () => {
    const doc = parseLibrary(`| A |\n|---|\n| 1 |\n\nprose\n\n| B |\n|---|\n| 2 |\n`);
    expect(doc.tables).toHaveLength(2);
    expect(doc.tables[0]!.headers).toEqual(['A']);
    expect(doc.tables[1]!.headers).toEqual(['B']);
  });

  it('accepts colon-aligned separator rows (GFM)', () => {
    const doc = parseLibrary(`| A | B |\n|:--|--:|\n| 1 | 2 |\n`);
    expect(doc.tables).toHaveLength(1);
    expect(doc.tables[0]!.rows[0]).toEqual(['1', '2']);
  });

  it('ignores a header+separator pair with no body rows', () => {
    const doc = parseLibrary(`| A | B |\n|---|---|\n`);
    expect(doc.tables).toEqual([]);
  });

  it('still leaves table lines inside the section body (§7.4)', () => {
    const doc = parseLibrary(`## S\n| A |\n|---|\n| x |\n`);
    expect(doc.sections.S).toBe(`| A |\n|---|\n| x |`);
    expect(doc.tables).toHaveLength(1);
  });
});

describe('parseLibrary — rawContent & line endings (§15.1 / Q4)', () => {
  it('echoes the input back via rawContent for LF-only input', () => {
    const input = `# T\n\n## S\nbody\n`;
    expect(parseLibrary(input).rawContent).toBe(input);
  });

  it('normalises CRLF to LF in rawContent and on the section body', () => {
    const doc = parseLibrary(`## S\r\nline 1\r\nline 2\r\n`);
    expect(doc.rawContent).toBe(`## S\nline 1\nline 2\n`);
    expect(doc.sections.S).toBe('line 1\nline 2');
  });
});

describe('parseLibrary — golden file (claude_life/memory/projects/psd-gan.md)', () => {
  it('matches the locked parsed shape', async () => {
    const input = readFileSync(join(fixturesDir, 'library-psd-gan.md'), 'utf8');
    const doc = parseLibrary(input);

    expect(doc.rawContent).toBe(input);

    const snapshot = {
      title: doc.title,
      fields: doc.fields,
      sections: doc.sections,
      tables: doc.tables,
    };
    await expect(JSON.stringify(snapshot, null, 2)).toMatchFileSnapshot(
      join(fixturesDir, 'library-psd-gan.parsed.json'),
    );
  });
});
