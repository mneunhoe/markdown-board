import type { Task } from '@markdown-board/core';
import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import ArchivedTasksExpander from '../../src/components/ArchivedTasksExpander.svelte';
import type { ArchivedTaskRef } from '../../src/lib/edit.js';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'abc12345',
    checked: true,
    title: 'Old task',
    note: '',
    priority: null,
    project: null,
    day: null,
    pomodoros: 0,
    subtasks: [],
    ...overrides,
  };
}

function makeRef(overrides: Partial<ArchivedTaskRef> = {}): ArchivedTaskRef {
  return {
    task: makeTask(),
    archivedAt: '2026-05-18 10:43',
    ...overrides,
  };
}

describe('ArchivedTasksExpander (slice 6g-2)', () => {
  it('renders nothing when tasks is empty', () => {
    const { container } = render(ArchivedTasksExpander, { tasks: [] });
    expect(container.querySelector('[data-testid="archived-expander"]')).toBeNull();
  });

  it('renders an "Archived (N)" toggle row when tasks are present', () => {
    const { container } = render(ArchivedTasksExpander, {
      tasks: [makeRef(), makeRef({ task: makeTask({ id: 'b' }) })],
    });
    const toggle = container.querySelector<HTMLButtonElement>('[data-testid="archived-toggle"]');
    expect(toggle).toBeTruthy();
    expect(toggle?.textContent).toContain('Archived (2)');
    // Collapsed by default.
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('[data-testid="archived-list"]')).toBeNull();
  });

  it('clicking the toggle expands the list', async () => {
    const { container } = render(ArchivedTasksExpander, {
      tasks: [makeRef({ task: makeTask({ id: 'a', title: 'A' }) })],
    });
    const toggle = container.querySelector<HTMLButtonElement>('[data-testid="archived-toggle"]');
    await fireEvent.click(toggle!);
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('[data-testid="archived-list"]')).toBeTruthy();
    expect(container.textContent).toContain('A');
  });

  it('subtitles each archived row with the archivedAt timestamp', async () => {
    const { container } = render(ArchivedTasksExpander, {
      tasks: [makeRef({ archivedAt: '2026-01-15 14:30' })],
    });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="archived-toggle"]')!,
    );
    const meta = container.querySelector('[data-testid="archived-meta"]');
    expect(meta?.textContent?.trim()).toBe('Archived 2026-01-15 14:30');
  });

  it('without onUnresolve, archived cards have no ↺ button', async () => {
    const { container } = render(ArchivedTasksExpander, { tasks: [makeRef()] });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="archived-toggle"]')!,
    );
    expect(container.querySelector('[data-testid="task-unresolve"]')).toBeNull();
  });

  it('with onUnresolve, clicking ↺ calls back with the task id', async () => {
    const onUnresolve = vi.fn();
    const { container } = render(ArchivedTasksExpander, {
      tasks: [makeRef({ task: makeTask({ id: 'abc' }) })],
      onUnresolve,
    });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="archived-toggle"]')!,
    );
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="task-unresolve"]')!,
    );
    expect(onUnresolve).toHaveBeenCalledWith('abc');
  });

  it('archived cards stay read-only — no edit / delete / pencil / resolve affordances', async () => {
    const { container } = render(ArchivedTasksExpander, {
      tasks: [makeRef()],
      onUnresolve: () => {},
    });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="archived-toggle"]')!,
    );
    expect(container.querySelector('[data-testid="task-delete"]')).toBeNull();
    expect(container.querySelector('[data-testid="task-full-edit"]')).toBeNull();
    expect(container.querySelector('button.card-title')).toBeNull();
    expect(container.querySelector('[data-testid="task-note-add"]')).toBeNull();
    const checkbox = container.querySelector<HTMLInputElement>('.card-checkbox');
    expect(checkbox?.classList.contains('interactive')).toBe(false);
  });

  it('rendering many tasks keeps order matching the input array', async () => {
    const tasks: ArchivedTaskRef[] = [
      makeRef({ task: makeTask({ id: 'a', title: 'Alpha' }) }),
      makeRef({ task: makeTask({ id: 'b', title: 'Bravo' }) }),
      makeRef({ task: makeTask({ id: 'c', title: 'Charlie' }) }),
    ];
    const { container } = render(ArchivedTasksExpander, { tasks });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="archived-toggle"]')!,
    );
    const titles = [...container.querySelectorAll('.card-title')].map((n) => n.textContent?.trim());
    expect(titles).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });
});
