import { describe, expect, it } from 'vitest';

import { bucketTasksByDay, weekDates, weekStart } from '../../src/grammar/week.js';
import type { Day, Task, Vault } from '../../src/grammar/types.js';

function task(over: Partial<Task> = {}): Task {
  return {
    id: Math.random().toString(36).slice(2),
    checked: false,
    title: 'T',
    note: '',
    resolution: '',
    priority: null,
    project: null,
    day: null,
    pomodoros: 0,
    subtasks: [],
    ...over,
  };
}

describe('weekStart', () => {
  it('resolves a midweek day to that week’s Monday', () => {
    // 2026-05-20 is a Wednesday.
    const ws = weekStart(new Date('2026-05-20T14:00:00'));
    expect(ws.getDay()).toBe(1); // Monday
    expect(ws.getDate()).toBe(18);
    expect(ws.getHours()).toBe(0);
  });

  it('looks ahead to next Monday on Saturday and Sunday', () => {
    // 2026-05-23 Sat → Mon 25; 2026-05-24 Sun → Mon 25.
    expect(weekStart(new Date('2026-05-23T10:00:00')).getDate()).toBe(25);
    expect(weekStart(new Date('2026-05-24T10:00:00')).getDate()).toBe(25);
  });

  it('returns Monday unchanged (at midnight)', () => {
    const ws = weekStart(new Date('2026-05-18T09:30:00'));
    expect(ws.getDate()).toBe(18);
    expect(ws.getHours()).toBe(0);
  });
});

describe('weekDates', () => {
  it('returns seven consecutive dates Mon→Sun', () => {
    const start = weekStart(new Date('2026-05-20T00:00:00'));
    const dates = weekDates(start);
    expect(dates).toHaveLength(7);
    expect(dates[0]!.getDate()).toBe(18);
    expect(dates[6]!.getDate()).toBe(24);
  });
});

describe('bucketTasksByDay', () => {
  const vault: Vault = {
    prelude: '',
    sections: [
      {
        id: 's1',
        name: 'Active',
        tasks: [task({ title: 'Mon task', day: 'Mon' }), task({ title: 'No day' })],
      },
      {
        id: 's2',
        name: 'Backlog',
        tasks: [
          task({ title: 'Another Mon', day: 'Mon' }),
          task({ title: 'Fri task', day: 'Fri' }),
        ],
      },
    ],
  };

  it('returns an entry for every weekday, empty where unused', () => {
    const buckets = bucketTasksByDay(vault);
    const days: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (const d of days) expect(buckets[d]).toBeInstanceOf(Array);
    expect(buckets.Tue).toEqual([]);
  });

  it('buckets dated tasks across sections, preserving section + task order', () => {
    const buckets = bucketTasksByDay(vault);
    expect(buckets.Mon.map((r) => r.task.title)).toEqual(['Mon task', 'Another Mon']);
    expect(buckets.Mon.map((r) => r.sectionId)).toEqual(['s1', 's2']);
    expect(buckets.Fri.map((r) => r.task.title)).toEqual(['Fri task']);
  });

  it('omits tasks with no day', () => {
    const buckets = bucketTasksByDay(vault);
    const all = Object.values(buckets).flat();
    expect(all.some((r) => r.task.title === 'No day')).toBe(false);
  });
});
