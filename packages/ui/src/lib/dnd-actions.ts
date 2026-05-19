/**
 * Svelte `use:` actions that wrap `@atlaskit/pragmatic-drag-and-drop` so the
 * orchestration layer (BoardView / ListView) can attach drag sources and
 * drop targets without leaking pragmatic-dnd's imperative API into every
 * component. Index math lives in `./dnd` and stays DOM-free.
 *
 * Conventions:
 * - Every action takes an `enabled` flag. Wrapping divs render
 *   unconditionally (so DOM structure is stable across DnD on/off) but the
 *   action no-ops when `enabled === false` — no native `draggable="true"`
 *   attribute is set, no drop listeners are attached.
 * - Source elements gain `data-dragging="true"` while a drag is active.
 * - Drop targets gain `data-drop-edge="top|bottom|left|right"` while
 *   hovered. Both attributes are removed on drop / leave / cancel.
 * - The column drop target accepts both task drops (append-to-end) and
 *   column drops (left/right reorder); it branches on `source.data.kind`.
 */

import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';

import {
  type ColumnMoveHandler,
  type Edge,
  type TaskMoveHandler,
  computeAppendIndex,
  computeReorderIndex,
  isColumnDragData,
  isTaskDragData,
} from './dnd.js';

type ActionReturn<P> = {
  update?: (params: P) => void;
  destroy?: () => void;
};

function asEdge(value: ReturnType<typeof extractClosestEdge>): Edge | null {
  if (value === 'top' || value === 'bottom' || value === 'left' || value === 'right') {
    return value;
  }
  return null;
}

// ---------------------------------------------------------------- task draggable

export type TaskDraggableParams = {
  taskId: string;
  sectionId: string;
  index: number;
  enabled: boolean;
};

export function taskDraggable(
  node: HTMLElement,
  params: TaskDraggableParams,
): ActionReturn<TaskDraggableParams> {
  let current = params;
  let cleanup: (() => void) | null = null;

  function setup(): void {
    if (!current.enabled) return;
    cleanup = draggable({
      element: node,
      getInitialData: () => ({
        kind: 'task',
        taskId: current.taskId,
        fromSectionId: current.sectionId,
        fromIndex: current.index,
      }),
      onDragStart: () => node.setAttribute('data-dragging', 'true'),
      onDrop: () => node.removeAttribute('data-dragging'),
    });
  }

  function teardown(): void {
    cleanup?.();
    cleanup = null;
    node.removeAttribute('data-dragging');
  }

  setup();
  return {
    update(next): void {
      current = next;
      teardown();
      setup();
    },
    destroy(): void {
      teardown();
    },
  };
}

// --------------------------------------------------------------- task drop target

export type TaskDropTargetParams = {
  taskId: string;
  sectionId: string;
  index: number;
  enabled: boolean;
  /**
   * Required-but-nullable rather than optional so callers can forward an
   * `onTaskMove?: TaskMoveHandler` prop directly under
   * `exactOptionalPropertyTypes`. The action no-ops on `undefined`.
   */
  onTaskMove: TaskMoveHandler | undefined;
};

export function taskDropTarget(
  node: HTMLElement,
  params: TaskDropTargetParams,
): ActionReturn<TaskDropTargetParams> {
  let current = params;
  let cleanup: (() => void) | null = null;

  function setup(): void {
    if (!current.enabled) return;
    cleanup = dropTargetForElements({
      element: node,
      canDrop: ({ source }) => isTaskDragData(source.data) && source.data.taskId !== current.taskId,
      getData: ({ input, element }) =>
        attachClosestEdge(
          { kind: 'task-drop', sectionId: current.sectionId, index: current.index },
          { input, element, allowedEdges: ['top', 'bottom'] },
        ),
      onDragEnter: ({ self }) => {
        const edge = asEdge(extractClosestEdge(self.data));
        if (edge) node.setAttribute('data-drop-edge', edge);
      },
      onDrag: ({ self }) => {
        const edge = asEdge(extractClosestEdge(self.data));
        if (edge) node.setAttribute('data-drop-edge', edge);
      },
      onDragLeave: () => node.removeAttribute('data-drop-edge'),
      onDrop: ({ source, self }) => {
        node.removeAttribute('data-drop-edge');
        if (!isTaskDragData(source.data)) return;
        const edge = asEdge(extractClosestEdge(self.data));
        if (!edge) return;
        const dest = computeReorderIndex({
          fromIndex: source.data.fromIndex,
          fromGroupId: source.data.fromSectionId,
          toIndex: current.index,
          toGroupId: current.sectionId,
          edge,
        });
        if (dest === null) return;
        current.onTaskMove?.({
          taskId: source.data.taskId,
          fromSectionId: source.data.fromSectionId,
          toSectionId: current.sectionId,
          toIndex: dest,
        });
      },
    });
  }

  function teardown(): void {
    cleanup?.();
    cleanup = null;
    node.removeAttribute('data-drop-edge');
  }

  setup();
  return {
    update(next): void {
      current = next;
      teardown();
      setup();
    },
    destroy(): void {
      teardown();
    },
  };
}

