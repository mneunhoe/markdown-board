export type Priority = 'blocker' | 'high' | 'low' | null;

/**
 * Click-to-cycle order for the priority chip. Matches the prototype's
 * `cycleTaskPriority` (`dashboard.html:2639-2643`) extended with `blocker`
 * as a first-class fourth state — the prototype predates [P0] as a cycled
 * tier, but our grammar surface (§3.6) treats it the same as the rest.
 */
export const PRIORITY_CYCLE: readonly Priority[] = [null, 'blocker', 'high', 'low'];

export function nextPriority(current: Priority): Priority {
  const i = PRIORITY_CYCLE.indexOf(current);
  return PRIORITY_CYCLE[(i + 1) % PRIORITY_CYCLE.length] ?? null;
}

export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type Day = (typeof WEEK_DAYS)[number];

export interface Subtask {
  text: string;
  checked: boolean;
}

export interface Task {
  id: string;
  checked: boolean;
  title: string;
  note: string;
  priority: Priority;
  project: string | null;
  day: Day | null;
  pomodoros: number;
  subtasks: Subtask[];
}

export interface Section {
  id: string;
  name: string;
  tasks: Task[];
}

export interface Vault {
  prelude: string;
  sections: Section[];
}

export interface LibraryTable {
  headers: string[];
  rows: string[][];
}

export interface LibraryDoc {
  title: string;
  fields: Record<string, string>;
  sections: Record<string, string>;
  tables: LibraryTable[];
  rawContent: string;
}
