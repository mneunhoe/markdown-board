import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
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
});
