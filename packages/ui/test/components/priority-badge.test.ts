import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import PriorityBadge from '../../src/components/PriorityBadge.svelte';

describe('PriorityBadge', () => {
  it('renders nothing when priority is null', () => {
    const { container } = render(PriorityBadge, { priority: null });
    expect(container.querySelector('.priority-badge')).toBeNull();
    expect(container.textContent?.trim()).toBe('');
  });

  it('renders the P0 label for blocker', () => {
    const { container } = render(PriorityBadge, { priority: 'blocker' });
    const badge = container.querySelector('.priority-badge');
    expect(badge).not.toBeNull();
    expect(badge?.classList.contains('priority-blocker')).toBe(true);
    expect(badge?.textContent?.trim()).toBe('P0');
  });

  it('renders the P1 label for high', () => {
    const { container } = render(PriorityBadge, { priority: 'high' });
    const badge = container.querySelector('.priority-badge');
    expect(badge).not.toBeNull();
    expect(badge?.classList.contains('priority-high')).toBe(true);
    expect(badge?.textContent?.trim()).toBe('P1');
  });

  it('renders the P3 label for low', () => {
    const { container } = render(PriorityBadge, { priority: 'low' });
    const badge = container.querySelector('.priority-badge');
    expect(badge).not.toBeNull();
    expect(badge?.classList.contains('priority-low')).toBe(true);
    expect(badge?.textContent?.trim()).toBe('P3');
  });

  it('exposes an aria-label naming the priority tier', () => {
    const { container } = render(PriorityBadge, { priority: 'blocker' });
    expect(container.querySelector('.priority-badge')?.getAttribute('aria-label')).toBe(
      'priority blocker',
    );
  });
});
