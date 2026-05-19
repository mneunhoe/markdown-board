import { describe, expect, it } from 'vitest';
import {
  computeAppendIndex,
  computeReorderIndex,
  isColumnDragData,
  isTaskDragData,
} from '../../src/lib/dnd.js';

describe('computeReorderIndex — cross-group drops', () => {
  it("inserts above the target when the edge is 'top'", () => {
    expect(
      computeReorderIndex({
        fromIndex: 0,
        fromGroupId: 'a',
        toIndex: 2,
        toGroupId: 'b',
        edge: 'top',
      }),
    ).toBe(2);
  });

  it("inserts below the target when the edge is 'bottom'", () => {
    expect(
      computeReorderIndex({
        fromIndex: 0,
        fromGroupId: 'a',
        toIndex: 2,
        toGroupId: 'b',
        edge: 'bottom',
      }),
    ).toBe(3);
  });

  it("treats 'left' / 'right' the same as 'top' / 'bottom' (column drops)", () => {
    expect(
      computeReorderIndex({
        fromIndex: 0,
        fromGroupId: 'cols',
        toIndex: 1,
        toGroupId: 'cols',
        edge: 'left',
      }),
    ).toBeNull();
    expect(
      computeReorderIndex({
        fromIndex: 0,
        fromGroupId: 'cols',
        toIndex: 2,
        toGroupId: 'cols',
        edge: 'right',
      }),
    ).toBe(2);
  });

  it("inserts at the start of an empty target group with edge 'top'", () => {
    expect(
      computeReorderIndex({
        fromIndex: 0,
        fromGroupId: 'a',
        toIndex: 0,
        toGroupId: 'b',
        edge: 'top',
      }),
    ).toBe(0);
  });

  it("inserts after index 0 with edge 'bottom' in a new group", () => {
    expect(
      computeReorderIndex({
        fromIndex: 0,
        fromGroupId: 'a',
        toIndex: 0,
        toGroupId: 'b',
        edge: 'bottom',
      }),
    ).toBe(1);
  });
});

describe('computeReorderIndex — same-group reorder', () => {
  it('moving down: a → c with edge top returns c-1 (post-removal shift)', () => {
    // [A, B, C, D] — drag A onto C (edge top) → [B, A, C, D] (A at index 1)
    expect(
      computeReorderIndex({
        fromIndex: 0,
        fromGroupId: 'a',
        toIndex: 2,
        toGroupId: 'a',
        edge: 'top',
      }),
    ).toBe(1);
  });

  it('moving down: a → c with edge bottom returns c (post-removal shift)', () => {
    // [A, B, C, D] — drag A onto C (edge bottom) → [B, C, A, D] (A at index 2)
    expect(
      computeReorderIndex({
        fromIndex: 0,
        fromGroupId: 'a',
        toIndex: 2,
        toGroupId: 'a',
        edge: 'bottom',
      }),
    ).toBe(2);
  });

  it('moving up: d → b with edge top returns b (no shift, source is below)', () => {
    // [A, B, C, D] — drag D onto B (edge top) → [A, D, B, C] (D at index 1)
    expect(
      computeReorderIndex({
        fromIndex: 3,
        fromGroupId: 'a',
        toIndex: 1,
        toGroupId: 'a',
        edge: 'top',
      }),
    ).toBe(1);
  });

  it('moving up: d → b with edge bottom returns b+1 (no shift)', () => {
    // [A, B, C, D] — drag D onto B (edge bottom) → [A, B, D, C] (D at index 2)
    expect(
      computeReorderIndex({
        fromIndex: 3,
        fromGroupId: 'a',
        toIndex: 1,
        toGroupId: 'a',
        edge: 'bottom',
      }),
    ).toBe(2);
  });

  it('moving to the absolute end of the same list', () => {
    // [A, B, C, D] — drag A onto D (edge bottom) → [B, C, D, A] (A at index 3)
    expect(
      computeReorderIndex({
        fromIndex: 0,
        fromGroupId: 'a',
        toIndex: 3,
        toGroupId: 'a',
        edge: 'bottom',
      }),
    ).toBe(3);
  });

  it('moving to the absolute start of the same list', () => {
    // [A, B, C, D] — drag D onto A (edge top) → [D, A, B, C] (D at index 0)
    expect(
      computeReorderIndex({
        fromIndex: 3,
        fromGroupId: 'a',
        toIndex: 0,
        toGroupId: 'a',
        edge: 'top',
      }),
    ).toBe(0);
  });
});

