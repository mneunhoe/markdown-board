export type Priority = 'blocker' | 'high' | 'low' | null;

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
