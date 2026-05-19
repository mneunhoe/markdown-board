import type { Task, Vault } from '@markdown-board/core';
import { describe, expect, it } from 'vitest';

import { ensureUniqueTaskIds, moveColumn, moveTask } from '../../../src/lib/vault/mutate.js';

function task(id: string, title: string): Task {
  return {
    id,
    checked: false,
    title,
    note: '',
    priority: null,
    project: null,
    day: null,
    pomodoros: 0,
    subtasks: [],
  };
}

function vault(): Vault {
  return {
    prelude: '',
    sections: [
      {
        id: 'active',
        name: 'Active',
        tasks: [task('a', 'Alpha'), task('b', 'Bravo')],
      },
      {
        id: 'done',
        name: 'Done',
        tasks: [task('c', 'Charlie')],
      },
    ],
  };
}

describe('moveTask', () => {
  it('reorders within the same section', () => {
    const v = vault();
    const ok = moveTask(v, {
      taskId: 'a',
      fromSectionId: 'active',
      toSectionId: 'active',
      toIndex: 1,
    });
    expect(ok).toBe(true);
    expect(v.sections[0]?.tasks.map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('moves across sections at the given destination index', () => {
    const v = vault();
    const ok = moveTask(v, {
      taskId: 'a',
      fromSectionId: 'active',
      toSectionId: 'done',
      toIndex: 0,
    });
    expect(ok).toBe(true);
    expect(v.sections[0]?.tasks.map((t) => t.id)).toEqual(['b']);
    expect(v.sections[1]?.tasks.map((t) => t.id)).toEqual(['a', 'c']);
  });

  it('appends across sections when toIndex equals the destination length', () => {
    const v = vault();
    moveTask(v, {
      taskId: 'a',
      fromSectionId: 'active',
      toSectionId: 'done',
      toIndex: 1,
    });
    expect(v.sections[1]?.tasks.map((t) => t.id)).toEqual(['c', 'a']);
  });

  it('returns false when the source section is unknown', () => {
    const v = vault();
    const ok = moveTask(v, {
      taskId: 'a',
      fromSectionId: 'ghost',
      toSectionId: 'done',
      toIndex: 0,
    });
    expect(ok).toBe(false);
    expect(v.sections[0]?.tasks.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('returns false when the destination section is unknown', () => {
    const v = vault();
    const ok = moveTask(v, {
      taskId: 'a',
      fromSectionId: 'active',
      toSectionId: 'ghost',
      toIndex: 0,
    });
    expect(ok).toBe(false);
    expect(v.sections[0]?.tasks.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('returns false when the task id is not in the source', () => {
    const v = vault();
    const ok = moveTask(v, {
      taskId: 'nope',
      fromSectionId: 'active',
      toSectionId: 'done',
      toIndex: 0,
    });
    expect(ok).toBe(false);
  });
});

describe('moveColumn', () => {
  it('reorders the sections array', () => {
    const v = vault();
    const ok = moveColumn(v, { sectionId: 'done', toIndex: 0 });
    expect(ok).toBe(true);
    expect(v.sections.map((s) => s.id)).toEqual(['done', 'active']);
  });

  it('returns false when the section is unknown', () => {
    const v = vault();
    const ok = moveColumn(v, { sectionId: 'ghost', toIndex: 0 });
    expect(ok).toBe(false);
    expect(v.sections.map((s) => s.id)).toEqual(['active', 'done']);
  });
});

describe('ensureUniqueTaskIds', () => {
  it('preserves existing unique ids byte-for-byte', () => {
    const v = vault();
    const before = v.sections[0]?.tasks[0]?.id;
    ensureUniqueTaskIds(v);
    expect(v.sections[0]?.tasks[0]?.id).toBe(before);
  });

  it('mints an id for tasks with empty ids', () => {
    const v: Vault = {
      prelude: '',
      sections: [{ id: 's', name: 'S', tasks: [task('', 'Alpha'), task('', 'Bravo')] }],
    };
    ensureUniqueTaskIds(v);
    const ids = v.sections[0]?.tasks.map((t) => t.id) ?? [];
    expect(ids.every((id) => /^[0-9a-f]{8}$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(2);
  });

  it('renames duplicate ids while preserving the first occurrence', () => {
    const v: Vault = {
      prelude: '',
      sections: [
        {
          id: 's',
          name: 'S',
          tasks: [task('dup', 'Alpha'), task('dup', 'Bravo'), task('dup', 'Charlie')],
        },
      ],
    };
    ensureUniqueTaskIds(v);
    const ids = v.sections[0]?.tasks.map((t) => t.id) ?? [];
    expect(ids[0]).toBe('dup');
    expect(ids[1]).not.toBe('dup');
    expect(ids[2]).not.toBe('dup');
    expect(new Set(ids).size).toBe(3);
  });

  it('mints across sections so the whole vault has unique ids', () => {
    const v: Vault = {
      prelude: '',
      sections: [
        { id: 's1', name: 'S1', tasks: [task('', 'A'), task('', 'B')] },
        { id: 's2', name: 'S2', tasks: [task('', 'C')] },
      ],
    };
    ensureUniqueTaskIds(v);
    const ids = v.sections.flatMap((s) => s.tasks.map((t) => t.id));
    expect(new Set(ids).size).toBe(3);
  });
});
