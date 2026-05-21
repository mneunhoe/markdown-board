// parseDashboard — split DASHBOARD.md into a YAML-frontmatter config + the
// markdown body rendered as pinned notes in the Overview tab.
//
// Same philosophy as theme parsing (see lib/theme/parse.ts): never throw on
// bad user input. A malformed config leaves the body fully renderable and
// surfaces a readable list of problems; unknown keys are ignored, known keys
// with the wrong shape are dropped and reported.

import {
  BUILTIN_BREAKDOWNS,
  BUILTIN_CARDS,
  WEEK_DAYS,
  type BuiltinBreakdown,
  type BuiltinCard,
  type DashboardConfig,
  type Day,
  type ParsedDashboard,
  type Priority,
  type StatFilter,
  type StatSpec,
} from '@markdown-board/core';
import { parse as parseYaml } from 'yaml';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;
const PRIORITIES = ['blocker', 'high', 'low'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate a `where` value into a `StatFilter`. Each key is optional; a string
 * or an array of strings is accepted (the array form = OR). Bad enum values are
 * dropped and reported, leaving the rest of the filter intact.
 */
function parseFilter(raw: unknown, where: string, errors: string[]): StatFilter | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    errors.push(`${where} must be a map of filter keys.`);
    return undefined;
  }
  const filter: StatFilter = {};

  const enumKey = <T extends string>(key: string, allowed: readonly T[]): T[] | undefined => {
    const value = raw[key];
    if (value === undefined) return undefined;
    const list = (Array.isArray(value) ? value : [value]).filter(
      (v): v is T => typeof v === 'string' && (allowed as readonly string[]).includes(v),
    );
    if (list.length === 0) {
      errors.push(`${where}.${key} must be one of: ${allowed.join(', ')}.`);
      return undefined;
    }
    return list;
  };

  const priority = enumKey('priority', PRIORITIES);
  if (priority) filter.priority = priority as Priority[];

  const day = enumKey('day', WEEK_DAYS);
  if (day) filter.day = day as Day[];

  if (raw.project !== undefined) {
    const list = (Array.isArray(raw.project) ? raw.project : [raw.project]).filter(
      (v): v is string => typeof v === 'string',
    );
    if (list.length === 0) errors.push(`${where}.project must be a string or list of strings.`);
    else filter.project = list;
  }

  if (raw.section !== undefined) {
    const list = (Array.isArray(raw.section) ? raw.section : [raw.section]).filter(
      (v): v is string => typeof v === 'string',
    );
    if (list.length === 0) errors.push(`${where}.section must be a string or list of strings.`);
    else filter.section = list;
  }

  if (raw.checked !== undefined) {
    if (typeof raw.checked === 'boolean') filter.checked = raw.checked;
    else errors.push(`${where}.checked must be true or false.`);
  }

  return filter;
}

function parseStats(raw: unknown, errors: string[]): StatSpec[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    errors.push('stats must be a list.');
    return undefined;
  }
  const stats: StatSpec[] = [];
  raw.forEach((entry, i) => {
    if (!isRecord(entry) || typeof entry.label !== 'string') {
      errors.push(`stats[${i}] must be a map with a string "label".`);
      return;
    }
    const where = parseFilter(entry.where, `stats[${i}].where`, errors);
    stats.push(where ? { label: entry.label, where } : { label: entry.label });
  });
  return stats;
}

function parseEnumList<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  where: string,
  errors: string[],
): T[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    errors.push(`${where} must be a list.`);
    return undefined;
  }
  const list = raw.filter(
    (v): v is T => typeof v === 'string' && (allowed as readonly string[]).includes(v),
  );
  if (list.length !== raw.length) {
    errors.push(`${where} may only contain: ${allowed.join(', ')}.`);
  }
  return list;
}

function parseConfig(doc: unknown, errors: string[]): DashboardConfig {
  if (!isRecord(doc)) {
    errors.push('DASHBOARD.md frontmatter must be a YAML map.');
    return {};
  }
  const config: DashboardConfig = {};

  const stats = parseStats(doc.stats, errors);
  if (stats) config.stats = stats;

  if (doc.builtins !== undefined) {
    if (!isRecord(doc.builtins)) {
      errors.push('builtins must be a map.');
    } else {
      const cards = parseEnumList<BuiltinCard>(
        doc.builtins.cards,
        BUILTIN_CARDS,
        'builtins.cards',
        errors,
      );
      const breakdowns = parseEnumList<BuiltinBreakdown>(
        doc.builtins.breakdowns,
        BUILTIN_BREAKDOWNS,
        'builtins.breakdowns',
        errors,
      );
      const builtins: DashboardConfig['builtins'] = {};
      if (cards) builtins.cards = cards;
      if (breakdowns) builtins.breakdowns = breakdowns;
      if (cards || breakdowns) config.builtins = builtins;
    }
  }

  return config;
}

/** Split DASHBOARD.md into its (validated) config + the markdown body. */
export function parseDashboard(content: string): ParsedDashboard {
  const normalised = content.replace(/\r\n?/g, '\n');
  const match = FRONTMATTER_RE.exec(normalised);
  if (!match) {
    return { body: normalised.trim(), config: {}, errors: [] };
  }

  const body = normalised.slice(match[0].length).trim();
  const errors: string[] = [];
  let doc: unknown;
  try {
    doc = parseYaml(match[1]!);
  } catch (err) {
    return {
      body,
      config: {},
      errors: [
        `Could not parse DASHBOARD.md frontmatter: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }

  return { body, config: parseConfig(doc, errors), errors };
}
