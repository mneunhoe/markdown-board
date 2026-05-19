import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Column from '../../src/components/Column.svelte';

describe('Column', () => {
  it('renders the section name in the header', () => {
    const { container } = render(Column, { name: 'Active', count: 0 });
    expect(container.querySelector('.column-title')?.textContent?.trim()).toBe('Active');
  });

  it('renders the task count in the badge', () => {
    const { container } = render(Column, { name: 'Active', count: 7 });
    expect(container.querySelector('.count')?.textContent?.trim()).toBe('7');
  });

  it('exposes an aria-label naming the section', () => {
    const { container } = render(Column, { name: 'Doing', count: 2 });
    expect(container.querySelector('.column')?.getAttribute('aria-label')).toBe('Section Doing');
  });

  it('renders zero count as 0, not blank', () => {
    const { container } = render(Column, { name: 'Done', count: 0 });
    expect(container.querySelector('.count')?.textContent?.trim()).toBe('0');
  });

  it('renders the count badge with an accessible label', () => {
    const { container } = render(Column, { name: 'Active', count: 3 });
    expect(container.querySelector('.count')?.getAttribute('aria-label')).toBe('3 tasks');
  });

  it('has an empty cards container ready for children', () => {
    const { container } = render(Column, { name: 'Active', count: 0 });
    const cards = container.querySelector('.cards');
    expect(cards).not.toBeNull();
    expect(cards?.children).toHaveLength(0);
  });

  describe('onRename (slice 6c)', () => {
    it('without onRename, the title is a plain span', () => {
      const { container } = render(Column, { name: 'Active', count: 0 });
      expect(container.querySelector('button.column-title')).toBeNull();
      expect(container.querySelector('span.column-title')).toBeTruthy();
    });

    it('with onRename, clicking the title swaps in an input', async () => {
      const { container } = render(Column, { name: 'Active', count: 0, onRename: () => {} });
      const btn = container.querySelector<HTMLButtonElement>('[data-testid="column-title"]');
      expect(btn).toBeTruthy();
      await fireEvent.click(btn!);
      expect(container.querySelector('[data-testid="column-rename-input"]')).toBeTruthy();
    });

    it('committing a rename with Enter calls onRename with the trimmed value', async () => {
      const onRename = vi.fn();
      const { container } = render(Column, { name: 'Active', count: 0, onRename });
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="column-title"]')!,
      );
      const input = container.querySelector<HTMLInputElement>(
        '[data-testid="column-rename-input"]',
      );
      await fireEvent.input(input!, { target: { value: '  On Deck  ' } });
      await fireEvent.keyDown(input!, { key: 'Enter' });
      expect(onRename).toHaveBeenCalledWith('On Deck');
    });

    it('Escape reverts and does not call onRename', async () => {
      const onRename = vi.fn();
      const { container } = render(Column, { name: 'Active', count: 0, onRename });
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="column-title"]')!,
      );
      const input = container.querySelector<HTMLInputElement>(
        '[data-testid="column-rename-input"]',
      );
      await fireEvent.input(input!, { target: { value: 'discarded' } });
      await fireEvent.keyDown(input!, { key: 'Escape' });
      expect(onRename).not.toHaveBeenCalled();
    });

    it('committing an unchanged value does not call onRename', async () => {
      const onRename = vi.fn();
      const { container } = render(Column, { name: 'Active', count: 0, onRename });
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="column-title"]')!,
      );
      const input = container.querySelector<HTMLInputElement>(
        '[data-testid="column-rename-input"]',
      );
      await fireEvent.keyDown(input!, { key: 'Enter' });
      expect(onRename).not.toHaveBeenCalled();
    });
  });
});
