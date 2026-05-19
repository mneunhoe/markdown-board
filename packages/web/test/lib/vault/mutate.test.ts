import type { Task, Vault } from '@markdown-board/core';
import { describe, expect, it } from 'vitest';

import {
  addSubtask,
  allProjects,
  cycleTaskPriority,
  deleteTask,
  ensureUniqueTaskIds,
  moveColumn,
  moveTask,
  renameSection,
  setSubtaskText,
  setTask,
  setTaskDay,
  setTaskNote,
  setTaskPriority,
  setTaskProject,
  setTaskTitle,
  toggleSubtask,
} from '../../../src/lib/vault/mutate.js';

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
    resolution: '',
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

describe('setTaskTitle', () => {
  it('mutates the title in place', () => {
    const v = vault();
    const ok = setTaskTitle(v, { taskId: 'a', sectionId: 'active' }, 'Renamed');
    expect(ok).toBe(true);
    expect(v.sections[0]?.tasks[0]?.title).toBe('Renamed');
  });

  it('returns false when the task is unknown', () => {
    const v = vault();
    expect(setTaskTitle(v, { taskId: 'nope', sectionId: 'active' }, 'X')).toBe(false);
  });

  it('returns false when the section is unknown', () => {
    const v = vault();
    expect(setTaskTitle(v, { taskId: 'a', sectionId: 'ghost' }, 'X')).toBe(false);
  });
});

describe('setTaskNote', () => {
  it('sets the note', () => {
    const v = vault();
    setTaskNote(v, { taskId: 'a', sectionId: 'active' }, 'see backlog');
    expect(v.sections[0]?.tasks[0]?.note).toBe('see backlog');
  });

  it('clears the note when next is empty (prototype parity)', () => {
    const v = vault();
    setTaskNote(v, { taskId: 'a', sectionId: 'active' }, 'temp');
    setTaskNote(v, { taskId: 'a', sectionId: 'active' }, '');
    expect(v.sections[0]?.tasks[0]?.note).toBe('');
  });
});

describe('deleteTask', () => {
  it('removes the task from its section', () => {
    const v = vault();
    const ok = deleteTask(v, { taskId: 'a', sectionId: 'active' });
    expect(ok).toBe(true);
    expect(v.sections[0]?.tasks.map((t) => t.id)).toEqual(['b']);
  });

  it('returns false for a stale target', () => {
    const v = vault();
    expect(deleteTask(v, { taskId: 'ghost', sectionId: 'active' })).toBe(false);
    expect(v.sections[0]?.tasks).toHaveLength(2);
  });
});

describe('setSubtaskText', () => {
  function vaultWithSubs() {
    const v = vault();
    const t = v.sections[0]?.tasks[0];
    if (!t) throw new Error();
    t.subtasks = [
      { text: 'first', checked: false },
      { text: 'second', checked: true },
    ];
    return v;
  }

  it('updates the subtask text', () => {
    const v = vaultWithSubs();
    setSubtaskText(v, { taskId: 'a', sectionId: 'active' }, 0, 'updated');
    expect(v.sections[0]?.tasks[0]?.subtasks[0]?.text).toBe('updated');
  });

  it('deletes the subtask when next is empty (prototype parity, line 3105)', () => {
    const v = vaultWithSubs();
    setSubtaskText(v, { taskId: 'a', sectionId: 'active' }, 0, '');
    expect(v.sections[0]?.tasks[0]?.subtasks.map((s) => s.text)).toEqual(['second']);
  });

  it('returns false for an out-of-range index', () => {
    const v = vaultWithSubs();
    expect(setSubtaskText(v, { taskId: 'a', sectionId: 'active' }, 99, 'x')).toBe(false);
  });
});

