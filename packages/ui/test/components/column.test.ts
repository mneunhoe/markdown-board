import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Column from '../../src/components/Column.svelte';

describe('Column', () => {
  it('renders the section name in the header', () => {
    const { container } = render(Column, { name: 'Active', count: 0 });
    expect(container.querySelector('.column-title')?.textContent?.trim()).toBe('Active');
  });

  it('renders the task count in the badge', () => {
    const { container } = render(Column, { name: 'Active', count: 7 });
    expect(container.querySelector('.count')?.textContent?.trim()).toBe('7');
  });

  it('exposes an aria-label naming the section', () => {
    const { container } = render(Column, { name: 'Doing', count: 2 });
    expect(container.querySelector('.column')?.getAttribute('aria-label')).toBe('Section Doing');
  });

  it('renders zero count as 0, not blank', () => {
    const { container } = render(Column, { name: 'Done', count: 0 });
    expect(container.querySelector('.count')?.textContent?.trim()).toBe('0');
  });

  it('renders the count badge with an accessible label', () => {
    const { container } = render(Column, { name: 'Active', count: 3 });
    expect(container.querySelector('.count')?.getAttribute('aria-label')).toBe('3 tasks');
  });

  it('has an empty cards container ready for children', () => {
    const { container } = render(Column, { name: 'Active', count: 0 });
    const cards = container.querySelector('.cards');
    expect(cards).not.toBeNull();
    expect(cards?.children).toHaveLength(0);
  });

  describe('onRename (slice 6c)', () => {
    it('without onRename, the title is a plain span', () => {
      const { container } = render(Column, { name: 'Active', count: 0 });
      expect(container.querySelector('button.column-title')).toBeNull();
      expect(container.querySelector('span.column-title')).toBeTruthy();
    });

    it('with onRename, clicking the title swaps in an input', async () => {
      const { container } = render(Column, { name: 'Active', count: 0, onRename: () => {} });
      const btn = container.querySelector<HTMLButtonElement>('[data-testid="column-title"]');
      expect(btn).toBeTruthy();
      await fireEvent.click(btn!);
      expect(container.querySelector('[data-testid="column-rename-input"]')).toBeTruthy();
    });

    it('committing a rename with Enter calls onRename with the trimmed value', async () => {
      const onRename = vi.fn();
      const { container } = render(Column, { name: 'Active', count: 0, onRename });
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="column-title"]')!,
      );
      const input = container.querySelector<HTMLInputElement>(
        '[data-testid="column-rename-input"]',
      );
      await fireEvent.input(input!, { target: { value: '  On Deck  ' } });
      await fireEvent.keyDown(input!, { key: 'Enter' });
      expect(onRename).toHaveBeenCalledWith('On Deck');
    });

    it('Escape reverts and does not call onRename', async () => {
      const onRename = vi.fn();
      const { container } = render(Column, { name: 'Active', count: 0, onRename });
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="column-title"]')!,
      );
      const input = container.querySelector<HTMLInputElement>(
        '[data-testid="column-rename-input"]',
      );
      await fireEvent.input(input!, { target: { value: 'discarded' } });
      await fireEvent.keyDown(input!, { key: 'Escape' });
      expect(onRename).not.toHaveBeenCalled();
    });

    it('committing an unchanged value does not call onRename', async () => {
      const onRename = vi.fn();
      const { container } = render(Column, { name: 'Active', count: 0, onRename });
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="column-title"]')!,
      );
      const input = container.querySelector<HTMLInputElement>(
        '[data-testid="column-rename-input"]',
      );
      await fireEvent.keyDown(input!, { key: 'Enter' });
      expect(onRename).not.toHaveBeenCalled();
    });
  });

  describe('archivedTasks (slice 6g)', () => {
    it('without archivedTasks, no Archived expander is mounted', () => {
      const { container } = render(Column, { name: 'Active', count: 0 });
      expect(container.querySelector('[data-testid="archived-expander"]')).toBeNull();
    });

    it('renders the Archived expander when archivedTasks is non-empty', () => {
      const { container } = render(Column, {
        name: 'Active',
        count: 0,
        archivedTasks: [
          {
            task: {
              id: 'a',
              checked: true,
              title: 'Old',
              note: '',
              priority: null,
              project: null,
              day: null,
              pomodoros: 0,
              resolution: '',
              subtasks: [],
            },
            archivedAt: '2026-05-18 10:00',
          },
        ],
      });
      const toggle = container.querySelector<HTMLButtonElement>('[data-testid="archived-toggle"]');
      expect(toggle).toBeTruthy();
      expect(toggle?.textContent).toContain('Archived (1)');
    });

    it('forwards onUnresolveArchived to the expander', async () => {
      const onUnresolveArchived = vi.fn();
      const { container } = render(Column, {
        name: 'Active',
        count: 0,
        archivedTasks: [
          {
            task: {
              id: 'abc',
              checked: true,
              title: 'Old',
              note: '',
              priority: null,
              project: null,
              day: null,
              pomodoros: 0,
              resolution: '',
              subtasks: [],
            },
            archivedAt: '2026-05-18 10:00',
          },
        ],
        onUnresolveArchived,
      });
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="archived-toggle"]')!,
      );
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="task-unresolve"]')!,
      );
      expect(onUnresolveArchived).toHaveBeenCalledWith('abc');
    });
  });

  describe('onAddTask (slice 6i)', () => {
    it('without onAddTask, no "+ Add task" affordance is rendered', () => {
      const { container } = render(Column, { name: 'Active', count: 0 });
      expect(container.querySelector('[data-testid="column-add-task"]')).toBeNull();
    });

    it('with onAddTask, clicking the affordance swaps in an input', async () => {
      const { container } = render(Column, { name: 'Active', count: 0, onAddTask: () => {} });
      const btn = container.querySelector<HTMLButtonElement>('[data-testid="column-add-task"]');
      expect(btn).toBeTruthy();
      await fireEvent.click(btn!);
      expect(container.querySelector('[data-testid="column-add-task-input"]')).toBeTruthy();
    });

    it('committing with Enter calls onAddTask with the trimmed title', async () => {
      const onAddTask = vi.fn();
      const { container } = render(Column, { name: 'Active', count: 0, onAddTask });
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="column-add-task"]')!,
      );
      const input = container.querySelector<HTMLInputElement>(
        '[data-testid="column-add-task-input"]',
      );
      await fireEvent.input(input!, { target: { value: '  Fresh task  ' } });
      await fireEvent.keyDown(input!, { key: 'Enter' });
      expect(onAddTask).toHaveBeenCalledWith('Fresh task');
    });

    it('Escape reverts and does not call onAddTask', async () => {
      const onAddTask = vi.fn();
      const { container } = render(Column, { name: 'Active', count: 0, onAddTask });
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="column-add-task"]')!,
      );
      const input = container.querySelector<HTMLInputElement>(
        '[data-testid="column-add-task-input"]',
      );
      await fireEvent.input(input!, { target: { value: 'discarded' } });
      await fireEvent.keyDown(input!, { key: 'Escape' });
      expect(onAddTask).not.toHaveBeenCalled();
    });

    it('empty / whitespace-only Enter does not call onAddTask', async () => {
      const onAddTask = vi.fn();
      const { container } = render(Column, { name: 'Active', count: 0, onAddTask });
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="column-add-task"]')!,
      );
      const input = container.querySelector<HTMLInputElement>(
        '[data-testid="column-add-task-input"]',
      );
      await fireEvent.input(input!, { target: { value: '   ' } });
      await fireEvent.keyDown(input!, { key: 'Enter' });
      expect(onAddTask).not.toHaveBeenCalled();
    });
  });

  describe('onDelete (slice 6j)', () => {
    it('without onDelete, no × button is rendered', () => {
      const { container } = render(Column, { name: 'Active', count: 0 });
      expect(container.querySelector('[data-testid="column-delete"]')).toBeNull();
    });

    it('with onDelete on a truly empty column, × is rendered', () => {
      const { container } = render(Column, { name: 'Active', count: 0, onDelete: () => {} });
      expect(container.querySelector('[data-testid="column-delete"]')).toBeTruthy();
    });

    it('hides × when the column has open tasks (count > 0)', () => {
      const { container } = render(Column, { name: 'Active', count: 1, onDelete: () => {} });
      expect(container.querySelector('[data-testid="column-delete"]')).toBeNull();
    });

    it('hides × when the column has archived refs', () => {
      const { container } = render(Column, {
        name: 'Active',
        count: 0,
        onDelete: () => {},
        archivedTasks: [
          {
            task: {
              id: 'a',
              checked: true,
              title: 'Old',
              note: '',
              resolution: '',
              priority: null,
              project: null,
              day: null,
              pomodoros: 0,
              subtasks: [],
            },
            archivedAt: '2026-05-18 10:00',
          },
        ],
      });
      expect(container.querySelector('[data-testid="column-delete"]')).toBeNull();
    });

    it('clicking × fires onDelete', async () => {
      const onDelete = vi.fn();
      const { container } = render(Column, { name: 'Active', count: 0, onDelete });
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="column-delete"]')!,
      );
      expect(onDelete).toHaveBeenCalledOnce();
    });
  });
});
