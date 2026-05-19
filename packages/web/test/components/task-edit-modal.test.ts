import type { Task } from '@markdown-board/core';
import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import TaskEditModal from '../../src/components/TaskEditModal.svelte';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'abc12345',
    checked: false,
    title: 'Write the spec',
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

describe('TaskEditModal (slice 6e)', () => {
  it('renders nothing when task is null', () => {
    const { container } = render(TaskEditModal, {
      task: null,
      suggestions: [],
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });
    expect(container.querySelector('[data-testid="task-edit-title"]')).toBeNull();
  });

  it('pre-fills the form fields from the supplied task', () => {
    const { container } = render(TaskEditModal, {
      task: makeTask({
        title: 'Write the spec',
        note: 'see backlog',
        priority: 'high',
        project: 'PSD_GAN',
        day: 'Mon',
        pomodoros: 2,
        resolution: '',
        subtasks: [{ text: 'first', checked: false }],
      }),
      suggestions: ['PSD_GAN'],
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });
    expect(
      container.querySelector<HTMLInputElement>('[data-testid="task-edit-title"]')?.value,
    ).toBe('Write the spec');
    expect(
      container.querySelector<HTMLTextAreaElement>('[data-testid="task-edit-note"]')?.value,
    ).toBe('see backlog');
    expect(
      container.querySelector<HTMLInputElement>('[data-testid="task-edit-project"]')?.value,
    ).toBe('PSD_GAN');
    expect(
      container
        .querySelector<HTMLButtonElement>('[data-testid="task-edit-day-Mon"]')
        ?.classList.contains('active'),
    ).toBe(true);
    expect(
      container
        .querySelector<HTMLButtonElement>('[data-testid="task-edit-priority-high"]')
        ?.classList.contains('active'),
    ).toBe(true);
    expect(
      container.querySelector<HTMLInputElement>('[data-testid="task-edit-pomodoros"]')?.value,
    ).toBe('2');
    expect(
      container.querySelector<HTMLInputElement>('[data-testid="task-edit-subtask-text-0"]')?.value,
    ).toBe('first');
  });

  it('Save (form mode) calls onConfirm with the edited Task', async () => {
    const onConfirm = vi.fn();
    const { container } = render(TaskEditModal, {
      task: makeTask({ title: 'Old' }),
      suggestions: [],
      onConfirm,
      onCancel: vi.fn(),
    });
    const titleInput = container.querySelector<HTMLInputElement>('[data-testid="task-edit-title"]');
    await fireEvent.input(titleInput!, { target: { value: '  New  ' } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="task-edit-priority-blocker"]')!,
    );
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="task-edit-day-Wed"]')!,
    );
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="task-edit-save"]')!,
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const arg = onConfirm.mock.calls[0]?.[0] as Task;
    expect(arg.title).toBe('New');
    expect(arg.priority).toBe('blocker');
    expect(arg.day).toBe('Wed');
  });

  it('Save with empty title (after trim) does not fire onConfirm (form mode)', async () => {
    const onConfirm = vi.fn();
    const { container } = render(TaskEditModal, {
      task: makeTask(),
      suggestions: [],
      onConfirm,
      onCancel: vi.fn(),
    });
    const titleInput = container.querySelector<HTMLInputElement>('[data-testid="task-edit-title"]');
    await fireEvent.input(titleInput!, { target: { value: '   ' } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="task-edit-save"]')!,
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('+ Add subtask appends a row that can be typed into and saved', async () => {
    const onConfirm = vi.fn();
    const { container } = render(TaskEditModal, {
      task: makeTask({ title: 'T' }),
      suggestions: [],
      onConfirm,
      onCancel: vi.fn(),
    });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="task-edit-subtask-add"]')!,
    );
    const newSubInput = container.querySelector<HTMLInputElement>(
      '[data-testid="task-edit-subtask-text-0"]',
    );
    await fireEvent.input(newSubInput!, { target: { value: 'fresh' } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="task-edit-save"]')!,
    );
    const arg = onConfirm.mock.calls[0]?.[0] as Task;
    expect(arg.subtasks).toEqual([{ text: 'fresh', checked: false }]);
  });

  it('subtask delete row removes the subtask before save', async () => {
    const onConfirm = vi.fn();
    const { container } = render(TaskEditModal, {
      task: makeTask({
        title: 'T',
        subtasks: [
          { text: 'a', checked: false },
          { text: 'b', checked: false },
        ],
      }),
      suggestions: [],
      onConfirm,
      onCancel: vi.fn(),
    });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="task-edit-subtask-del-0"]')!,
    );
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="task-edit-save"]')!,
    );
    const arg = onConfirm.mock.calls[0]?.[0] as Task;
    expect(arg.subtasks).toEqual([{ text: 'b', checked: false }]);
  });

  it('switching to Raw markdown shows a textarea pre-filled from the form state', async () => {
    const { container } = render(TaskEditModal, {
      task: makeTask({ title: 'Write the spec', priority: 'blocker' }),
      suggestions: [],
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="task-edit-tab-raw"]')!,
    );
    const raw = container.querySelector<HTMLTextAreaElement>('[data-testid="task-edit-raw"]');
    expect(raw).toBeTruthy();
    expect(raw?.value).toContain('- [ ] **[P0] Write the spec**');
  });

  it('Save (raw mode) parses the textarea content and calls onConfirm', async () => {
    const onConfirm = vi.fn();
    const { container } = render(TaskEditModal, {
      task: makeTask({ title: 'Old' }),
      suggestions: [],
      onConfirm,
      onCancel: vi.fn(),
    });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="task-edit-tab-raw"]')!,
    );
    const raw = container.querySelector<HTMLTextAreaElement>('[data-testid="task-edit-raw"]');
    await fireEvent.input(raw!, {
      target: { value: '- [ ] **[P1] [Wed] New title**\n  - [ ] subA' },
    });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="task-edit-save"]')!,
    );
    const arg = onConfirm.mock.calls[0]?.[0] as Task;
    expect(arg.title).toBe('New title');
    expect(arg.priority).toBe('high');
    expect(arg.day).toBe('Wed');
    expect(arg.subtasks).toEqual([{ text: 'subA', checked: false }]);
  });

  it('Save (raw mode) with unparseable input surfaces the error and does not call onConfirm', async () => {
    const onConfirm = vi.fn();
    const { container } = render(TaskEditModal, {
      task: makeTask(),
      suggestions: [],
      onConfirm,
      onCancel: vi.fn(),
    });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="task-edit-tab-raw"]')!,
    );
    const raw = container.querySelector<HTMLTextAreaElement>('[data-testid="task-edit-raw"]');
    await fireEvent.input(raw!, { target: { value: 'not a task line' } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="task-edit-save"]')!,
    );
    expect(onConfirm).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="task-edit-raw-error"]')).toBeTruthy();
  });

  it('Cancel calls onCancel without calling onConfirm', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { container } = render(TaskEditModal, {
      task: makeTask(),
      suggestions: [],
      onConfirm,
      onCancel,
    });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="task-edit-cancel"]')!,
    );
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