describe('computeReorderIndex — no-op detection', () => {
  it('drop on self with edge top is a no-op', () => {
    expect(
      computeReorderIndex({
        fromIndex: 2,
        fromGroupId: 'a',
        toIndex: 2,
        toGroupId: 'a',
        edge: 'top',
      }),
    ).toBeNull();
  });

  it('drop on self with edge bottom is a no-op', () => {
    expect(
      computeReorderIndex({
        fromIndex: 2,
        fromGroupId: 'a',
        toIndex: 2,
        toGroupId: 'a',
        edge: 'bottom',
      }),
    ).toBeNull();
  });

  it('drop on the previous neighbour with edge bottom is a no-op (same slot)', () => {
    // [A, B, C, D] — drag C onto B (edge bottom) would land C at index 2 — same as now
    expect(
      computeReorderIndex({
        fromIndex: 2,
        fromGroupId: 'a',
        toIndex: 1,
        toGroupId: 'a',
        edge: 'bottom',
      }),
    ).toBeNull();
  });

  it('drop on the next neighbour with edge top is a no-op (same slot)', () => {
    // [A, B, C, D] — drag B onto C (edge top) would land B at index 1 — same as now
    expect(
      computeReorderIndex({
        fromIndex: 1,
        fromGroupId: 'a',
        toIndex: 2,
        toGroupId: 'a',
        edge: 'top',
      }),
    ).toBeNull();
  });

  it('cross-group drop on self-index is never a no-op', () => {
    expect(
      computeReorderIndex({
        fromIndex: 2,
        fromGroupId: 'a',
        toIndex: 2,
        toGroupId: 'b',
        edge: 'top',
      }),
    ).toBe(2);
  });
});

describe('computeAppendIndex', () => {
  it('cross-section: returns the destination length (append)', () => {
    expect(
      computeAppendIndex({
        fromIndex: 1,
        fromSectionId: 'a',
        toSectionId: 'b',
        toLength: 3,
      }),
    ).toBe(3);
  });

  it('cross-section, empty target: returns 0', () => {
    expect(
      computeAppendIndex({
        fromIndex: 0,
        fromSectionId: 'a',
        toSectionId: 'b',
        toLength: 0,
      }),
    ).toBe(0);
  });

  it('same-section: returns length - 1 (move to end after removal)', () => {
    expect(
      computeAppendIndex({
        fromIndex: 0,
        fromSectionId: 'a',
        toSectionId: 'a',
        toLength: 4,
      }),
    ).toBe(3);
  });

  it('same-section, already last: returns null (no-op)', () => {
    expect(
      computeAppendIndex({
        fromIndex: 3,
        fromSectionId: 'a',
        toSectionId: 'a',
        toLength: 4,
      }),
    ).toBeNull();
  });

  it('same-section, only task: returns null (cannot move past itself)', () => {
    expect(
      computeAppendIndex({
        fromIndex: 0,
        fromSectionId: 'a',
        toSectionId: 'a',
        toLength: 1,
      }),
    ).toBeNull();
  });
});

describe('drag-data type guards', () => {
  it('isTaskDragData accepts the canonical shape', () => {
    expect(
      isTaskDragData({
        kind: 'task',
        taskId: 't1',
        fromSectionId: 'active',
        fromIndex: 0,
      }),
    ).toBe(true);
  });

  it('isTaskDragData rejects column data and partial shapes', () => {
    expect(isTaskDragData({ kind: 'column', sectionId: 'a', fromIndex: 0 })).toBe(false);
    expect(isTaskDragData({ kind: 'task', taskId: 't1' })).toBe(false);
    expect(isTaskDragData(null)).toBe(false);
    expect(isTaskDragData('task')).toBe(false);
  });

  it('isColumnDragData accepts the canonical shape', () => {
    expect(isColumnDragData({ kind: 'column', sectionId: 'a', fromIndex: 2 })).toBe(true);
  });

  it('isColumnDragData rejects task data and partial shapes', () => {
    expect(
      isColumnDragData({
        kind: 'task',
        taskId: 't1',
        fromSectionId: 'a',
        fromIndex: 0,
      }),
    ).toBe(false);
    expect(isColumnDragData({ kind: 'column' })).toBe(false);
    expect(isColumnDragData(undefined)).toBe(false);
  });
});
