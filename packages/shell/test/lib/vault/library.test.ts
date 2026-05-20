import { InMemoryAdapter } from '@markdown-board/core';
import type { LibraryDoc } from '@markdown-board/core';
import { describe, expect, it } from 'vitest';

import { saveLibraryFile } from '../../../src/lib/vault/library.js';

describe('saveLibraryFile', () => {
  it('writes the file and replaces the existing LibraryDoc in place', async () => {
    const adapter = new InMemoryAdapter({
      'library/alpha.md': '# Alpha\n\nold',
    });
    const docs: LibraryDoc[] = [
      {
        title: 'Alpha',
        fields: {},
        sections: {},
        tables: [],
        rawContent: '# Alpha\n\nold',
        path: 'library/alpha.md',
      },
    ];

    const doc = await saveLibraryFile(adapter, docs, 'library/alpha.md', '# Alpha\n\nnew body');

    expect(await adapter.readFile('library/alpha.md')).toBe('# Alpha\n\nnew body');
    expect(doc.path).toBe('library/alpha.md');
    expect(docs).toHaveLength(1);
    expect(docs[0]?.rawContent).toBe('# Alpha\n\nnew body');
  });

  it('appends a new LibraryDoc when the path is not yet in docs', async () => {
    const adapter = new InMemoryAdapter({});
    const docs: LibraryDoc[] = [];

    const doc = await saveLibraryFile(adapter, docs, 'library/notes/fresh.md', '# Fresh\n\nbody');

    expect(await adapter.readFile('library/notes/fresh.md')).toBe('# Fresh\n\nbody');
    expect(docs).toHaveLength(1);
    expect(docs[0]?.path).toBe('library/notes/fresh.md');
    expect(doc.title).toBe('Fresh');
  });

  it('preserves array order when replacing — does not move the doc to the end', async () => {
    const adapter = new InMemoryAdapter({
      'library/a.md': '# A\n',
      'library/b.md': '# B\n',
      'library/c.md': '# C\n',
    });
    const docs: LibraryDoc[] = [
      {
        title: 'A',
        fields: {},
        sections: {},
        tables: [],
        rawContent: '# A\n',
        path: 'library/a.md',
      },
      {
        title: 'B',
        fields: {},
        sections: {},
        tables: [],
        rawContent: '# B\n',
        path: 'library/b.md',
      },
      {
        title: 'C',
        fields: {},
        sections: {},
        tables: [],
        rawContent: '# C\n',
        path: 'library/c.md',
      },
    ];

    await saveLibraryFile(adapter, docs, 'library/b.md', '# B\n\nedited');

    expect(docs.map((d) => d.path)).toEqual(['library/a.md', 'library/b.md', 'library/c.md']);
    expect(docs[1]?.rawContent).toBe('# B\n\nedited');
  });
});
