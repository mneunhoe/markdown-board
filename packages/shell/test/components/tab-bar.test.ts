import { render, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import TabBar from '../../src/components/TabBar.svelte';

describe('TabBar', () => {
  it('renders four tabs in fixed order', () => {
    const { container } = render(TabBar, { active: 'board', onSelect: () => {} });
    const labels = Array.from(container.querySelectorAll<HTMLButtonElement>('.tab')).map((b) =>
      b.textContent?.trim(),
    );
    expect(labels).toEqual(['Board', 'List', 'Library', 'Overview']);
  });

  it('marks the active tab with aria-selected=true', () => {
    const { container } = render(TabBar, { active: 'library', onSelect: () => {} });
    const active = container.querySelector<HTMLButtonElement>('.tab.active');
    expect(active?.getAttribute('data-tab')).toBe('library');
    expect(active?.getAttribute('aria-selected')).toBe('true');
  });

  it('marks inactive tabs with aria-selected=false', () => {
    const { container } = render(TabBar, { active: 'board', onSelect: () => {} });
    const tabs = container.querySelectorAll<HTMLButtonElement>('.tab');
    const inactive = Array.from(tabs).filter((t) => !t.classList.contains('active'));
    for (const tab of inactive) {
      expect(tab.getAttribute('aria-selected')).toBe('false');
    }
  });

  it('calls onSelect with the clicked tab key', async () => {
    const onSelect = vi.fn();
    const { container } = render(TabBar, { active: 'board', onSelect });
    const libraryBtn = container.querySelector<HTMLButtonElement>('[data-tab="library"]');
    expect(libraryBtn).toBeTruthy();
    await fireEvent.click(libraryBtn!);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith('library');
  });

  it('exposes role=tablist and role=tab for screen readers', () => {
    const { container } = render(TabBar, { active: 'board', onSelect: () => {} });
    expect(container.querySelector('[role=tablist]')).toBeTruthy();
    expect(container.querySelectorAll('[role=tab]')).toHaveLength(4);
  });
});
