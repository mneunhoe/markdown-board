import { InMemoryAdapter, type FileAdapter } from '@markdown-board/core';
import { describe, expect, it } from 'vitest';

import { loadArchive, loadVault } from '../../../src/lib/vault/load.js';

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

  it('returns archive: null when archive/TASKS.md is missing', async () => {
    const adapter = new InMemoryAdapter({ 'TASKS.md': '## Active\n' });
    const { archive } = await loadVault(adapter);
    expect(archive).toBeNull();
  });

  it('returns archive as a parsed Vault when archive/TASKS.md is present', async () => {
    const adapter = new InMemoryAdapter({
      'TASKS.md': '## Active\n',
      'archive/TASKS.md':
        '# Archived Tasks\n\nResolved tasks moved out of `TASKS.md` by the dashboard.\n\n' +
        '## 2026-05-18 10:43 — Active\n\n' +
        '- [x] **Ship** - done <!-- id:abc12345 -->\n',
    });
    const { archive } = await loadVault(adapter);
    expect(archive).not.toBeNull();
    expect(archive?.sections).toHaveLength(1);
    expect(archive?.sections[0]?.name).toBe('2026-05-18 10:43 — Active');
    expect(archive?.sections[0]?.tasks[0]?.title).toBe('Ship');
    expect(archive?.sections[0]?.tasks[0]?.checked).toBe(true);
  });
});

describe('loadArchive', () => {
  it('returns null when archive/TASKS.md is missing', async () => {
    const adapter = new InMemoryAdapter({ 'TASKS.md': '' });
    expect(await loadArchive(adapter)).toBeNull();
  });

  it('returns a parsed Vault when archive/TASKS.md exists', async () => {
    const adapter = new InMemoryAdapter({
      'archive/TASKS.md':
        '# Archived Tasks\n\n' +
        '## 2026-05-19 09:00 — Doing\n\n' +
        '- [x] **B** <!-- id:bbb -->\n',
    });
    const archive = await loadArchive(adapter);
    expect(archive?.sections.map((s) => s.name)).toEqual(['2026-05-19 09:00 — Doing']);
    expect(archive?.sections[0]?.tasks[0]?.id).toBe('bbb');
  });

  it('returns an empty Vault (not null) when the archive exists but has only a prelude', () => {
    const adapter = new InMemoryAdapter({
      'archive/TASKS.md': '# Archived Tasks\n\nResolved tasks moved out…\n',
    });
    return loadArchive(adapter).then((archive) => {
      expect(archive).not.toBeNull();
      expect(archive?.sections).toEqual([]);
    });
  });
});
