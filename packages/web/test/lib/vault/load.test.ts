import { InMemoryAdapter, type FileAdapter } from '@markdown-board/core';
import { describe, expect, it } from 'vitest';

import { loadVault } from '../../../src/lib/vault/load.js';

describe('loadVault', () => {
  it('returns an empty vault when TASKS.md is missing', async () => {
    const adapter: FileAdapter = new InMemoryAdapter({});
    const { vault, libraryDocs } = await loadVault(adapter);
    expect(vault.prelude).toBe('');
    expect(vault.sections).toEqual([]);
    expect(libraryDocs).toEqual([]);
  });

  it('parses TASKS.md into sections', async () => {
    const adapter = new InMemoryAdapter({
      'TASKS.md': '## Active\n- [ ] Write tests\n\n## Done\n- [x] Set up CI\n',
    });
    const { vault } = await loadVault(adapter);
    expect(vault.sections.map((s) => s.name)).toEqual(['Active', 'Done']);
    expect(vault.sections[0]?.tasks[0]?.title).toBe('Write tests');
    expect(vault.sections[1]?.tasks[0]?.checked).toBe(true);
  });

  it('returns an empty library list when library/ does not exist', async () => {
    const adapter = new InMemoryAdapter({
      'TASKS.md': '## Active\n',
    });
    const { libraryDocs } = await loadVault(adapter);
    expect(libraryDocs).toEqual([]);
  });

  it('parses every .md file under library/', async () => {
    const adapter = new InMemoryAdapter({
      'TASKS.md': '## Active\n',
      'library/alpha.md': '# Alpha\n',
      'library/beta.md': '# Beta\n',
    });
    const { libraryDocs } = await loadVault(adapter);
    expect(libraryDocs.map((d) => d.title)).toEqual(['Alpha', 'Beta']);
  });

  it('walks nested library subdirectories', async () => {
    const adapter = new InMemoryAdapter({
      'library/projects/alpha.md': '# Alpha\n',
      'library/people/bob.md': '# Bob\n',
      'library/glossary.md': '# Glossary\n',
    });
    const { libraryDocs } = await loadVault(adapter);
    // Path-sorted: glossary.md < people/bob.md < projects/alpha.md
    expect(libraryDocs.map((d) => d.title)).toEqual(['Glossary', 'Bob', 'Alpha']);
  });

  it('ignores non-.md files under library/', async () => {
    const adapter = new InMemoryAdapter({
      'library/notes.md': '# Notes\n',
      'library/image.png': 'binary-data',
      'library/draft.txt': 'plain text',
    });
    const { libraryDocs } = await loadVault(adapter);
    expect(libraryDocs.map((d) => d.title)).toEqual(['Notes']);
  });

  it('sorts library docs by path', async () => {
    const adapter = new InMemoryAdapter({
      'library/zebra.md': '# Zebra\n',
      'library/alpha.md': '# Alpha\n',
      'library/mango.md': '# Mango\n',
    });
    const { libraryDocs } = await loadVault(adapter);
    expect(libraryDocs.map((d) => d.title)).toEqual(['Alpha', 'Mango', 'Zebra']);
  });

  it('propagates non-FileNotFound errors from readFile', async () => {
    const failing: FileAdapter = {
      async readFile() {
        throw new Error('boom');
      },
      async writeFile() {},
      async listDir() {
        return [];
      },
      watch() {
        return { dispose() {} };
      },
    };
    await expect(loadVault(failing)).rejects.toThrow('boom');
  });

  it('preserves the rawContent from library files', async () => {
    const adapter = new InMemoryAdapter({
      'library/notes.md': '# Notes\n\nBody copy.\n',
    });
    const { libraryDocs } = await loadVault(adapter);
    expect(libraryDocs[0]?.rawContent).toBe('# Notes\n\nBody copy.\n');
  });
});
