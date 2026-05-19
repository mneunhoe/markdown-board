import { describe, expect, it } from 'vitest';
import { PRIORITY_CYCLE, nextPriority } from '../../src/grammar/types.js';

// Slice 6b — priority cycling lives in core so both the UI badge button
// and the web shell's mutate helper share the same canonical order.
describe('nextPriority', () => {
  it('exposes a 4-state cycle including blocker (extends prototype)', () => {
    expect(PRIORITY_CYCLE).toEqual([null, 'blocker', 'high', 'low']);
  });

  it('walks null → blocker → high → low → null', () => {
    expect(nextPriority(null)).toBe('blocker');
    expect(nextPriority('blocker')).toBe('high');
    expect(nextPriority('high')).toBe('low');
    expect(nextPriority('low')).toBeNull();
  });
});
