import { getGrammarProfile, type GrammarProfile, type GrammarProfileId } from './profiles.js';
import type { Day, Priority, Section, Subtask, Task, Vault } from './types.js';
import { WEEK_DAYS } from './types.js';

export interface ParseTasksOptions {
  assignMissingIds?: boolean;
  /** Token encoding to read. Defaults to `default` (bold-prefix brackets). */
  profile?: GrammarProfileId | undefined;
}

export interface SerializeOptions {
  /** Token encoding to write. Defaults to `default` (bold-prefix brackets). */
  profile?: GrammarProfileId | undefined;
}

const H2_RE = /^## \*{0,2}(.+?)\*{0,2}$/;
const TASK_LINE_RE = /^- \[([ xX])\]\s*(.*)$/;
const SUBTASK_LINE_RE = /^\s+- \[([ xX])\]\s*(.*)$/;
// The task id is persisted as an `<!-- id:… -->` HTML comment. Canonically it
// sits at the end of the line, but accept any id token (not just hex) found
// anywhere on the line so a hand-authored or tool-written comment is still
// recognised — and, crucially, stripped from the rendered title/note instead
// of leaking into the card. `ID_COMMENT_RE` captures the first id; the global
// variant removes every occurrence.
const ID_COMMENT_RE = /\s*<!--\s*id:\s*(\S+?)\s*-->\s*/i;
const ID_COMMENT_RE_G = /\s*<!--\s*id:\s*\S+?\s*-->\s*/gi;
const BOLD_WRAP_RE = /^\*\*(.+?)\*\*(.*)$/;