describe('toggleSubtask', () => {
  it('flips the checked state', () => {
    const v = vault();
    const t = v.sections[0]?.tasks[0];
    if (!t) throw new Error();
    t.subtasks = [{ text: 'one', checked: false }];
    toggleSubtask(v, { taskId: 'a', sectionId: 'active' }, 0);
    expect(t.subtasks[0]?.checked).toBe(true);
    toggleSubtask(v, { taskId: 'a', sectionId: 'active' }, 0);
    expect(t.subtasks[0]?.checked).toBe(false);
  });

  it('returns false for an out-of-range index', () => {
    const v = vault();
    expect(toggleSubtask(v, { taskId: 'a', sectionId: 'active' }, 0)).toBe(false);
  });
});

describe('addSubtask', () => {
  it('appends an unchecked subtask', () => {
    const v = vault();
    addSubtask(v, { taskId: 'a', sectionId: 'active' }, 'new');
    expect(v.sections[0]?.tasks[0]?.subtasks).toEqual([{ text: 'new', checked: false }]);
  });

  it('returns false (and does not add) for an empty string', () => {
    const v = vault();
    expect(addSubtask(v, { taskId: 'a', sectionId: 'active' }, '')).toBe(false);
    expect(v.sections[0]?.tasks[0]?.subtasks).toHaveLength(0);
  });
});

describe('setTaskPriority / cycleTaskPriority', () => {
  it('sets the priority directly', () => {
    const v = vault();
    setTaskPriority(v, { taskId: 'a', sectionId: 'active' }, 'high');
    expect(v.sections[0]?.tasks[0]?.priority).toBe('high');
    setTaskPriority(v, { taskId: 'a', sectionId: 'active' }, null);
    expect(v.sections[0]?.tasks[0]?.priority).toBeNull();
  });

  it('cycles through null → blocker → high → low → null (slice 6b extends prototype)', () => {
    const v = vault();
    expect(v.sections[0]?.tasks[0]?.priority).toBeNull();
    cycleTaskPriority(v, { taskId: 'a', sectionId: 'active' });
    expect(v.sections[0]?.tasks[0]?.priority).toBe('blocker');
    cycleTaskPriority(v, { taskId: 'a', sectionId: 'active' });
    expect(v.sections[0]?.tasks[0]?.priority).toBe('high');
    cycleTaskPriority(v, { taskId: 'a', sectionId: 'active' });
    expect(v.sections[0]?.tasks[0]?.priority).toBe('low');
    cycleTaskPriority(v, { taskId: 'a', sectionId: 'active' });
    expect(v.sections[0]?.tasks[0]?.priority).toBeNull();
  });
});

describe('setTaskProject', () => {
  it('sets the project tag and trims whitespace', () => {
    const v = vault();
    setTaskProject(v, { taskId: 'a', sectionId: 'active' }, '  Foo  ');
    expect(v.sections[0]?.tasks[0]?.project).toBe('Foo');
  });

  it('treats empty / whitespace-only input as a clear', () => {
    const v = vault();
    setTaskProject(v, { taskId: 'a', sectionId: 'active' }, 'X');
    setTaskProject(v, { taskId: 'a', sectionId: 'active' }, '   ');
    expect(v.sections[0]?.tasks[0]?.project).toBeNull();
    setTaskProject(v, { taskId: 'a', sectionId: 'active' }, 'X');
    setTaskProject(v, { taskId: 'a', sectionId: 'active' }, null);
    expect(v.sections[0]?.tasks[0]?.project).toBeNull();
  });
});

describe('setTaskDay', () => {
  it('sets the day token', () => {
    const v = vault();
    setTaskDay(v, { taskId: 'a', sectionId: 'active' }, 'Wed');
    expect(v.sections[0]?.tasks[0]?.day).toBe('Wed');
  });

  it('clears the day token when next is null', () => {
    const v = vault();
    setTaskDay(v, { taskId: 'a', sectionId: 'active' }, 'Mon');
    setTaskDay(v, { taskId: 'a', sectionId: 'active' }, null);
    expect(v.sections[0]?.tasks[0]?.day).toBeNull();
  });
});

