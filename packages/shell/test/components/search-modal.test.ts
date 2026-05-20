import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SearchModal from '../../src/components/SearchModal.svelte';
import type { SearchResult } from '../../src/lib/search.js';

const sampleResults: SearchResult[] = [
  {
    id: 'task:active:t1',
    type: 'task',
    title: 'Wire the desktop shell',
    context: 'Active',
    snippet: 'Tauri plumbing',
    taskId: 't1',
    sectionId: 'active',
    path: '',
  },
  {
    id: 'lib:library/alpha.md',
    type: 'library',
    title: 'Alpha Project',
    context: 'Library',
    snippet: 'logo guidelines',
    taskId: '',
    sectionId: '',
    path: 'library/alpha.md',
  },
];

function searchStub(query: string): SearchResult[] {
  if (query.trim() === '') return [];
  return sampleResults.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()));
}

describe('SearchModal', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is hidden when open is false', () => {
    const { container } = render(SearchModal, {
      open: false,
      search: searchStub,
      onJump: () => {},
      onClose: () => {},
    });
    expect(container.querySelector('[data-testid="search-input"]')).toBeNull();
  });

  it('shows a hint and no results before typing', () => {
    const { container } = render(SearchModal, {
      open: true,
      search: searchStub,
      onJump: () => {},
      onClose: () => {},
    });
    expect(container.querySelector('[data-testid="search-hint"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-testid="search-item"]')).toHaveLength(0);
  });

  it('renders results for a query', async () => {
    const { container } = render(SearchModal, {
      open: true,
      search: searchStub,
      onJump: () => {},
      onClose: () => {},
    });
    const input = container.querySelector<HTMLInputElement>('[data-testid="search-input"]')!;
    await fireEvent.input(input, { target: { value: 'alpha' } });
    const items = container.querySelectorAll('[data-testid="search-item"]');
    expect(items).toHaveLength(1);
    expect(items[0]?.textContent).toContain('Alpha Project');
  });

  it('shows an empty message when nothing matches', async () => {
    const { container } = render(SearchModal, {
      open: true,
      search: searchStub,
      onJump: () => {},
      onClose: () => {},
    });
    const input = container.querySelector<HTMLInputElement>('[data-testid="search-input"]')!;
    await fireEvent.input(input, { target: { value: 'zzz' } });
    expect(container.querySelector('[data-testid="search-empty"]')).toBeTruthy();
  });

  it('jumps to a result and closes on click', async () => {
    const onJump = vi.fn();
    const onClose = vi.fn();
    const { container } = render(SearchModal, {
      open: true,
      search: searchStub,
      onJump,
      onClose,
    });
    const input = container.querySelector<HTMLInputElement>('[data-testid="search-input"]')!;
    await fireEvent.input(input, { target: { value: 'desktop' } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="search-item"]')!,
    );
    expect(onClose).toHaveBeenCalledOnce();
    expect(onJump).toHaveBeenCalledWith(expect.objectContaining({ taskId: 't1' }));
  });

  it('jumps to the selected result on Enter', async () => {
    const onJump = vi.fn();
    const { container } = render(SearchModal, {
      open: true,
      search: searchStub,
      onJump,
      onClose: () => {},
    });
    const input = container.querySelector<HTMLInputElement>('[data-testid="search-input"]')!;
    await fireEvent.input(input, { target: { value: 'desktop' } });
    const overlay = container.querySelector<HTMLElement>('[role="dialog"]')!;
    await fireEvent.keyDown(overlay, { key: 'Enter' });
    expect(onJump).toHaveBeenCalledWith(expect.objectContaining({ taskId: 't1' }));
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    const { container } = render(SearchModal, {
      open: true,
      search: searchStub,
      onJump: () => {},
      onClose,
    });
    const overlay = container.querySelector<HTMLElement>('[role="dialog"]')!;
    await fireEvent.keyDown(overlay, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
