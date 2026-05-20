import type { PluginContext, Task, Vault } from '@markdown-board/plugin-api';
import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setApi } from '../src/context.js';
import WeekBoardHost from './fixtures/WeekBoardHost.svelte';

function task(over: Partial<Task> = {}): Task {
  return {
    id: Math.random().toString(36).slice(2),
    checked: false,
    title: 'T',
    note: '',
    resolution: '',
    priority: null,
    project: null,
    day: null,
    pomodoros: 0,
    subtasks: [],
    ...over,
  };
}

function vault(): Vault {
  return {
    prelude: '',
    sections: [
      {
        id: 's1',
        name: 'Active',
        tasks: [task({ title: 'Mon thing', day: 'Mon' }), task({ title: 'Undated' })],
      },
      { id: 's2', name: 'Backlog', tasks: [task({ title: 'Fri thing', day: 'Fri' })] },
    ],
  };
}

afterEach(() => setApi(null));

describe('WeekBoard', () => {
  it('renders seven day columns', () => {
    const { container } = render(WeekBoardHost, { vault: vault() });
    expect(container.querySelectorAll('.week-column')).toHaveLength(7);
    expect(container.querySelector('[data-day="Mon"]')).toBeTruthy();
    expect(container.querySelector('[data-day="Sun"]')).toBeTruthy();
  });

  it('places dated tasks in their day column and shows a count', () => {
    const { container } = render(WeekBoardHost, { vault: vault() });
    const mon = container.querySelector('[data-day="Mon"]')!;
    expect(mon.textContent).toContain('Mon thing');
    expect(mon.querySelector('.week-count')?.textContent).toBe('1');
    const fri = container.querySelector('[data-day="Fri"]')!;
    expect(fri.textContent).toContain('Fri thing');
  });

  it('does not show undated tasks anywhere', () => {
    const { container } = render(WeekBoardHost, { vault: vault() });
    expect(container.querySelector('.week-board')?.textContent).not.toContain('Undated');
  });

  it('drag-dropping a card onto another day sets the task day via the api', async () => {
    const mutate = vi.fn((ref: { taskId: string; sectionId: string }, fn: (t: Task) => void) => {
      // Apply against the live vault task so the assertion can inspect it.
      const t = data.sections.flatMap((s) => s.tasks).find((x) => x.id === ref.taskId);
      if (t) fn(t);
      return Boolean(t);
    });
    setApi({ tasks: { find: () => null, mutate } } as unknown as PluginContext);
    const data = vault();
    const { container } = render(WeekBoardHost, { vault: data });

    const card = container.querySelector<HTMLElement>('[data-day="Mon"] .week-card')!;
    const friColumn = container.querySelector<HTMLElement>('[data-day="Fri"]')!;
    const dataTransfer = {
      data: new Map<string, string>(),
      setData(type: string, val: string) {
        this.data.set(type, val);
      },
      getData(type: string) {
        return this.data.get(type) ?? '';
      },
      effectAllowed: '',
      dropEffect: '',
    };

    await fireEvent.dragStart(card, { dataTransfer });
    await fireEvent.dragOver(friColumn, { dataTransfer });
    await fireEvent.drop(friColumn, { dataTransfer });

    expect(mutate).toHaveBeenCalledOnce();
    const monTask = data.sections[0]!.tasks.find((t) => t.title === 'Mon thing')!;
    expect(monTask.day).toBe('Fri');
  });
});
