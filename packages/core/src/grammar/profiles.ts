// Grammar profiles — pluggable token encodings for the task line.
//
// The structural grammar (sections, the `**title** - note` split, subtasks,
// `<!-- id -->`, project / day / pom brackets) is shared. Profiles differ only
// in how the *priority* tier is written:
//
//   - `default`        — bold-prefix brackets: `[P0] [P1] [P3]`
//                        (matches the claude_life prototype).
//   - `obsidian-tasks` — Obsidian Tasks priority emoji: 🔺 (blocker), ⏫ (high),
//                        🔽 (low). On read, 🔼 maps to high and ⏬ to low so
//                        pasted Obsidian tasks import sensibly.
//
// Both profiles target the same `Task` model and can serialise + re-parse every
// field, so switching profiles re-writes the file losslessly. (Obsidian's due
// 📅 / recurrence 🔁 have no equivalent in this model — `day` is a weekday, not
// a date — so they are intentionally out of scope.)

import type { Priority } from './types.js';

export const GRAMMAR_PROFILE_IDS = ['default', 'obsidian-tasks'] as const;
export type GrammarProfileId = (typeof GRAMMAR_PROFILE_IDS)[number];

export interface PriorityCodec {
  /** Peel a leading priority token; returns the tier + remaining title, or null. */
  peel(text: string): { priority: Priority; rest: string } | null;
  /** Emit the priority token (no trailing space), or null when there is none. */
  emit(priority: Priority): string | null;
}

export interface GrammarProfile {
  id: GrammarProfileId;
  priority: PriorityCodec;
}

const DEFAULT_PRIORITY_RE = /^\s*\[\s*(P[0-3])\s*\]\s+(.+)$/i;

function priorityFromPToken(token: string): Priority {
  switch (token.toUpperCase()) {
    case 'P0':
      return 'blocker';
    case 'P1':
      return 'high';
    case 'P3':
      return 'low';
    default:
      return null;
  }
}

const defaultPriority: PriorityCodec = {
  peel(text) {
    const m = DEFAULT_PRIORITY_RE.exec(text);
    if (!m) return null;
    return { priority: priorityFromPToken(m[1]!), rest: m[2]! };
  },
  emit(priority) {
    switch (priority) {
      case 'blocker':
        return '[P0]';
      case 'high':
        return '[P1]';
      case 'low':
        return '[P3]';
      default:
        return null;
    }
  },
};

const OBSIDIAN_PRIORITY_RE = /^\s*(🔺|⏫|🔼|🔽|⏬)\s+(.+)$/u;

function priorityFromEmoji(token: string): Priority {
  switch (token) {
    case '🔺':
      return 'blocker';
    case '⏫':
    case '🔼':
      return 'high';
    case '🔽':
    case '⏬':
      return 'low';
    default:
      return null;
  }
}

const obsidianPriority: PriorityCodec = {
  peel(text) {
    const m = OBSIDIAN_PRIORITY_RE.exec(text);
    if (!m) return null;
    return { priority: priorityFromEmoji(m[1]!), rest: m[2]! };
  },
  emit(priority) {
    switch (priority) {
      case 'blocker':
        return '🔺';
      case 'high':
        return '⏫';
      case 'low':
        return '🔽';
      default:
        return null;
    }
  },
};

const PROFILES: Record<GrammarProfileId, GrammarProfile> = {
  default: { id: 'default', priority: defaultPriority },
  'obsidian-tasks': { id: 'obsidian-tasks', priority: obsidianPriority },
};

/** Resolve a profile by id, falling back to `default` for unknown values. */
export function getGrammarProfile(id?: string): GrammarProfile {
  return (id && PROFILES[id as GrammarProfileId]) || PROFILES.default;
}
