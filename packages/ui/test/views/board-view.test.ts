import { fireEvent, render } from '@testing-library/svelte';
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

  describe('onResolve', () => {
    it('forwards onResolve to every TaskCard checkbox with task + section ids', async () => {
      const onResolve = vi.fn();
      const vault = makeVault([
        makeSection('active', 'Active', [makeTask({ id: 't1', title: 'one' })]),
        makeSection('done', 'Done', [makeTask({ id: 't2', title: 'two' })]),
      ]);
      const { container } = render(BoardView, { vault, onResolve });
      const checkboxes = container.querySelectorAll<HTMLInputElement>('.card-checkbox');
      expect(checkboxes).toHaveLength(2);
      await fireEvent.click(checkboxes[1]!);
      expect(onResolve).toHaveBeenCalledOnce();
      expect(onResolve).toHaveBeenCalledWith({ taskId: 't2', sectionId: 'done' });
    });

    it('leaves checkboxes presentation-only when onResolve is omitted', () => {
      const vault = makeVault([
        makeSection('active', 'Active', [makeTask({ id: 't1', title: 'one' })]),
      ]);
      const { container } = render(BoardView, { vault });
      const checkbox = container.querySelector<HTMLInputElement>('.card-checkbox');
      expect(checkbox?.tabIndex).toBe(-1);
      expect(checkbox?.classList.contains('interactive')).toBe(false);
    });
  });

  describe('onSectionAdd (slice 6i)', () => {
    it('without onSectionAdd, no placeholder column is rendered', () => {
      const vault = makeVault([makeSection('active', 'Active')]);
      const { container } = render(BoardView, { vault });
      expect(container.querySelector('[data-testid="board-add-section"]')).toBeNull();
    });

    it('with onSectionAdd, a "+ Add Section" placeholder appears at the end of the board', () => {
      const vault = makeVault([makeSection('active', 'Active')]);
      const { container } = render(BoardView, { vault, onSectionAdd: () => {} });
      expect(container.querySelector('[data-testid="board-add-section"]')).toBeTruthy();
    });

    it('with onSectionAdd and an empty vault, the placeholder is the only column (no EmptyState)', () => {
      const { container } = render(BoardView, { vault: makeVault([]), onSectionAdd: () => {} });
      expect(container.querySelector('.empty-state')).toBeNull();
      expect(container.querySelector('[data-testid="board-add-section"]')).toBeTruthy();
    });

    it('clicking the placeholder swaps in an input; Enter commits the trimmed name', async () => {
      const onSectionAdd = vi.fn();
      const vault = makeVault([makeSection('active', 'Active')]);
      const { container } = render(BoardView, { vault, onSectionAdd });
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="board-add-section"]')!,
      );
      const input = container.querySelector<HTMLInputElement>(
        '[data-testid="board-add-section-input"]',
      );
      await fireEvent.input(input!, { target: { value: '  On Deck  ' } });
      await fireEvent.keyDown(input!, { key: 'Enter' });
      expect(onSectionAdd).toHaveBeenCalledWith('On Deck');
    });
  });
});
