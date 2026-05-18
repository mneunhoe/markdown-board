import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import DayChip from '../../src/components/DayChip.svelte';
import { WEEK_DAYS } from '@markdown-board/core';

describe('DayChip', () => {
  it('renders nothing when day is null', () => {
    const { container } = render(DayChip, { day: null });
    expect(container.querySelector('.day-chip')).toBeNull();
    expect(container.textContent?.trim()).toBe('');
  });

  it('renders the 3-letter abbreviation for each weekday', () => {
    for (const day of WEEK_DAYS) {
      const { container } = render(DayChip, { day });
      const chip = container.querySelector('.day-chip');
      expect(chip).not.toBeNull();
      expect(chip?.textContent?.trim()).toBe(day);
    }
  });

  it('sets the --day-color CSS variable to the matching token', () => {
    const { container } = render(DayChip, { day: 'Wed' });
    const chip = container.querySelector<HTMLElement>('.day-chip');
    expect(chip?.style.getPropertyValue('--day-color')).toBe('var(--day-wed)');
  });

  it('exposes an aria-label naming the day', () => {
    const { container } = render(DayChip, { day: 'Fri' });
    expect(container.querySelector('.day-chip')?.getAttribute('aria-label')).toBe('day Fri');
  });
});
