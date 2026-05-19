import type { Task, Vault } from '@markdown-board/core';
import { InMemoryAdapter } from '@markdown-board/core';
import { describe, expect, it } from 'vitest';

import {
  ARCHIVE_PATH,
  appendArchiveEntry,
  findTask,
  removeTask,
  unresolveTask,
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
    resolution: '',
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
  it('writes a brand-new archive file with the task-grammar header (slice 6f)', async () => {
    const adapter = new InMemoryAdapter({});
    const t = task('a', { title: 'Write spec' });
    const section = { id: 'active', name: 'Active', tasks: [t] };
    await appendArchiveEntry(adapter, t, 'Shipped it', section, {
      now: new Date(2026, 0, 15, 14, 30),
    });
    const written = await adapter.readFile(ARCHIVE_PATH);
    expect(written).toMatch(/^# Archived Tasks\n/);
    expect(written).toMatch(/## 2026-01-15 14:30 — Active/);
    expect(written).toContain('- [x] **Write spec** - [res: Shipped it]');
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
    expect(written).toMatch(/## 2026-01-16 09:00 — Active/);
    // Empty resolution leaves no note suffix on the task line.
    expect(written).toMatch(/- \[x\] \*\*Second resolve\*\* <!-- id:a -->/);
  });

  it('treats missing archive file as empty (lays down the header)', async () => {
    const adapter = new InMemoryAdapter({ 'TASKS.md': '' });
    const t = task('a');
    await appendArchiveEntry(adapter, t, 'done', { id: 's', name: 'S', tasks: [t] });
    const written = await adapter.readFile(ARCHIVE_PATH);
    expect(written).toMatch(/^# Archived Tasks\n/);
  });

  it('encodes task tokens inline on the - [x] line (slice 6f)', async () => {
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
    expect(written).toContain('- [x] **[P1] [project:PSD_GAN] [Wed] [pom:3] Big one**');
  });
});

describe('unresolveTask (slice 6g-3)', () => {
  const SEED_ARCHIVE =
    '# Archived Tasks\n\nResolved tasks moved out of `TASKS.md` by the dashboard.\n\n' +
    '## 2026-05-18 10:00 — Active\n\n' +
    '- [x] **[P0] Ship release** - shipped <!-- id:abc12345 -->\n' +
    '  - [x] tag the commit\n';

  function activeVault(): Vault {
    return {
      prelude: '',
      sections: [
        { id: 'active', name: 'Active', tasks: [task('x', { title: 'Open thing' })] },
        { id: 'doing', name: 'Doing', tasks: [] },
      ],
    };
  }

  it('returns archive-missing when archive/TASKS.md does not exist', async () => {
    const adapter = new InMemoryAdapter({});
    const result = await unresolveTask(adapter, activeVault(), 'abc12345');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('archive-missing');
  });

  it('returns not-found when the id is not in the archive', async () => {
    const adapter = new InMemoryAdapter({ [ARCHIVE_PATH]: SEED_ARCHIVE });
    const result = await unresolveTask(adapter, activeVault(), 'unknown');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not-found');
  });

  it('returns no-active-sections when the active vault has none', async () => {
    const adapter = new InMemoryAdapter({ [ARCHIVE_PATH]: SEED_ARCHIVE });
    const empty: Vault = { prelude: '', sections: [] };
    const result = await unresolveTask(adapter, empty, 'abc12345');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no-active-sections');
  });

  it('restores the task to the matching active section with checked=false', async () => {
    const adapter = new InMemoryAdapter({ [ARCHIVE_PATH]: SEED_ARCHIVE });
    const vault = activeVault();
    const result = await unresolveTask(adapter, vault, 'abc12345');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.targetSectionId).toBe('active');
    expect(result.sourceSection).toBe('Active');
    expect(result.usedFallback).toBe(false);

    const active = vault.sections[0]!;
    expect(active.tasks).toHaveLength(2);
    const restored = active.tasks[0]!;
    expect(restored.id).toBe('abc12345');
    expect(restored.title).toBe('Ship release');
    expect(restored.priority).toBe('blocker');
    expect(restored.checked).toBe(false);
    expect(restored.note).toBe('shipped');
    expect(restored.subtasks).toEqual([{ text: 'tag the commit', checked: true }]);
  });

  it('writes the slimmed archive content (entry removed) on success', async () => {
    const adapter = new InMemoryAdapter({ [ARCHIVE_PATH]: SEED_ARCHIVE });
    await unresolveTask(adapter, activeVault(), 'abc12345');
    const remaining = await adapter.readFile(ARCHIVE_PATH);
    expect(remaining).not.toContain('<!-- id:abc12345 -->');
    expect(remaining).not.toContain('## 2026-05-18 10:00');
    // Header prelude survives.
    expect(remaining).toMatch(/^# Archived Tasks\n/);
  });

  it('falls back to the first section when sourceSection is missing in the active vault', async () => {
    const adapter = new InMemoryAdapter({
      [ARCHIVE_PATH]:
        '# Archived Tasks\n\n' +
        '## 2026-05-18 10:00 — Gone\n\n' +
        '- [x] **Ship** <!-- id:deadbeef -->\n',
    });
    const vault = activeVault();
    const result = await unresolveTask(adapter, vault, 'deadbeef');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.usedFallback).toBe(true);
    expect(result.sourceSection).toBe('Gone');
    expect(result.targetSectionId).toBe('active');
    expect(vault.sections[0]?.tasks[0]?.id).toBe('deadbeef');
  });

  it('falls back to the first section when the H2 has no source-section suffix', async () => {
    const adapter = new InMemoryAdapter({
      [ARCHIVE_PATH]:
        '# Archived Tasks\n\n' +
        '## 2026-05-18 10:00\n\n' +
        '- [x] **Anon** <!-- id:cafecafe -->\n',
    });
    const vault = activeVault();
    const result = await unresolveTask(adapter, vault, 'cafecafe');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.usedFallback).toBe(true);
    expect(result.sourceSection).toBe('');
    expect(result.targetSectionId).toBe('active');
  });

  it('re-mints a colliding id via ensureUniqueTaskIds', async () => {
    const adapter = new InMemoryAdapter({ [ARCHIVE_PATH]: SEED_ARCHIVE });
    const vault: Vault = {
      prelude: '',
      sections: [
        {
          id: 'active',
          name: 'Active',
          tasks: [task('abc12345', { title: 'Pre-existing' })],
        },
      ],
    };
    const result = await unresolveTask(adapter, vault, 'abc12345');
    expect(result.ok).toBe(true);
    const ids = vault.sections[0]!.tasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(2);
    // The pre-existing task keeps its id; the restored one gets re-minted.
    expect(ids).toContain('abc12345');
  });

  it('inserts the restored task at the top of the target section', async () => {
    const adapter = new InMemoryAdapter({ [ARCHIVE_PATH]: SEED_ARCHIVE });
    const vault = activeVault();
    await unresolveTask(adapter, vault, 'abc12345');
    expect(vault.sections[0]?.tasks.map((t) => t.id)).toEqual(['abc12345', 'x']);
  });

  it('merges [res: …] back into the active note and clears `resolution` (slice 6h)', async () => {
    // Archive entry has the slice-6h marker; original note is "context".
    const archive =
      '# Archived Tasks\n\n## 2026-05-18 10:00 — Active\n\n' +
      '- [x] **Ship** - [res: shipped on day 1] · context <!-- id:deadbeef -->\n';
    const adapter = new InMemoryAdapter({ [ARCHIVE_PATH]: archive });
    const vault = activeVault();
    const result = await unresolveTask(adapter, vault, 'deadbeef');
    expect(result.ok).toBe(true);
    const restored = vault.sections[0]!.tasks[0]!;
    expect(restored.id).toBe('deadbeef');
    expect(restored.note).toBe('shipped on day 1 · context');
    expect(restored.resolution).toBe('');
  });

  it('restores the resolution-only case (no original note) with the marker text as the note', async () => {
    const archive =
      '# Archived Tasks\n\n## 2026-05-18 10:00 — Active\n\n' +
      '- [x] **Ship** - [res: shipped on day 1] <!-- id:deadbeef -->\n';
    const adapter = new InMemoryAdapter({ [ARCHIVE_PATH]: archive });
    const vault = activeVault();
    const result = await unresolveTask(adapter, vault, 'deadbeef');
    expect(result.ok).toBe(true);
    const restored = vault.sections[0]!.tasks[0]!;
    expect(restored.note).toBe('shipped on day 1');
    expect(restored.resolution).toBe('');
  });
});
