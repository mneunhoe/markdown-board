import type { Task, Vault } from '@markdown-board/core';
import { InMemoryAdapter } from '@markdown-board/core';
import { describe, expect, it } from 'vitest';

import {
  ARCHIVE_PATH,
  appendArchiveEntry,
  findTask,
  removeTask,
} from '../../../src/lib/vault/resolve.js';

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    checked: false,
    title: `Task ${id}`,
    note: '',
    priority: null,
    project: null,
    day: null,
    pomodoros: 0,
    subtasks: [],
    ...overrides,
  };
}

function vault(): Vault {
  return {
    prelude: '',
    sections: [
      {
        id: 'active',
        name: 'Active',
        tasks: [task('a'), task('b', { title: 'Bravo task' })],
      },
      { id: 'done', name: 'Done', tasks: [task('c')] },
    ],
  };
}

describe('findTask', () => {
  it('returns the task and its containing section', () => {
    const v = vault();
    const found = findTask(v, { taskId: 'a', sectionId: 'active' });
    expect(found?.task.id).toBe('a');
    expect(found?.section.name).toBe('Active');
  });

  it('returns null for an unknown section', () => {
    expect(findTask(vault(), { taskId: 'a', sectionId: 'ghost' })).toBeNull();
  });

  it('returns null for an unknown task', () => {
    expect(findTask(vault(), { taskId: 'nope', sectionId: 'active' })).toBeNull();
  });

  it('does not mutate the vault', () => {
    const v = vault();
    findTask(v, { taskId: 'a', sectionId: 'active' });
    expect(v.sections[0]?.tasks.map((t) => t.id)).toEqual(['a', 'b']);
  });
});

describe('removeTask', () => {
  it('removes the task in place', () => {
    const v = vault();
    expect(removeTask(v, { taskId: 'a', sectionId: 'active' })).toBe(true);
    expect(v.sections[0]?.tasks.map((t) => t.id)).toEqual(['b']);
  });

  it('returns false for stale targets', () => {
    const v = vault();
    expect(removeTask(v, { taskId: 'nope', sectionId: 'active' })).toBe(false);
    expect(v.sections[0]?.tasks.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('returns false for unknown sections', () => {
    const v = vault();
    expect(removeTask(v, { taskId: 'a', sectionId: 'ghost' })).toBe(false);
    expect(v.sections[0]?.tasks.map((t) => t.id)).toEqual(['a', 'b']);
  });
});

describe('appendArchiveEntry', () => {
  it('writes a brand-new archive file with the §6.2 header', async () => {
    const adapter = new InMemoryAdapter({});
    const t = task('a', { title: 'Write spec' });
    const section = { id: 'active', name: 'Active', tasks: [t] };
    await appendArchiveEntry(adapter, t, 'Shipped it', section, {
      now: new Date(2026, 0, 15, 14, 30),
    });
    const written = await adapter.readFile(ARCHIVE_PATH);
    expect(written).toMatch(/^# Archived Tasks\n/);
    expect(written).toMatch(/## 2026-01-15 14:30 — Write spec/);
    expect(written).toMatch(/\*\*Resolution:\*\*/);
    expect(written).toContain('Shipped it');
    expect(written).toMatch(/section=Active/);
  });

  it('appends to an existing archive file without re-emitting the header', async () => {
    const adapter = new InMemoryAdapter({
      [ARCHIVE_PATH]: '# Archived Tasks\n\nIntro line.\n',
    });
    const t = task('a', { title: 'Second resolve' });
    await appendArchiveEntry(
      adapter,
      t,
      '',
      { id: 'active', name: 'Active', tasks: [t] },
      {
        now: new Date(2026, 0, 16, 9, 0),
      },
    );
    const written = await adapter.readFile(ARCHIVE_PATH);
    // Header only appears once.
    expect(written.match(/# Archived Tasks/g)).toHaveLength(1);
    expect(written).toMatch(/## 2026-01-16 09:00 — Second resolve/);
    // Empty resolution renders as the *(no resolution note)* sentinel.
    expect(written).toMatch(/\*\(no resolution note\)\*/);
  });

  it('treats missing archive file as empty (lays down the header)', async () => {
    const adapter = new InMemoryAdapter({ 'TASKS.md': '' });
    const t = task('a');
    await appendArchiveEntry(adapter, t, 'done', { id: 's', name: 'S', tasks: [t] });
    const written = await adapter.readFile(ARCHIVE_PATH);
    expect(written).toMatch(/^# Archived Tasks\n/);
  });

  it('includes task metadata (project / priority / day / pomodoros) in the entry', async () => {
    const adapter = new InMemoryAdapter({});
    const t = task('a', {
      title: 'Big one',
      project: 'PSD_GAN',
      priority: 'high',
      day: 'Wed',
      pomodoros: 3,
    });
    await appendArchiveEntry(
      adapter,
      t,
      '',
      { id: 's', name: 'Active', tasks: [t] },
      {
        now: new Date(2026, 4, 19, 10, 0),
      },
    );
    const written = await adapter.readFile(ARCHIVE_PATH);
    expect(written).toMatch(/project=PSD_GAN/);
    expect(written).toMatch(/priority=high/);
    expect(written).toMatch(/day=Wed/);
    expect(written).toMatch(/pomodoros=3/);
  });
});
