// Plugin-contributed per-card task actions. The host shell publishes an
// accessor under `TASK_ACTIONS_KEY` via Svelte context (mirroring
// `PROJECT_COLOR_OVERRIDES_KEY`); TaskCard renders a button per action and
// invokes `run` with the card's task reference. Kept UI-local so `ui` doesn't
// depend on the shell or plugin-api.

export interface TaskActionRef {
  taskId: string;
  sectionId: string;
}

export interface TaskActionEntry {
  /** Stable namespaced id (used as the keyed-each key). */
  key: string;
  /** Accessible label / tooltip. */
  label: string;
  /** Short glyph rendered on the button. */
  icon?: string;
  run: (ref: TaskActionRef) => void | Promise<void>;
}

/** A `() => TaskActionEntry[]` accessor, read reactively by TaskCard. */
export type TaskActionsAccessor = () => TaskActionEntry[];

export const TASK_ACTIONS_KEY = Symbol('mb:task-actions');
