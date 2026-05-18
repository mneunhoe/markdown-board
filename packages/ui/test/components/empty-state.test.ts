import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import EmptyState from '../../src/components/EmptyState.svelte';

describe('EmptyState', () => {
  it('renders the title', () => {
    const { container } = render(EmptyState, { title: 'No vault open' });
    expect(container.querySelector('.empty-title')?.textContent?.trim()).toBe('No vault open');
  });

  it('renders the hint when provided', () => {
    const { container } = render(EmptyState, {
      title: 'No vault open',
      hint: 'Open a folder to get started.',
    });
    expect(container.querySelector('.empty-hint')?.textContent?.trim()).toBe(
      'Open a folder to get started.',
    );
  });

  it('omits the hint when not provided', () => {
    const { container } = render(EmptyState, { title: 'No tasks here yet' });
    expect(container.querySelector('.empty-hint')).toBeNull();
  });

  it('has role=status for screen readers', () => {
    const { container } = render(EmptyState, { title: 'No vault open' });
    expect(container.querySelector('.empty-state')?.getAttribute('role')).toBe('status');
  });

  it('omits the action slot wrapper when no children are passed', () => {
    const { container } = render(EmptyState, { title: 'No vault open' });
    expect(container.querySelector('.empty-action')).toBeNull();
  });
});
