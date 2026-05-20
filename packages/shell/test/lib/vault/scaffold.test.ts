import { InMemoryAdapter } from '@markdown-board/core';
import { describe, expect, it } from 'vitest';

import { loadVault } from '../../../src/lib/vault/load.js';
import { scaffoldVault } from '../../../src/lib/vault/scaffold.js';

describe('scaffoldVault', () => {
  it('writes the starter files into an empty folder', async () => {
    const adapter = new InMemoryAdapter({});
    const { created } = await scaffoldVault(adapter);
    expect(created).toEqual([
      'TASKS.md',
      'DASHBOARD.md',
      'library/glossary.md',
      'library/projects/example-project.md',
      'library/people/example-person.md',
    ]);
  });

  it('produces a vault that loads to a populated board + library', async () => {
    const adapter = new InMemoryAdapter({});
    await scaffoldVault(adapter);

    const { vault, libraryDocs } = await loadVault(adapter);
    expect(vault.sections.map((s) => s.name)).toEqual(['Active', 'Doing', 'Done']);
    expect(vault.sections[0]?.tasks.length).toBeGreaterThan(0);
    expect(libraryDocs.map((d) => d.title).sort()).toEqual([
      'Example Person',
      'Example Project',
      'Glossary',
    ]);
  });

  it('scaffolds cross-linked notes so backlinks resolve', async () => {
    const adapter = new InMemoryAdapter({});
    await scaffoldVault(adapter);
    const project = await adapter.readFile('library/projects/example-project.md');
    const person = await adapter.readFile('library/people/example-person.md');
    expect(project).toContain('[[Example Person]]');
    expect(person).toContain('[[Example Project]]');
  });

  it('never overwrites an existing file (write-if-missing)', async () => {
    const adapter = new InMemoryAdapter({
      'TASKS.md': '## My Stuff\n- [ ] keep me\n',
    });
    const { created } = await scaffoldVault(adapter);

    expect(created).not.toContain('TASKS.md');
    expect(await adapter.readFile('TASKS.md')).toBe('## My Stuff\n- [ ] keep me\n');
    // The missing files are still seeded.
    expect(created).toContain('DASHBOARD.md');
  });

  it('is a no-op when every starter file already exists', async () => {
    const adapter = new InMemoryAdapter({});
    await scaffoldVault(adapter);
    const second = await scaffoldVault(adapter);
    expect(second.created).toEqual([]);
  });
});
