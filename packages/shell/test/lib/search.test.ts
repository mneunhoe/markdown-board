import type { LibraryDoc, Task, Vault } from '@markdown-board/core';
import { describe, expect, it } from 'vitest';

import { buildSearchDocs, createSearchIndex, runSearch } from '../../src/lib/search.js';

function task(id: string, title: string, extra: Partial<Task> = {}): Task {
  return {
    id,
    checked: false,
    title,
    note: '',
    resolution: '',
    priority: null,
    project: null,
    day: null,
    pomodoros: 0,
    subtasks: [],
    ...extra,
  };
}

function libDoc(title: string, path: string, rawContent: string): LibraryDoc {
  return { title, fields: {}, sections: {}, tables: [], rawContent, path };
}

const vault: Vault = {
  prelude: '',
  sections: [
    {
      id: 'active',
      name: 'Active',
      tasks: [
        task('t1', 'Wire the desktop shell', { note: 'Tauri plumbing', project: 'PSD_GAN' }),
        task('t2', 'Refine dark palette', {
          subtasks: [{ text: 'tune contrast', checked: false }],
        }),
      ],
    },
  ],
};
const docs: LibraryDoc[] = [
  libDoc('Alpha Project', 'library/alpha.md', '# Alpha\nlogo guidelines'),
];

function index() {
  return createSearchIndex(buildSearchDocs(vault, docs));
}

describe('buildSearchDocs', () => {
  it('flattens tasks and library docs', () => {
    const built = buildSearchDocs(vault, docs);
    expect(built).toHaveLength(3);
    const t1 = built.find((d) => d.id === 'task:active:t1')!;
    expect(t1.type).toBe('task');
    expect(t1.taskId).toBe('t1');
    expect(t1.sectionId).toBe('active');
    expect(t1.body).toContain('Tauri plumbing');
    const lib = built.find((d) => d.type === 'library')!;
    expect(lib.path).toBe('library/alpha.md');
  });
});

describe('runSearch', () => {
  it('returns nothing for an empty query', () => {
    expect(runSearch(index(), '   ')).toEqual([]);
  });

  it('matches a task title and exposes jump fields', () => {
    const results = runSearch(index(), 'desktop');
    const hit = results.find((r) => r.title === 'Wire the desktop shell')!;
    expect(hit.type).toBe('task');
    expect(hit.taskId).toBe('t1');
    expect(hit.sectionId).toBe('active');
  });

  it('matches a task body (note / subtasks)', () => {
    expect(runSearch(index(), 'contrast').some((r) => r.title === 'Refine dark palette')).toBe(
      true,
    );
    expect(runSearch(index(), 'plumbing').some((r) => r.taskId === 't1')).toBe(true);
  });

  it('matches by project', () => {
    expect(runSearch(index(), 'PSD_GAN').some((r) => r.taskId === 't1')).toBe(true);
  });

  it('matches a library doc and exposes its path', () => {
    const hit = runSearch(index(), 'logo').find((r) => r.type === 'library');
    expect(hit?.path).toBe('library/alpha.md');
  });

  it('builds a snippet for body matches', () => {
    const hit = runSearch(index(), 'plumbing').find((r) => r.taskId === 't1');
    expect(hit?.snippet).toContain('plumbing');
  });

  it('searches a 500-task vault in under 50ms', () => {
    const big: Vault = {
      prelude: '',
      sections: [
        {
          id: 'active',
          name: 'Active',
          tasks: Array.from({ length: 500 }, (_, i) =>
            task(`t${i}`, `Task number ${i}`, { note: `body keyword${i % 7} detail` }),
          ),
        },
      ],
    };
    const idx = createSearchIndex(buildSearchDocs(big, []));
    const start = performance.now();
    const results = runSearch(idx, 'keyword3');
    const elapsed = performance.now() - start;
    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50);
  });
});
