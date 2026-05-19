import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
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

  describe('onCycle (slice 6b)', () => {
    it('without onCycle, null priority renders nothing', () => {
      const { container } = render(PriorityBadge, { priority: null });
      expect(container.querySelector('.priority-badge')).toBeNull();
    });

    it('with onCycle, null priority renders a "·" affordance button', () => {
      const { container } = render(PriorityBadge, { priority: null, onCycle: () => {} });
      const btn = container.querySelector<HTMLButtonElement>('[data-testid="priority-cycle"]');
      expect(btn).toBeTruthy();
      expect(btn?.classList.contains('priority-empty')).toBe(true);
      expect(btn?.textContent?.trim()).toBe('·');
    });

    it('with onCycle and a tier set, the badge becomes a button', () => {
      const { container } = render(PriorityBadge, { priority: 'high', onCycle: () => {} });
      const btn = container.querySelector<HTMLButtonElement>('[data-testid="priority-cycle"]');
      expect(btn).toBeTruthy();
      expect(btn?.classList.contains('cyclable')).toBe(true);
      expect(btn?.textContent?.trim()).toBe('P1');
    });

    it('clicking the cyclable badge calls onCycle', async () => {
      const onCycle = vi.fn();
      const { container } = render(PriorityBadge, { priority: 'low', onCycle });
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="priority-cycle"]')!,
      );
      expect(onCycle).toHaveBeenCalledOnce();
    });
  });
});
