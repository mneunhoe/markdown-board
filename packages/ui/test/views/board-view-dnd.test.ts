/**
 * BoardView DnD wiring tests. The actual native HTML5 drag events are not
 * fired here — happy-dom doesn't faithfully simulate the DataTransfer
 * lifecycle pragmatic-dnd relies on. Instead we assert the structural
 * contract:
 *
 *   • `onTaskMove` / `onColumnMove` omitted → wrapper slots render, but
 *     pragmatic-dnd is never engaged, so no `draggable="true"` attribute
 *     is set on the wrappers.
 *
 *   • Providing the callbacks turns on the corresponding DnD wiring —
 *     wrappers gain `draggable="true"` (the side-effect pragmatic-dnd
 *     applies to drag sources) and the column header carries the
 *     `data-column-drag-handle` marker the columnDraggable action looks
 *     for.
 *
 * Drag-event-driven behaviour (closest-edge resolution, callback args)
 * is covered by the pure helper tests in test/lib/dnd.test.ts.
 */

import { render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import BoardView from '../../src/views/BoardView.svelte';
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

describe('BoardView — DnD wiring (presentation-only mode)', () => {
  it('renders board-column-slot and board-task-slot wrappers unconditionally', () => {
    // Wrappers are always in the DOM so structural assertions stay stable
    // when DnD callbacks are toggled on/off.
    const vault = makeVault([
      makeSection('a', 'Active', [makeTask({ id: 't1' }), makeTask({ id: 't2' })]),
    ]);
    const { container } = render(BoardView, { vault });
    expect(container.querySelectorAll('.board-column-slot')).toHaveLength(1);
    expect(container.querySelectorAll('.board-task-slot')).toHaveLength(2);
  });

  it('does not mark slots as draggable when no callbacks are provided', () => {
    const vault = makeVault([makeSection('a', 'Active', [makeTask({ id: 't1' })])]);
    const { container } = render(BoardView, { vault });
    expect(container.querySelector('.board-column-slot[draggable="true"]')).toBeNull();
    expect(container.querySelector('.board-task-slot[draggable="true"]')).toBeNull();
  });
});

describe('BoardView — DnD wiring (callbacks provided)', () => {
  it('marks task wrappers as draggable when onTaskMove is provided', () => {
    const vault = makeVault([
      makeSection('a', 'Active', [makeTask({ id: 't1' }), makeTask({ id: 't2' })]),
    ]);
    const { container } = render(BoardView, { vault, onTaskMove: vi.fn() });
    const draggableTasks = container.querySelectorAll('.board-task-slot[draggable="true"]');
    expect(draggableTasks).toHaveLength(2);
  });

  it('marks column wrappers as draggable when onColumnMove is provided', () => {
    const vault = makeVault([makeSection('a', 'Active'), makeSection('d', 'Done')]);
    const { container } = render(BoardView, { vault, onColumnMove: vi.fn() });
    const draggableColumns = container.querySelectorAll('.board-column-slot[draggable="true"]');
    expect(draggableColumns).toHaveLength(2);
  });

  it('keeps column wrappers non-draggable when only onTaskMove is provided', () => {
    // Task-only DnD: cards drag, columns do not. Column slots still need to
    // act as drop targets (for task → empty-column drops), but that does not
    // set `draggable="true"`.
    const vault = makeVault([makeSection('a', 'Active', [makeTask({ id: 't1' })])]);
    const { container } = render(BoardView, { vault, onTaskMove: vi.fn() });
    expect(container.querySelector('.board-column-slot[draggable="true"]')).toBeNull();
    expect(container.querySelector('.board-task-slot[draggable="true"]')).not.toBeNull();
  });

  it('keeps task wrappers non-draggable when only onColumnMove is provided', () => {
    const vault = makeVault([makeSection('a', 'Active', [makeTask({ id: 't1' })])]);
    const { container } = render(BoardView, { vault, onColumnMove: vi.fn() });
    expect(container.querySelector('.board-task-slot[draggable="true"]')).toBeNull();
    expect(container.querySelector('.board-column-slot[draggable="true"]')).not.toBeNull();
  });

  it('marks the column header as the drag handle via data-column-drag-handle', () => {
    // Column.svelte adds the marker on its header so columnDraggable can
    // restrict drag start to the title bar (and not background clicks /
    // inner cards).
    const vault = makeVault([makeSection('a', 'Active')]);
    const { container } = render(BoardView, { vault });
    expect(container.querySelector('.column-header[data-column-drag-handle]')).not.toBeNull();
  });
});
