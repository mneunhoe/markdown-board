import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import OverviewView from '../../src/views/OverviewView.svelte';
import type { LibraryDoc, ParsedDashboard, Section, Task, Vault } from '@markdown-board/core';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'tid-' + (overrides.title ?? Math.random().toString()),
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

function makeDoc(overrides: Partial<LibraryDoc> = {}): LibraryDoc {
  return {
    title: 'Untitled',
    fields: {},
    sections: {},
    tables: [],
    rawContent: '',
    path: '',
    ...overrides,
  };
}

function statValue(container: Element, label: string): string | undefined {
  const stats = [...container.querySelectorAll('.stat')];
  const match = stats.find((s) => s.querySelector('.stat-label')?.textContent?.trim() === label);
  return match?.querySelector('.stat-value')?.textContent?.trim();
}

describe('OverviewView', () => {
  it('renders EmptyState when vault is empty and no library docs', () => {
    const { container } = render(OverviewView, { vault: makeVault([]) });
    expect(container.querySelector('.empty-state')).not.toBeNull();
    expect(container.querySelector('.overview-view')).toBeNull();
  });

  it('renders stats when at least one task exists', () => {
    const vault = makeVault([makeSection('a', 'Active', [makeTask()])]);
    const { container } = render(OverviewView, { vault });
    expect(container.querySelector('.empty-state')).toBeNull();
    expect(container.querySelector('.stats')).not.toBeNull();
  });

  it('renders stats when only library docs exist (no tasks)', () => {
    const { container } = render(OverviewView, {
      vault: makeVault([]),
      libraryDocs: [makeDoc()],
    });
    expect(container.querySelector('.empty-state')).toBeNull();
    expect(statValue(container, 'library')).toBe('1');
    expect(statValue(container, 'tasks')).toBe('0');
  });

  it('counts total tasks across all sections', () => {
    const vault = makeVault([
      makeSection('a', 'Active', [makeTask({ id: '1' }), makeTask({ id: '2' })]),
      makeSection('d', 'Done', [makeTask({ id: '3' })]),
    ]);
    const { container } = render(OverviewView, { vault });
    expect(statValue(container, 'tasks')).toBe('3');
  });

  it('splits open vs checked task counts', () => {
    const vault = makeVault([
      makeSection('a', 'Active', [
        makeTask({ id: '1', checked: false }),
        makeTask({ id: '2', checked: true }),
        makeTask({ id: '3', checked: true }),
      ]),
    ]);
    const { container } = render(OverviewView, { vault });
    expect(statValue(container, 'open')).toBe('1');
    expect(statValue(container, 'checked')).toBe('2');
  });

  it('renders a per-section breakdown in vault order', () => {
    const vault = makeVault([
      makeSection('a', 'Active', [makeTask({ id: '1' }), makeTask({ id: '2' })]),
      makeSection('d', 'Done', [makeTask({ id: '3' })]),
    ]);
    const { container } = render(OverviewView, { vault });
    const sectionBreakdown = [...container.querySelectorAll('.breakdown')].find(
      (n) => n.querySelector('h3')?.textContent === 'By section',
    );
    expect(sectionBreakdown).not.toBeUndefined();
    const labels = [...(sectionBreakdown?.querySelectorAll('.breakdown-label') ?? [])].map((n) =>
      n.textContent?.trim(),
    );
    const values = [...(sectionBreakdown?.querySelectorAll('.breakdown-value') ?? [])].map((n) =>
      n.textContent?.trim(),
    );
    expect(labels).toEqual(['Active', 'Done']);
    expect(values).toEqual(['2', '1']);
  });

  it('omits the priority breakdown when no task has a priority', () => {
    const vault = makeVault([makeSection('a', 'Active', [makeTask({ id: '1' })])]);
    const { container } = render(OverviewView, { vault });
    const headings = [...container.querySelectorAll('.breakdown h3')].map((n) =>
      n.textContent?.trim(),
    );
    expect(headings).not.toContain('By priority');
  });

  it('renders the priority breakdown with blocker / high / low counts', () => {
    const vault = makeVault([
      makeSection('a', 'Active', [
        makeTask({ id: '1', priority: 'blocker' }),
        makeTask({ id: '2', priority: 'high' }),
        makeTask({ id: '3', priority: 'high' }),
        makeTask({ id: '4', priority: 'low' }),
      ]),
    ]);
    const { container } = render(OverviewView, { vault });
    const priorityBreakdown = [...container.querySelectorAll('.breakdown')].find(
      (n) => n.querySelector('h3')?.textContent === 'By priority',
    );
    expect(priorityBreakdown).not.toBeUndefined();
    const values = [...(priorityBreakdown?.querySelectorAll('.breakdown-value') ?? [])].map((n) =>
      n.textContent?.trim(),
    );
    expect(values).toEqual(['1', '2', '1']);
  });

  it('omits the day breakdown when no task has a day', () => {
    const vault = makeVault([makeSection('a', 'Active', [makeTask({ id: '1' })])]);
    const { container } = render(OverviewView, { vault });
    const headings = [...container.querySelectorAll('.breakdown h3')].map((n) =>
      n.textContent?.trim(),
    );
    expect(headings).not.toContain('By day');
  });

  it('renders the day breakdown with all seven days in week order', () => {
    const vault = makeVault([
      makeSection('a', 'Active', [
        makeTask({ id: '1', day: 'Mon' }),
        makeTask({ id: '2', day: 'Wed' }),
        makeTask({ id: '3', day: 'Wed' }),
      ]),
    ]);
    const { container } = render(OverviewView, { vault });
    const dayBreakdown = [...container.querySelectorAll('.breakdown')].find(
      (n) => n.querySelector('h3')?.textContent === 'By day',
    );
    expect(dayBreakdown).not.toBeUndefined();
    const labels = [...(dayBreakdown?.querySelectorAll('.breakdown-label') ?? [])].map((n) =>
      n.textContent?.trim(),
    );
    expect(labels).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    const values = [...(dayBreakdown?.querySelectorAll('.breakdown-value') ?? [])].map((n) =>
      n.textContent?.trim(),
    );
    expect(values).toEqual(['1', '0', '2', '0', '0', '0', '0']);
  });

  it('counts library docs separately from tasks', () => {
    const vault = makeVault([makeSection('a', 'Active', [makeTask({ id: '1' })])]);
    const { container } = render(OverviewView, {
      vault,
      libraryDocs: [makeDoc(), makeDoc(), makeDoc()],
    });
    expect(statValue(container, 'library')).toBe('3');
    expect(statValue(container, 'tasks')).toBe('1');
  });

  describe('DASHBOARD.md', () => {
    function dash(overrides: Partial<ParsedDashboard> = {}): ParsedDashboard {
      return { body: '', config: {}, errors: [], ...overrides };
    }

    it('renders the DASHBOARD.md body as pinned notes', () => {
      const vault = makeVault([makeSection('a', 'Active', [makeTask()])]);
      const { container } = render(OverviewView, {
        vault,
        dashboard: dash({ body: '# Dashboard\n\n## Today\nremember the milk' }),
      });
      const notes = container.querySelector('[data-testid="pinned-notes"]');
      expect(notes).not.toBeNull();
      expect(notes?.textContent).toContain('remember the milk');
    });

    it('renders a custom stat card with the matching task count', () => {
      const vault = makeVault([
        makeSection('a', 'Active', [
          makeTask({ id: '1', priority: 'blocker' }),
          makeTask({ id: '2', priority: 'blocker' }),
          makeTask({ id: '3', priority: 'high' }),
        ]),
      ]);
      const { container } = render(OverviewView, {
        vault,
        dashboard: dash({
          config: { stats: [{ label: 'Blockers', where: { priority: 'blocker' } }] },
        }),
      });
      expect(statValue(container, 'Blockers')).toBe('2');
    });

    it('filters and orders built-in cards via builtins.cards', () => {
      const vault = makeVault([makeSection('a', 'Active', [makeTask()])]);
      const { container } = render(OverviewView, {
        vault,
        dashboard: dash({ config: { builtins: { cards: ['open'] } } }),
      });
      const labels = [...container.querySelectorAll('.stats .stat-label')].map((n) =>
        n.textContent?.trim(),
      );
      expect(labels).toEqual(['open']);
    });

    it('filters breakdowns via builtins.breakdowns', () => {
      const vault = makeVault([
        makeSection('a', 'Active', [makeTask({ id: '1', priority: 'high', day: 'Mon' })]),
      ]);
      const { container } = render(OverviewView, {
        vault,
        dashboard: dash({ config: { builtins: { breakdowns: ['day'] } } }),
      });
      const headings = [...container.querySelectorAll('.breakdown h3')].map((n) =>
        n.textContent?.trim(),
      );
      expect(headings).toEqual(['By day']);
    });

    it('shows an error banner when the config has problems', () => {
      const { container } = render(OverviewView, {
        vault: makeVault([]),
        dashboard: dash({
          errors: ['builtins.cards may only contain: total, open, checked, library.'],
        }),
      });
      expect(container.querySelector('[data-testid="dashboard-errors"]')).not.toBeNull();
    });
  });
});
