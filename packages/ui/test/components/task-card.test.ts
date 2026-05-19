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
});
