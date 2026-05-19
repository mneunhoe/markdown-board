import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import TaskCard from '../../src/components/TaskCard.svelte';
import type { Task } from '@markdown-board/core';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'a3f8c4e1',
    checked: false,
    title: 'Write the spec',
    note: '',
    priority: null,
    project: null,
    day: null,
    pomodoros: 0,
    subtasks: [],
    ...overrides,
  };
}

describe('TaskCard', () => {
  it('renders the title', () => {
    const { container } = render(TaskCard, { task: makeTask() });
    expect(container.querySelector('.card-title')?.textContent?.trim()).toBe('Write the spec');
  });

  it('reflects the checked state on the checkbox and the card', () => {
    const { container } = render(TaskCard, { task: makeTask({ checked: true }) });
    const card = container.querySelector('.task-card');
    const checkbox = container.querySelector<HTMLInputElement>('.card-checkbox');
    expect(card?.classList.contains('checked')).toBe(true);
    expect(checkbox?.checked).toBe(true);
  });

  it('omits the note row when note is empty', () => {
    const { container } = render(TaskCard, { task: makeTask({ note: '' }) });
    expect(container.querySelector('.card-note')).toBeNull();
  });

  it('renders the note row when note is present', () => {
    const { container } = render(TaskCard, { task: makeTask({ note: 'see backlog item 4' }) });
    expect(container.querySelector('.card-note')?.textContent?.trim()).toBe('see backlog item 4');
  });

  it('renders PriorityBadge / DayChip / ProjectPill when their fields are set', () => {
    const { container } = render(TaskCard, {
      task: makeTask({
        priority: 'blocker',
        day: 'Wed',
        project: 'PSD_GAN — extra',
      }),
    });
    expect(container.querySelector('.priority-badge')?.textContent?.trim()).toBe('P0');
    expect(container.querySelector('.day-chip')?.textContent?.trim()).toBe('Wed');
    expect(container.querySelector('.project-pill')?.textContent?.trim()).toBe('PSD_GAN');
  });

  it('renders nothing for badges when fields are null / zero', () => {
    const { container } = render(TaskCard, {
      task: makeTask({ priority: null, day: null, project: null, pomodoros: 0 }),
    });
    expect(container.querySelector('.priority-badge')).toBeNull();
    expect(container.querySelector('.day-chip')).toBeNull();
    expect(container.querySelector('.project-pill')).toBeNull();
    expect(container.querySelector('.pom-count')).toBeNull();
  });

  it('renders the pomodoro count only when > 0', () => {
    const { container } = render(TaskCard, { task: makeTask({ pomodoros: 3 }) });
    expect(container.querySelector('.pom-count')?.textContent?.trim()).toBe('🍅 3');
  });

  it('renders subtasks with their checked state', () => {
    const { container } = render(TaskCard, {
      task: makeTask({
        subtasks: [
          { text: 'first', checked: false },
          { text: 'second', checked: true },
        ],
      }),
    });
    const items = container.querySelectorAll('.card-subtasks li');
    expect(items).toHaveLength(2);
    expect(items[0]?.classList.contains('checked')).toBe(false);
    expect(items[1]?.classList.contains('checked')).toBe(true);
    expect(items[0]?.querySelector('span')?.textContent).toBe('first');
    expect(items[1]?.querySelector('span')?.textContent).toBe('second');
  });

  it('omits the subtasks list when there are no subtasks', () => {
    const { container } = render(TaskCard, { task: makeTask({ subtasks: [] }) });
    expect(container.querySelector('.card-subtasks')).toBeNull();
  });

  it('exposes the task id as a data attribute when present', () => {
    const { container } = render(TaskCard, { task: makeTask({ id: 'a3f8c4e1' }) });
    expect(container.querySelector('.task-card')?.getAttribute('data-task-id')).toBe('a3f8c4e1');
  });

  it('omits the data-task-id attribute when id is empty', () => {
    const { container } = render(TaskCard, { task: makeTask({ id: '' }) });
    expect(container.querySelector('.task-card')?.hasAttribute('data-task-id')).toBe(false);
  });

  describe('onResolve', () => {
    it('without onResolve, the checkbox is presentation-only', () => {
      const { container } = render(TaskCard, { task: makeTask() });
      const checkbox = container.querySelector<HTMLInputElement>('.card-checkbox');
      expect(checkbox?.tabIndex).toBe(-1);
      expect(checkbox?.hasAttribute('readonly')).toBe(true);
      expect(checkbox?.classList.contains('interactive')).toBe(false);
      expect(checkbox?.getAttribute('aria-label')).toBe('Toggle Write the spec');
    });

    it('with onResolve, the checkbox is keyboard-focusable and interactive', () => {
      const { container } = render(TaskCard, {
        task: makeTask(),
        onResolve: () => {},
      });
      const checkbox = container.querySelector<HTMLInputElement>('.card-checkbox');
      expect(checkbox?.tabIndex).toBe(0);
      expect(checkbox?.hasAttribute('readonly')).toBe(false);
      expect(checkbox?.classList.contains('interactive')).toBe(true);
      expect(checkbox?.getAttribute('aria-label')).toBe('Resolve Write the spec');
    });

    it('clicking the checkbox calls onResolve', async () => {
      const onResolve = vi.fn();
      const { container } = render(TaskCard, { task: makeTask(), onResolve });
      const checkbox = container.querySelector<HTMLInputElement>('.card-checkbox');
      await fireEvent.click(checkbox!);
      expect(onResolve).toHaveBeenCalledOnce();
    });

    it('pressing Enter on the checkbox calls onResolve', async () => {
      const onResolve = vi.fn();
      const { container } = render(TaskCard, { task: makeTask(), onResolve });
      const checkbox = container.querySelector<HTMLInputElement>('.card-checkbox');
      await fireEvent.keyDown(checkbox!, { key: 'Enter' });
      expect(onResolve).toHaveBeenCalledOnce();
    });

    it('pressing Space on the checkbox calls onResolve', async () => {
      const onResolve = vi.fn();
      const { container } = render(TaskCard, { task: makeTask(), onResolve });
      const checkbox = container.querySelector<HTMLInputElement>('.card-checkbox');
      await fireEvent.keyDown(checkbox!, { key: ' ' });
      expect(onResolve).toHaveBeenCalledOnce();
    });
  });

  describe('editor mode (slice 6a)', () => {
    it('without onTitleEdit, the title is a plain non-button element', () => {
      const { container } = render(TaskCard, { task: makeTask() });
      expect(container.querySelector('button.card-title')).toBeNull();
      expect(container.querySelector('div.card-title')).toBeTruthy();
    });

    it('with onTitleEdit, clicking the title swaps in an input', async () => {
      const onTitleEdit = vi.fn();
      const { container } = render(TaskCard, { task: makeTask(), onTitleEdit });
      const titleBtn = container.querySelector<HTMLButtonElement>('button.card-title');
      expect(titleBtn).toBeTruthy();
      await fireEvent.click(titleBtn!);
      expect(container.querySelector('[data-testid="task-title-input"]')).toBeTruthy();
    });

    it('committing a title edit (Enter) calls onTitleEdit with the trimmed value', async () => {
      const onTitleEdit = vi.fn();
      const { container } = render(TaskCard, { task: makeTask(), onTitleEdit });
      await fireEvent.click(container.querySelector<HTMLButtonElement>('button.card-title')!);
      const input = container.querySelector<HTMLInputElement>('[data-testid="task-title-input"]');
      await fireEvent.input(input!, { target: { value: '  Renamed  ' } });
      await fireEvent.keyDown(input!, { key: 'Enter' });
      expect(onTitleEdit).toHaveBeenCalledWith('Renamed');
    });

    it('Escape during title edit reverts without calling onTitleEdit', async () => {
      const onTitleEdit = vi.fn();
      const { container } = render(TaskCard, { task: makeTask(), onTitleEdit });
      await fireEvent.click(container.querySelector<HTMLButtonElement>('button.card-title')!);
      const input = container.querySelector<HTMLInputElement>('[data-testid="task-title-input"]');
      await fireEvent.input(input!, { target: { value: 'discarded' } });
      await fireEvent.keyDown(input!, { key: 'Escape' });
      expect(onTitleEdit).not.toHaveBeenCalled();
      expect(container.querySelector('[data-testid="task-title-input"]')).toBeNull();
    });

    it('blank title commits do not fire the handler (prototype parity, line 3050)', async () => {
      const onTitleEdit = vi.fn();
      const { container } = render(TaskCard, { task: makeTask(), onTitleEdit });
      await fireEvent.click(container.querySelector<HTMLButtonElement>('button.card-title')!);
      const input = container.querySelector<HTMLInputElement>('[data-testid="task-title-input"]');
      await fireEvent.input(input!, { target: { value: '   ' } });
      await fireEvent.keyDown(input!, { key: 'Enter' });
      expect(onTitleEdit).not.toHaveBeenCalled();
    });

    it('with onNoteEdit and no note, shows the "+ Add note" affordance', () => {
      const { container } = render(TaskCard, {
        task: makeTask({ note: '' }),
        onNoteEdit: vi.fn(),
      });
      expect(container.querySelector('[data-testid="task-note-add"]')).toBeTruthy();
    });

    it('without onNoteEdit and no note, hides the "+ Add note" affordance', () => {
      const { container } = render(TaskCard, { task: makeTask({ note: '' }) });
      expect(container.querySelector('[data-testid="task-note-add"]')).toBeNull();
    });

    it('committing a note edit with an empty string clears the note', async () => {
      const onNoteEdit = vi.fn();
      const { container } = render(TaskCard, {
        task: makeTask({ note: 'old' }),
        onNoteEdit,
      });
      const noteBtn = container.querySelector<HTMLButtonElement>('button.card-note');
      await fireEvent.click(noteBtn!);
      const input = container.querySelector<HTMLInputElement>('[data-testid="task-note-input"]');
      await fireEvent.input(input!, { target: { value: '' } });
      await fireEvent.keyDown(input!, { key: 'Enter' });
      expect(onNoteEdit).toHaveBeenCalledWith('');
    });

    it('without onDelete, no delete button is rendered', () => {
      const { container } = render(TaskCard, { task: makeTask() });
      expect(container.querySelector('[data-testid="task-delete"]')).toBeNull();
    });

    it('with onDelete, clicking the delete button calls onDelete', async () => {
      const onDelete = vi.fn();
      const { container } = render(TaskCard, { task: makeTask(), onDelete });
      const btn = container.querySelector<HTMLButtonElement>('[data-testid="task-delete"]');
      await fireEvent.click(btn!);
      expect(onDelete).toHaveBeenCalledOnce();
    });

    it('with onSubtaskAdd, shows the "+ Add subtask" affordance even when there are no subtasks', () => {
      const { container } = render(TaskCard, {
        task: makeTask({ subtasks: [] }),
        onSubtaskAdd: vi.fn(),
      });
      expect(container.querySelector('[data-testid="subtask-add"]')).toBeTruthy();
    });

    it('committing "+ Add subtask" appends a new subtask via onSubtaskAdd', async () => {
      const onSubtaskAdd = vi.fn();
      const { container } = render(TaskCard, {
        task: makeTask({ subtasks: [] }),
        onSubtaskAdd,
      });
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="subtask-add"]')!,
      );
      const input = container.querySelector<HTMLInputElement>('[data-testid="subtask-add-input"]');
      await fireEvent.input(input!, { target: { value: 'fresh sub' } });
      await fireEvent.keyDown(input!, { key: 'Enter' });
      expect(onSubtaskAdd).toHaveBeenCalledWith('fresh sub');
    });

    it('with onSubtaskEdit, clicking a subtask text swaps in an input', async () => {
      const onSubtaskEdit = vi.fn();
      const { container } = render(TaskCard, {
        task: makeTask({ subtasks: [{ text: 'first', checked: false }] }),
        onSubtaskEdit,
      });
      const btn = container.querySelector<HTMLButtonElement>('[data-testid="subtask-text-0"]');
      await fireEvent.click(btn!);
      const input = container.querySelector<HTMLInputElement>('[data-testid="subtask-input"]');
      expect(input).toBeTruthy();
      await fireEvent.input(input!, { target: { value: 'updated' } });
      await fireEvent.keyDown(input!, { key: 'Enter' });
      expect(onSubtaskEdit).toHaveBeenCalledWith(0, 'updated');
    });

    it('committing a subtask edit with empty value calls onSubtaskEdit with "" (delete signal)', async () => {
      const onSubtaskEdit = vi.fn();
      const { container } = render(TaskCard, {
        task: makeTask({ subtasks: [{ text: 'first', checked: false }] }),
        onSubtaskEdit,
      });
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="subtask-text-0"]')!,
      );
      const input = container.querySelector<HTMLInputElement>('[data-testid="subtask-input"]');
      await fireEvent.input(input!, { target: { value: '' } });
      await fireEvent.keyDown(input!, { key: 'Enter' });
      expect(onSubtaskEdit).toHaveBeenCalledWith(0, '');
    });

    it('with onSubtaskToggle, clicking a subtask checkbox calls onSubtaskToggle', async () => {
      const onSubtaskToggle = vi.fn();
      const { container } = render(TaskCard, {
        task: makeTask({
          subtasks: [
            { text: 'one', checked: false },
            { text: 'two', checked: false },
          ],
        }),
        onSubtaskToggle,
      });
      const cbs = container.querySelectorAll<HTMLInputElement>(
        '[data-testid^="subtask-checkbox-"]',
      );
      await fireEvent.click(cbs[1]!);
      expect(onSubtaskToggle).toHaveBeenCalledWith(1);
    });

    it('without onFullEdit, no pencil button is rendered', () => {
      const { container } = render(TaskCard, { task: makeTask() });
      expect(container.querySelector('[data-testid="task-full-edit"]')).toBeNull();
    });

    it('with onFullEdit, clicking the pencil button calls onFullEdit (slice 6e)', async () => {
      const onFullEdit = vi.fn();
      const { container } = render(TaskCard, { task: makeTask(), onFullEdit });
      const btn = container.querySelector<HTMLButtonElement>('[data-testid="task-full-edit"]');
      expect(btn).toBeTruthy();
      await fireEvent.click(btn!);
      expect(onFullEdit).toHaveBeenCalledOnce();
    });

    it('without onUnresolve, no unresolve (↺) button is rendered', () => {
      const { container } = render(TaskCard, { task: makeTask() });
      expect(container.querySelector('[data-testid="task-unresolve"]')).toBeNull();
    });

    it('with onUnresolve, clicking the ↺ button calls onUnresolve (slice 6g)', async () => {
      const onUnresolve = vi.fn();
      const { container } = render(TaskCard, { task: makeTask({ checked: true }), onUnresolve });
      const btn = container.querySelector<HTMLButtonElement>('[data-testid="task-unresolve"]');
      expect(btn).toBeTruthy();
      await fireEvent.click(btn!);
      expect(onUnresolve).toHaveBeenCalledOnce();
    });

    it('with only onUnresolve, no delete / pencil / resolve affordances render (archived card path)', () => {
      const { container } = render(TaskCard, {
        task: makeTask({ checked: true }),
        onUnresolve: () => {},
      });
      expect(container.querySelector('[data-testid="task-delete"]')).toBeNull();
      expect(container.querySelector('[data-testid="task-full-edit"]')).toBeNull();
      expect(container.querySelector('[data-testid="task-unresolve"]')).toBeTruthy();
      // Checkbox stays presentation-only (no onResolve).
      const checkbox = container.querySelector<HTMLInputElement>('.card-checkbox');
      expect(checkbox?.classList.contains('interactive')).toBe(false);
    });
  });
});
