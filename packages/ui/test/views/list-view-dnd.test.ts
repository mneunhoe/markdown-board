/**
 * ListView DnD wiring tests. ListView never exposes column reorder —
 * only `onTaskMove` is in the contract. Sister test to
 * `board-view-dnd.test.ts`; same structural-only approach.
 */

import { render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import ListView from '../../src/views/ListView.svelte';
import type { Section, Task, Vault } from '@markdown-board/core';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'tid-' + (overrides.title ?? 'untitled'),
    checked: false,
    title: 'A task',
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

function makeSection(id: string, name: string, tasks: Task[] = []): Section {
  return { id, name, tasks };
}

function makeVault(sections: Section[] = [], prelude = ''): Vault {
  return { prelude, sections };
}

describe('ListView — DnD wiring', () => {
  it('renders list-task-slot wrappers unconditionally', () => {
    const vault = makeVault([
      makeSection('a', 'Active', [makeTask({ id: 't1' }), makeTask({ id: 't2' })]),
    ]);
    const { container } = render(ListView, { vault });
    expect(container.querySelectorAll('.list-task-slot')).toHaveLength(2);
  });

  it('does not mark slots as draggable when onTaskMove is omitted', () => {
    const vault = makeVault([makeSection('a', 'Active', [makeTask({ id: 't1' })])]);
    const { container } = render(ListView, { vault });
    expect(container.querySelector('.list-task-slot[draggable="true"]')).toBeNull();
  });

  it('marks task slots as draggable when onTaskMove is provided', () => {
    const vault = makeVault([
      makeSection('a', 'Active', [makeTask({ id: 't1' }), makeTask({ id: 't2' })]),
      makeSection('d', 'Done', [makeTask({ id: 't3' })]),
    ]);
    const { container } = render(ListView, { vault, onTaskMove: vi.fn() });
    const draggable = container.querySelectorAll('.list-task-slot[draggable="true"]');
    expect(draggable).toHaveLength(3);
  });

  it('does not expose any column-draggable wrappers (ListView is task-only)', () => {
    // Sanity: ListView must never render column DnD even if a consumer
    // mistakenly tries to pass column-related props (they're not in the
    // type — but TypeScript-erased JS should still degrade cleanly).
    const vault = makeVault([makeSection('a', 'Active', [makeTask({ id: 't1' })])]);
    const { container } = render(ListView, { vault, onTaskMove: vi.fn() });
    expect(container.querySelector('.list-section[draggable="true"]')).toBeNull();
  });
});
