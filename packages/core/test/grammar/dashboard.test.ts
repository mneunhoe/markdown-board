import { describe, expect, it } from 'vitest';

import { computeStat, matchesFilter, type StatFilter } from '../../src/grammar/dashboard.js';
import type { Section, Task, Vault } from '../../src/grammar/types.js';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'id-' + (overrides.title ?? Math.random().toString(36).slice(2)),
    checked: false,
    title: 'A task',
    note: '',
    resolution: '',
    priority: null,
    project: null,
    day: null,
    pomodoros: 0,
    subtasks: [],
    ...overrides,
  };
}

function makeVault(sections: Section[]): Vault {
  return { prelude: '', sections };
}

describe('matchesFilter', () => {
  it('matches everything when the filter is undefined or empty', () => {
    const t = makeTask();
    expect(matchesFilter(t, 'Active', undefined)).toBe(true);
    expect(matchesFilter(t, 'Active', {})).toBe(true);
  });

  it('matches a scalar priority and rejects a mismatch', () => {
    expect(
      matchesFilter(makeTask({ priority: 'blocker' }), 'Active', { priority: 'blocker' }),
    ).toBe(true);
    expect(matchesFilter(makeTask({ priority: 'high' }), 'Active', { priority: 'blocker' })).toBe(
      false,
    );
  });

  it('treats an array value as OR within the key', () => {
    const f: StatFilter = { day: ['Mon', 'Tue'] };
    expect(matchesFilter(makeTask({ day: 'Tue' }), 'Active', f)).toBe(true);
    expect(matchesFilter(makeTask({ day: 'Wed' }), 'Active', f)).toBe(false);
  });

  it('ANDs across multiple keys', () => {
    const f = { priority: 'high' as const, checked: false };
    expect(matchesFilter(makeTask({ priority: 'high', checked: false }), 'A', f)).toBe(true);
    expect(matchesFilter(makeTask({ priority: 'high', checked: true }), 'A', f)).toBe(false);
  });

  it('matches project, section, and checked', () => {
    expect(matchesFilter(makeTask({ project: 'Alpha' }), 'A', { project: 'Alpha' })).toBe(true);
    expect(matchesFilter(makeTask({ project: null }), 'A', { project: 'Alpha' })).toBe(false);
    expect(matchesFilter(makeTask(), 'Doing', { section: 'Doing' })).toBe(true);
    expect(matchesFilter(makeTask(), 'Active', { section: 'Doing' })).toBe(false);
    expect(matchesFilter(makeTask({ checked: true }), 'A', { checked: true })).toBe(true);
  });
});

describe('computeStat', () => {
  const vault = makeVault([
    makeSection('s1', 'Active', [
      makeTask({ title: 'a', priority: 'blocker', day: 'Mon' }),
      makeTask({ title: 'b', priority: 'high', project: 'Alpha' }),
    ]),
    makeSection('s2', 'Done', [makeTask({ title: 'c', checked: true, priority: 'blocker' })]),
  ]);

  it('counts all tasks with no filter', () => {
    expect(computeStat(vault, undefined)).toBe(3);
  });

  it('counts tasks matching a filter across sections', () => {
    expect(computeStat(vault, { priority: 'blocker' })).toBe(2);
    expect(computeStat(vault, { project: 'Alpha' })).toBe(1);
    expect(computeStat(vault, { section: 'Done', checked: true })).toBe(1);
    expect(computeStat(vault, { day: ['Mon', 'Tue'] })).toBe(1);
  });
});

function makeSection(id: string, name: string, tasks: Task[]): Section {
  return { id, name, tasks };
}