// -------------------------------------------------------------- column draggable

export type ColumnDraggableParams = {
  sectionId: string;
  index: number;
  enabled: boolean;
};

/**
 * Whole column wrapper is the draggable; drag is gated to the header (which
 * Column.svelte marks with `data-column-drag-handle`) so dragging on empty
 * column space or directly on a TaskCard doesn't start a column drag.
 *
 * TaskCards inside are themselves draggable, so even without the handle the
 * inner draggables would shadow the outer one — but the handle gives the
 * conventional "grab by the title" affordance and prevents accidental
 * column drags from background clicks.
 */
export function columnDraggable(
  node: HTMLElement,
  params: ColumnDraggableParams,
): ActionReturn<ColumnDraggableParams> {
  let current = params;
  let cleanup: (() => void) | null = null;

  function setup(): void {
    if (!current.enabled) return;
    const handle = node.querySelector<HTMLElement>('[data-column-drag-handle]');
    cleanup = draggable({
      element: node,
      ...(handle ? { dragHandle: handle } : {}),
      getInitialData: () => ({
        kind: 'column',
        sectionId: current.sectionId,
        fromIndex: current.index,
      }),
      onDragStart: () => node.setAttribute('data-dragging', 'true'),
      onDrop: () => node.removeAttribute('data-dragging'),
    });
  }

  function teardown(): void {
    cleanup?.();
    cleanup = null;
    node.removeAttribute('data-dragging');
  }

  setup();
  return {
    update(next): void {
      current = next;
      teardown();
      setup();
    },
    destroy(): void {
      teardown();
    },
  };
}

// ------------------------------------------------------------- column drop target

export type ColumnDropTargetParams = {
  sectionId: string;
  index: number;
  taskCount: number;
  enabled: boolean;
  /** See TaskDropTargetParams.onTaskMove for the `| undefined` rationale. */
  onTaskMove: TaskMoveHandler | undefined;
  onColumnMove: ColumnMoveHandler | undefined;
};

export function columnDropTarget(
  node: HTMLElement,
  params: ColumnDropTargetParams,
): ActionReturn<ColumnDropTargetParams> {
  let current = params;
  let cleanup: (() => void) | null = null;

  function setup(): void {
    if (!current.enabled) return;
    cleanup = dropTargetForElements({
      element: node,
      canDrop: ({ source }) => {
        if (isTaskDragData(source.data)) return true;
        if (isColumnDragData(source.data)) return source.data.sectionId !== current.sectionId;
        return false;
      },
      getData: ({ source, input, element }) => {
        if (isColumnDragData(source.data)) {
          return attachClosestEdge(
            { kind: 'column-drop', sectionId: current.sectionId, index: current.index },
            { input, element, allowedEdges: ['left', 'right'] },
          );
        }
        // Task drops on the column body don't need an edge: append-to-end.
        return { kind: 'task-column-drop', sectionId: current.sectionId };
      },
      onDragEnter: ({ source, self }) => {
        if (!isColumnDragData(source.data)) return;
        const edge = asEdge(extractClosestEdge(self.data));
        if (edge) node.setAttribute('data-drop-edge', edge);
      },
      onDrag: ({ source, self }) => {
        if (!isColumnDragData(source.data)) return;
        const edge = asEdge(extractClosestEdge(self.data));
        if (edge) node.setAttribute('data-drop-edge', edge);
      },
      onDragLeave: () => node.removeAttribute('data-drop-edge'),
      onDrop: ({ source, self }) => {
        node.removeAttribute('data-drop-edge');
        if (isTaskDragData(source.data)) {
          const dest = computeAppendIndex({
            fromIndex: source.data.fromIndex,
            fromSectionId: source.data.fromSectionId,
            toSectionId: current.sectionId,
            toLength: current.taskCount,
          });
          if (dest === null) return;
          current.onTaskMove?.({
            taskId: source.data.taskId,
            fromSectionId: source.data.fromSectionId,
            toSectionId: current.sectionId,
            toIndex: dest,
          });
          return;
        }
        if (isColumnDragData(source.data)) {
          const edge = asEdge(extractClosestEdge(self.data));
          if (!edge) return;
          const dest = computeReorderIndex({
            fromIndex: source.data.fromIndex,
            fromGroupId: '__columns__',
            toIndex: current.index,
            toGroupId: '__columns__',
            edge,
          });
          if (dest === null) return;
          current.onColumnMove?.({
            sectionId: source.data.sectionId,
            toIndex: dest,
          });
        }
      },
    });
  }

  function teardown(): void {
    cleanup?.();
    cleanup = null;
    node.removeAttribute('data-drop-edge');
  }

  setup();
  return {
    update(next): void {
      current = next;
      teardown();
      setup();
    },
    destroy(): void {
      teardown();
    },
  };
}