const PROJECT_RE = /^\s*\[\s*project:\s*([^\]]+?)\s*\]\s+(.+)$/i;
const DAY_RE =
  /^\s*\[\s*(mon(?:day)?|tue(?:s|sday)?|wed(?:s|nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\s*\]\s+(.+)$/i;
const POM_RE = /^\s*\[\s*pom:\s*(\d+)\s*\]\s+(.+)$/i;
// `[res: …]` prefix in the §3.5 note position. The body matches up to
// the first `]` (writers sanitise `]` to `)` to avoid the ambiguity),
// optionally followed by ` · {original note}`.
const RES_PREFIX_RE = /^\[res:\s*([^\]]*?)\s*\](?:\s*·\s+(.+))?$/;

/**
 * Compute a section's runtime id from its display name. Lowercases,
 * collapses runs of non-alphanumerics into a single dash, and trims
 * leading / trailing dashes. Mirrors `taskSectionId` in
 * `dashboard.html:1880-1885`.
 *
 * Exported for the web shell so the section-rename handler can refresh
 * a column's id when its name changes (slice 6c) without re-parsing
 * the entire vault.
 */
export function slugifySection(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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

function peelTokens(title: string, profile: GrammarProfile): { title: string; tokens: TokenState } {
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
      const m = profile.priority.peel(remaining);
      if (m) {
        state.priority = m.priority;
        state.prioritySet = true;
        remaining = m.rest;
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

function parseTaskBody(body: string, checked: boolean, profile: GrammarProfile): Task {
  let working = body;
  let id = '';

  const idMatch = ID_COMMENT_RE.exec(working);
  if (idMatch) {
    id = idMatch[1]!;
    working = working.replace(ID_COMMENT_RE_G, ' ').trim();
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

  const rawNote = noteRaw.replace(/^\s*-\s*/, '').trim();
  const { resolution, note } = peelResolution(rawNote);
  const { title, tokens } = peelTokens(titleRaw, profile);

  return {
    id,
    checked,
    title,
    note,
    resolution,
    priority: tokens.priority,
    project: tokens.project,
    day: tokens.day,
    pomodoros: tokens.pomodoros,
    subtasks: [],
  };
}

function peelResolution(rawNote: string): { resolution: string; note: string } {
  const m = RES_PREFIX_RE.exec(rawNote);
  if (!m) return { resolution: '', note: rawNote };
  return { resolution: m[1] ?? '', note: (m[2] ?? '').trim() };
}

function parseSubtask(body: string, checked: boolean): Subtask {
  return { text: body.trim(), checked };
}

export function parseTasks(input: string, options: ParseTasksOptions = {}): Vault {
  const profile = getGrammarProfile(options.profile);
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
      const task = parseTaskBody(taskMatch[2]!, checked, profile);
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

function emitTokens(task: Task, profile: GrammarProfile): string {
  const parts: string[] = [];
  const p = profile.priority.emit(task.priority);
  if (p) parts.push(p);
  if (task.project) parts.push(`[project:${task.project}]`);
  if (task.day) parts.push(`[${task.day}]`);
  if (task.pomodoros > 0) parts.push(`[pom:${task.pomodoros}]`);
  return parts.length > 0 ? parts.join(' ') + ' ' : '';
}

function emitTask(task: Task, profile: GrammarProfile): string {
  const checkbox = task.checked ? '[x]' : '[ ]';
  const titleBody = `${emitTokens(task, profile)}${task.title}`;
  const note = formatNoteSuffix(task);
  const idSuffix = task.id ? ` <!-- id:${task.id} -->` : '';
  let out = `- ${checkbox} **${titleBody}**${note}${idSuffix}\n`;
  for (const st of task.subtasks) {
    const sc = st.checked ? '[x]' : '[ ]';
    out += `  - ${sc} ${st.text}\n`;
  }
  return out;
}

function formatNoteSuffix(task: Task): string {
  // `]` in the resolution would terminate the `[res: …]` marker on
  // re-parse, so sanitise it to `)` on the way out. Lossy but rare.
  const resBody = task.resolution.trim().replace(/\]/g, ')');
  const noteBody = task.note.trim();
  if (!resBody && !noteBody) return '';
  if (!resBody) return ` - ${noteBody}`;
  if (!noteBody) return ` - [res: ${resBody}]`;
  return ` - [res: ${resBody}] · ${noteBody}`;
}

/**
 * Round-trip helpers for editing a single task as raw markdown.
 *
 * `emitTaskBlock(task)` — emit the task line + indented subtask lines
 * exactly as they'd appear inside a section in TASKS.md (per spec §3.4 /
 * §3.10). Useful for pre-filling a "raw markdown" editor tab.
 *
 * `parseTaskBlock(raw)` — wrap the supplied raw markdown under a
 * synthetic H2 so it can ride through `parseTasks` unchanged, then
 * extract the single resulting task. Returns `null` when the input
 * doesn't produce exactly one task (empty, no checkbox line, multiple
 * tasks). Subtask lines must follow the canonical two-space indent
 * documented in §3.10.
 */
export function emitTaskBlock(task: Task, options: SerializeOptions = {}): string {
  return emitTask(task, getGrammarProfile(options.profile)).trimEnd();
}

export function parseTaskBlock(raw: string, options: ParseTasksOptions = {}): Task | null {
  const wrapped = `## __mb_tmp__\n${raw.replace(/\r\n?/g, '\n')}\n`;
  const vault = parseTasks(wrapped, options);
  const section = vault.sections[0];
  if (!section || section.tasks.length !== 1) return null;
  return section.tasks[0] ?? null;
}

export function toMarkdown(vault: Vault, options: SerializeOptions = {}): string {
  const profile = getGrammarProfile(options.profile);
  let out = '';
  if (vault.prelude) {
    out += `${vault.prelude}\n\n`;
  }
  for (let i = 0; i < vault.sections.length; i++) {
    if (i > 0) out += '\n';
    const section = vault.sections[i]!;
    out += `## ${section.name}\n`;
    for (const task of section.tasks) {
      out += emitTask(task, profile);
    }
  }
  return out ? `${out.trimEnd()}\n` : '';
}
