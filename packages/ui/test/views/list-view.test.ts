import { fireEvent, render } from '@testing-library/svelte';
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

function makeVault(sections: Section[] = []): Vault {
  return { prelude: '', sections };
}

describe('ListView', () => {
  it('renders one list-section per vault section', () => {
    const vault = makeVault([makeSection('a', 'Active'), makeSection('d', 'Done')]);
    const { container } = render(ListView, { vault });
    expect(container.querySelectorAll('.list-section')).toHaveLength(2);
  });

  it('renders the section name and task count in the header', () => {
    const vault = makeVault([
      makeSection('a', 'Active', [makeTask({ id: '1' }), makeTask({ id: '2' })]),
    ]);
    const { container } = render(ListView, { vault });
    expect(container.querySelector('.section-title')?.textContent?.trim()).toBe('Active');
    expect(container.querySelector('.count')?.textContent?.trim()).toBe('2');
  });

  it('exposes data-section-id on each section block', () => {
    const vault = makeVault([makeSection('active', 'Active'), makeSection('done', 'Done')]);
    const { container } = render(ListView, { vault });
    const ids = [...container.querySelectorAll('.list-section')].map((n) =>
      n.getAttribute('data-section-id'),
    );
    expect(ids).toEqual(['active', 'done']);
  });

  it('renders TaskCard atoms in order under their section', () => {
    const vault = makeVault([
      makeSection('a', 'Active', [
        makeTask({ id: 't1', title: 'first' }),
        makeTask({ id: 't2', title: 'second' }),
      ]),
    ]);
    const { container } = render(ListView, { vault });
    const titles = [...container.querySelectorAll('.list-section .card-title')].map((n) =>
      n.textContent?.trim(),
    );
    expect(titles).toEqual(['first', 'second']);
  });

  it('renders empty sections as headers with a zero count', () => {
    const vault = makeVault([makeSection('a', 'Active')]);
    const { container } = render(ListView, { vault });
    expect(container.querySelector('.list-section')).not.toBeNull();
    expect(container.querySelector('.count')?.textContent?.trim()).toBe('0');
    expect(container.querySelector('.task-card')).toBeNull();
  });

  it('renders EmptyState when there are no sections', () => {
    const { container } = render(ListView, { vault: makeVault([]) });
    expect(container.querySelector('.empty-state')).not.toBeNull();
    expect(container.querySelector('.list-section')).toBeNull();
  });

  describe('onResolve', () => {
    it('forwards onResolve to every TaskCard checkbox with task + section ids', async () => {
      const onResolve = vi.fn();
      const vault = makeVault([
        makeSection('active', 'Active', [makeTask({ id: 't1', title: 'one' })]),
        makeSection('done', 'Done', [makeTask({ id: 't2', title: 'two' })]),
      ]);
      const { container } = render(ListView, { vault, onResolve });
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
      const { container } = render(ListView, { vault });
      const checkbox = container.querySelector<HTMLInputElement>('.card-checkbox');
      expect(checkbox?.tabIndex).toBe(-1);
      expect(checkbox?.classList.contains('interactive')).toBe(false);
    });
  });

  describe('onSectionAdd (slice 6i)', () => {
    it('without onSectionAdd, no "+ Add Section" affordance is rendered', () => {
      const vault = makeVault([makeSection('a', 'Active')]);
      const { container } = render(ListView, { vault });
      expect(container.querySelector('[data-testid="list-add-section"]')).toBeNull();
    });

    it('with onSectionAdd, clicking the button swaps in an input; Enter commits', async () => {
      const onSectionAdd = vi.fn();
      const vault = makeVault([makeSection('a', 'Active')]);
      const { container } = render(ListView, { vault, onSectionAdd });
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="list-add-section"]')!,
      );
      const input = container.querySelector<HTMLInputElement>(
        '[data-testid="list-add-section-input"]',
      );
      await fireEvent.input(input!, { target: { value: 'Doing' } });
      await fireEvent.keyDown(input!, { key: 'Enter' });
      expect(onSectionAdd).toHaveBeenCalledWith('Doing');
    });
  });
});
