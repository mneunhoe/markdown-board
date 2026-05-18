import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
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

describe('BoardView', () => {
  it('renders one Column per section', () => {
    const vault = makeVault([
      makeSection('active', 'Active'),
      makeSection('done', 'Done'),
      makeSection('parking', 'Parking lot'),
    ]);
    const { container } = render(BoardView, { vault });
    expect(container.querySelectorAll('.column')).toHaveLength(3);
  });

  it('renders columns in vault order with their names', () => {
    const vault = makeVault([makeSection('a', 'Active'), makeSection('d', 'Done')]);
    const { container } = render(BoardView, { vault });
    const titles = [...container.querySelectorAll('.column-title')].map((n) =>
      n.textContent?.trim(),
    );
    expect(titles).toEqual(['Active', 'Done']);
  });

  it('renders TaskCard atoms inside their column', () => {
    const vault = makeVault([
      makeSection('a', 'Active', [
        makeTask({ id: 't1', title: 'first' }),
        makeTask({ id: 't2', title: 'second' }),
      ]),
    ]);
    const { container } = render(BoardView, { vault });
    const cards = container.querySelectorAll('.column .task-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]?.querySelector('.card-title')?.textContent?.trim()).toBe('first');
    expect(cards[1]?.querySelector('.card-title')?.textContent?.trim()).toBe('second');
  });

  it('surfaces the section task count on the column header', () => {
    const vault = makeVault([
      makeSection('a', 'Active', [makeTask({ id: 't1' }), makeTask({ id: 't2' })]),
      makeSection('d', 'Done'),
    ]);
    const { container } = render(BoardView, { vault });
    const counts = [...container.querySelectorAll('.column .count')].map((n) =>
      n.textContent?.trim(),
    );
    expect(counts).toEqual(['2', '0']);
  });

  it('renders empty sections as empty columns rather than dropping them', () => {
    const vault = makeVault([makeSection('a', 'Active'), makeSection('d', 'Done')]);
    const { container } = render(BoardView, { vault });
    expect(container.querySelectorAll('.column')).toHaveLength(2);
    expect(container.querySelector('.empty-state')).toBeNull();
  });

  it('renders EmptyState when there are no sections', () => {
    const { container } = render(BoardView, { vault: makeVault([]) });
    expect(container.querySelector('.empty-state')).not.toBeNull();
    expect(container.querySelector('.column')).toBeNull();
  });

  it('honours emptyTitle / emptyHint overrides', () => {
    const { container } = render(BoardView, {
      vault: makeVault([]),
      emptyTitle: 'Pick a vault first',
      emptyHint: 'Use File → Open vault.',
    });
    expect(container.querySelector('.empty-title')?.textContent).toBe('Pick a vault first');
    expect(container.querySelector('.empty-hint')?.textContent).toBe('Use File → Open vault.');
  });
});
