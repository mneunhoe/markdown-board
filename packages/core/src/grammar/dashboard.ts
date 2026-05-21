// Dashboard config — the data shape + pure stat computation behind the
// Overview tab's customizable stats. DASHBOARD.md may carry a YAML frontmatter
// block that (a) defines custom count cards via simple task filters and
// (b) toggles/reorders the built-in cards + breakdowns. Parsing the YAML lives
// in the shell (it needs the `yaml` dep, like theme parsing); these types and
// `computeStat` are pure so they unit-test trivially and stay reusable.

import type { Day, Priority, Vault } from './types.js';

export const BUILTIN_CARDS = ['total', 'open', 'checked', 'library'] as const;
export type BuiltinCard = (typeof BUILTIN_CARDS)[number];

export const BUILTIN_BREAKDOWNS = ['section', 'priority', 'day'] as const;
export type BuiltinBreakdown = (typeof BUILTIN_BREAKDOWNS)[number];

/**
 * A task filter for a custom stat card. Every provided key must match
 * (AND); a key given an array matches if any element does (OR within the
 * key). An empty filter matches every task.
 */
export interface StatFilter {
  priority?: Priority | Priority[];
  project?: string | string[];
  day?: Day | Day[];
  section?: string | string[];
  checked?: boolean;
}

/** One custom stat card: a label and the filter whose match count it shows. */
export interface StatSpec {
  label: string;
  where?: StatFilter;
}

/** Controls which built-in cards / breakdowns render, and in what order. */
export interface BuiltinsConfig {
  cards?: BuiltinCard[];
  breakdowns?: BuiltinBreakdown[];
}

export interface DashboardConfig {
  builtins?: BuiltinsConfig;
  stats?: StatSpec[];
}

/** Result of parsing DASHBOARD.md: the rendered body + its (validated) config. */
export interface ParsedDashboard {
  /** Markdown after the frontmatter (the whole file when there is none). */
  body: string;
  config: DashboardConfig;
  /** Non-fatal validation problems, surfaced in the Overview. */
  errors: string[];
}

function matchesValue<T>(actual: T, expected: T | T[]): boolean {
  return Array.isArray(expected) ? expected.includes(actual) : actual === expected;
}

/** True when `task` (in the section named `sectionName`) satisfies `filter`. */
export function matchesFilter(
  task: Vault['sections'][number]['tasks'][number],
  sectionName: string,
  filter: StatFilter | undefined,
): boolean {
  if (!filter) return true;
  if (filter.priority !== undefined && !matchesValue(task.priority, filter.priority)) return false;
  if (filter.project !== undefined) {
    if (task.project === null || !matchesValue(task.project, filter.project)) return false;
  }
  if (filter.day !== undefined) {
    if (task.day === null || !matchesValue(task.day, filter.day)) return false;
  }
  if (filter.section !== undefined && !matchesValue(sectionName, filter.section)) return false;
  if (filter.checked !== undefined && task.checked !== filter.checked) return false;
  return true;
}

/** Count tasks across all sections that match `filter`. */
export function computeStat(vault: Vault, filter: StatFilter | undefined): number {
  let count = 0;
  for (const section of vault.sections) {
    for (const task of section.tasks) {
      if (matchesFilter(task, section.name, filter)) count += 1;
    }
  }
  return count;
}
