import type { Day, Priority, Section, Subtask, Task, Vault } from './types.js';
import { WEEK_DAYS } from './types.js';

export interface ParseTasksOptions {
  assignMissingIds?: boolean;
}

const H2_RE = /^## \*{0,2}(.+?)\*{0,2}$/;
const TASK_LINE_RE = /^- \[([ xX])\]\s*(.*)$/;
const SUBTASK_LINE_RE = /^\s+- \[([ xX])\]\s*(.*)$/;
const ID_SUFFIX_RE = /\s*<!--\s*id:\s*([0-9a-f]+)\s*-->\s*$/i;
const BOLD_WRAP_RE = /^\*\*(.+?)\*\*(.*)$/;

const PRIORITY_RE = /^\s*\[\s*(P[0-3])\s*\]\s+(.+)$/i;
const PROJECT_RE = /^\s*\[\s*project:\s*([^\]]+?)\s*\]\s+(.+)$/i;
const DAY_RE =
  /^\s*\[\s*(mon(?:day)?|tue(?:s|sday)?|wed(?:s|nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\s*\]\s+(.+)$/i;
const POM_RE = /^\s*\[\s*pom:\s*(\d+)\s*\]\s+(.+)$/i;

function slugifySection(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function priorityFromToken(token: string): Priority {
  switch (token.toUpperCase()) {
    case 'P0':
      return 'blocker';
    case 'P1':
      return 'high';
    case 'P3':
      return 'low';
    case 'P2':
    default:
      return null;
  }
}

function normaliseDay(raw: string): Day | null {
  const head = raw.slice(0, 3).toLowerCase();
  const canonical = WEEK_DAYS.find((d) => d.toLowerCase() === head);
  return canonical ?? null;
}

interface TokenState {
  priority: Priority;
  prioritySet: boolean;
  project: string | null;
  day: Day | null;
  pomodoros: number;
}

function peelTokens(title: string): { title: string; tokens: TokenState } {
  const state: TokenState = {
    priority: null,
    prioritySet: false,
    project: null,
    day: null,
    pomodoros: 0,
  };

  let remaining = title;
  let progress = true;
  while (progress) {
    progress = false;

    if (!state.prioritySet) {
      const m = PRIORITY_RE.exec(remaining);
      if (m) {
        state.priority = priorityFromToken(m[1]!);
        state.prioritySet = true;
        remaining = m[2]!;
        progress = true;
        continue;
      }
    }

    if (state.project === null) {
      const m = PROJECT_RE.exec(remaining);
      if (m) {
        state.project = m[1]!;
        remaining = m[2]!;
        progress = true;
        continue;
      }
    }

    if (state.day === null) {
      const m = DAY_RE.exec(remaining);
      if (m) {
        const day = normaliseDay(m[1]!);
        if (day) {
          state.day = day;
          remaining = m[2]!;
          progress = true;
          continue;
        }
      }
    }

    if (state.pomodoros === 0) {
      const m = POM_RE.exec(remaining);
      if (m) {
        state.pomodoros = Number.parseInt(m[1]!, 10);
        remaining = m[2]!;
        progress = true;
        continue;
      }
    }
  }

  return { title: remaining.trim(), tokens: state };
}

function parseTaskBody(body: string, checked: boolean): Task {
  let working = body;
  let id = '';

  const idMatch = ID_SUFFIX_RE.exec(working);
  if (idMatch) {
    id = idMatch[1]!;
    working = working.slice(0, idMatch.index).trimEnd();
  }

  let titleRaw: string;
  let noteRaw: string;
  const boldMatch = BOLD_WRAP_RE.exec(working);
  if (boldMatch) {
    titleRaw = boldMatch[1]!;
    noteRaw = boldMatch[2]!;
  } else {
    titleRaw = working;
    noteRaw = '';
  }

  const note = noteRaw.replace(/^\s*-\s*/, '').trim();
  const { title, tokens } = peelTokens(titleRaw);

  return {
    id,
    checked,
    title,
    note,
    priority: tokens.priority,
    project: tokens.project,
    day: tokens.day,
    pomodoros: tokens.pomodoros,
    subtasks: [],
  };
}

function parseSubtask(body: string, checked: boolean): Subtask {
  return { text: body.trim(), checked };
}

export function parseTasks(input: string, _options: ParseTasksOptions = {}): Vault {
  const lines = input.split(/\r?\n/);
  const sections: Section[] = [];
  const preludeLines: string[] = [];
  let currentSection: Section | null = null;
  let currentTask: Task | null = null;
  let sawSection = false;

  for (const line of lines) {
    const h2 = H2_RE.exec(line);
    if (h2) {
      const name = h2[1]!.trim();
      const id = slugifySection(name);
      const existing = sections.find((s) => s.id === id);
      if (existing) {
        currentSection = existing;
      } else {
        currentSection = { id, name, tasks: [] };
        sections.push(currentSection);
      }
      currentTask = null;
      sawSection = true;
      continue;
    }

    const subtaskMatch = SUBTASK_LINE_RE.exec(line);
    if (subtaskMatch && currentTask) {
      const checked = subtaskMatch[1]!.toLowerCase() === 'x';
      currentTask.subtasks.push(parseSubtask(subtaskMatch[2]!, checked));
      continue;
    }

    const taskMatch = TASK_LINE_RE.exec(line);
    if (taskMatch && currentSection) {
      const checked = taskMatch[1]!.toLowerCase() === 'x';
      const task = parseTaskBody(taskMatch[2]!, checked);
      currentSection.tasks.push(task);
      currentTask = task;
      continue;
    }

    if (!sawSection) {
      preludeLines.push(line);
    }
  }

  while (preludeLines.length > 0 && preludeLines[preludeLines.length - 1] === '') {
    preludeLines.pop();
  }

  return {
    prelude: preludeLines.join('\n'),
    sections,
  };
}

export function toMarkdown(_vault: Vault): string {
  throw new Error('toMarkdown: not implemented');
}
