import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
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
});