describe('renameSection', () => {
  it('updates name + slug id when the new name slugs differently', () => {
    const v = vault();
    const ok = renameSection(v, 'active', 'On Deck');
    expect(ok).toBe(true);
    expect(v.sections[0]?.name).toBe('On Deck');
    expect(v.sections[0]?.id).toBe('on-deck');
  });

  it('updates only name when the slug is unchanged (same id after slugify)', () => {
    const v = vault();
    const ok = renameSection(v, 'active', 'ACTIVE');
    expect(ok).toBe(true);
    expect(v.sections[0]?.name).toBe('ACTIVE');
    expect(v.sections[0]?.id).toBe('active');
  });

  it('returns false for empty / whitespace-only names', () => {
    const v = vault();
    expect(renameSection(v, 'active', '   ')).toBe(false);
    expect(v.sections[0]?.name).toBe('Active');
  });

  it('returns false when the new id would collide with another section', () => {
    const v = vault();
    expect(renameSection(v, 'active', 'Done')).toBe(false);
    expect(v.sections[0]?.name).toBe('Active');
    expect(v.sections[0]?.id).toBe('active');
    expect(v.sections[1]?.id).toBe('done');
  });

  it('returns false for unknown section id', () => {
    expect(renameSection(vault(), 'ghost', 'Anything')).toBe(false);
  });
});

describe('allProjects', () => {
  it('returns a sorted unique list across all sections', () => {
    const v = vault();
    if (v.sections[0]?.tasks[0]) v.sections[0].tasks[0].project = 'Beta';
    if (v.sections[0]?.tasks[1]) v.sections[0].tasks[1].project = 'Alpha';
    if (v.sections[1]?.tasks[0]) v.sections[1].tasks[0].project = 'Beta';
    expect(allProjects(v)).toEqual(['Alpha', 'Beta']);
  });

  it('returns [] when no tasks have projects', () => {
    expect(allProjects(vault())).toEqual([]);
  });
});

describe('setTask (slice 6e)', () => {
  it('replaces the task object in place', () => {
    const v = vault();
    const ok = setTask(
      v,
      { taskId: 'a', sectionId: 'active' },
      {
        id: 'ignored',
        checked: true,
        title: 'Renamed',
        note: 'fresh',
        priority: 'blocker',
        project: 'Foo',
        day: 'Wed',
        pomodoros: 4,
        resolution: '',
        subtasks: [{ text: 'first', checked: false }],
      },
    );
    expect(ok).toBe(true);
    const t = v.sections[0]?.tasks[0];
    expect(t?.title).toBe('Renamed');
    expect(t?.note).toBe('fresh');
    expect(t?.priority).toBe('blocker');
    expect(t?.project).toBe('Foo');
    expect(t?.day).toBe('Wed');
    expect(t?.pomodoros).toBe(4);
    expect(t?.subtasks).toEqual([{ text: 'first', checked: false }]);
  });

  it('preserves the original id and checked state even if `next` carries different values', () => {
    const v = vault();
    setTask(
      v,
      { taskId: 'a', sectionId: 'active' },
      {
        id: 'should-be-ignored',
        checked: true,
        title: 'X',
        note: '',
        priority: null,
        project: null,
        day: null,
        pomodoros: 0,
        resolution: '',
        subtasks: [],
      },
    );
    const t = v.sections[0]?.tasks[0];
    expect(t?.id).toBe('a');
    expect(t?.checked).toBe(false);
  });

  it('returns false for a stale target', () => {
    expect(
      setTask(
        vault(),
        { taskId: 'ghost', sectionId: 'active' },
        {
          id: 'x',
          checked: false,
          title: 'X',
          note: '',
          priority: null,
          project: null,
          day: null,
          pomodoros: 0,
          resolution: '',
          subtasks: [],
        },
      ),
    ).toBe(false);
  });
});
