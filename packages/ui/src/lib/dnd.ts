/**
 * Drag-and-drop types + pure index-computation helpers for BoardView /
 * ListView. No DOM, no `@atlaskit/pragmatic-drag-and-drop` import here —
 * everything in this file is unit-testable without happy-dom.
 *
 * Move callbacks are described in {@link TaskMoveHandler} /
 * {@link ColumnMoveHandler} terms: the consumer receives a *destination index*
 * computed as if the move has already been applied (i.e. the index where the
 * dragged item should end up in the destination list after removal from its
 * source list). This matches how the web shell / store layer will splice the
 * vault in Phase 1 task 4.
 */

/**
 * Edge of a drop target closest to the pointer at drop time, as reported by
 * `@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge`. Tasks reorder
 * vertically (`top` / `bottom`); columns reorder horizontally
 * (`left` / `right`).
 */
export type Edge = 'top' | 'bottom' | 'left' | 'right';

export type TaskDragData = {
  kind: 'task';
  taskId: string;
  fromSectionId: string;
  fromIndex: number;
};

export type ColumnDragData = {
  kind: 'column';
  sectionId: string;
  fromIndex: number;
};

export type TaskMoveHandler = (move: {
  taskId: string;
  fromSectionId: string;
  toSectionId: string;
  toIndex: number;
}) => void;

export type ColumnMoveHandler = (move: { sectionId: string; toIndex: number }) => void;

export function isTaskDragData(data: unknown): data is TaskDragData {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { kind?: unknown }).kind === 'task' &&
    typeof (data as { taskId?: unknown }).taskId === 'string' &&
    typeof (data as { fromSectionId?: unknown }).fromSectionId === 'string' &&
    typeof (data as { fromIndex?: unknown }).fromIndex === 'number'
  );
}

export function isColumnDragData(data: unknown): data is ColumnDragData {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { kind?: unknown }).kind === 'column' &&
    typeof (data as { sectionId?: unknown }).sectionId === 'string' &&
    typeof (data as { fromIndex?: unknown }).fromIndex === 'number'
  );
}

/**
 * Card-on-card / column-on-column reorder.
 *
 * Given the source's index in its origin list, the drop target's index in the
 * destination list, and the edge of the drop target closest to the pointer,
 * return the destination index where the source should end up *after* the move
 * has been applied (i.e. after the source has been spliced out of its origin).
 *
 * Returns `null` when the move is a no-op (dropping a card directly above or
 * below itself in the same list).
 */
export function computeReorderIndex(opts: {
  fromIndex: number;
  fromGroupId: string;
  toIndex: number;
  toGroupId: string;
  edge: Edge;
}): number | null {
  const insertAfter = opts.edge === 'bottom' || opts.edge === 'right';
  const rawTarget = opts.toIndex + (insertAfter ? 1 : 0);

  if (opts.fromGroupId !== opts.toGroupId) {
    return rawTarget;
  }
  if (rawTarget === opts.fromIndex || rawTarget === opts.fromIndex + 1) {
    return null;
  }
  return rawTarget > opts.fromIndex ? rawTarget - 1 : rawTarget;
}

/**
 * Task dropped on a column's empty area (not on another card).
 *
 * Cross-section: append at the end of the destination list (`toLength`).
 * Same-section: dropping on the column-as-a-whole means "move to end of this
 * column"; a no-op when the source is already last.
 */
export function computeAppendIndex(opts: {
  fromIndex: number;
  fromSectionId: string;
  toSectionId: string;
  toLength: number;
}): number | null {
  if (opts.fromSectionId !== opts.toSectionId) {
    return opts.toLength;
  }
  if (opts.fromIndex === opts.toLength - 1) return null;
  return opts.toLength - 1;
}
