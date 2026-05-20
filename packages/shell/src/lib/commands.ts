// Command registry + fuzzy matcher for the command palette (Cmd/Ctrl-K).
//
// Pure and UI-free so it can be unit-tested: the palette component renders
// whatever `filterCommands` returns, and VaultApp builds the concrete command
// list (with `run` handlers bound to its actions). Disabled commands are
// hidden from results.

export interface Command {
  /** Stable identifier (also used as a keyboard-shortcut binding key later). */
  id: string;
  /** Human-readable label shown in the palette. */
  title: string;
  /** Optional category label shown alongside the title. */
  group?: string;
  /** Extra terms that should match this command (not displayed). */
  keywords?: string[];
  /** Invoked when the command is chosen. May be async. */
  run: () => void | Promise<void>;
  /** When `false`, the command is omitted from results. Defaults to enabled. */
  enabled?: boolean;
  /**
   * Optional default keybinding (e.g. "Mod+Shift+P"), contributed by plugin
   * commands. Built-in defaults still live in `DEFAULT_SHORTCUTS`; this lets
   * the host fold plugin defaults into the resolved shortcut map. Users can
   * override via settings.
   */
  keybinding?: string;
}

/**
 * Score `text` against `query` as a case-insensitive subsequence match.
 * Returns `null` when `query` is not a subsequence of `text`. Higher is a
 * better match; contiguous runs and word-start hits are rewarded. An empty
 * query scores 0 (matches everything, preserving caller order).
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (q === '') return 0;
  let qi = 0;
  let score = 0;
  let lastMatch = -2;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) continue;
    score += lastMatch === ti - 1 ? 3 : 1; // contiguous run bonus
    if (ti === 0 || t[ti - 1] === ' ' || t[ti - 1] === '-') score += 2; // word-start bonus
    lastMatch = ti;
    qi++;
  }
  return qi === q.length ? score : null;
}

function bestScore(command: Command, query: string): number | null {
  const haystacks = [command.title, command.group ?? '', ...(command.keywords ?? [])];
  let best: number | null = null;
  for (const h of haystacks) {
    const s = fuzzyScore(query, h);
    if (s !== null && (best === null || s > best)) best = s;
  }
  return best;
}

/**
 * Filter + rank enabled commands against a query. With an empty query the
 * enabled commands are returned in their original order; otherwise results
 * are sorted by descending match score, ties broken by title.
 */
export function filterCommands(commands: Command[], query: string): Command[] {
  const enabled = commands.filter((c) => c.enabled !== false);
  const trimmed = query.trim();
  if (trimmed === '') return enabled;
  const scored: { command: Command; score: number }[] = [];
  for (const command of enabled) {
    const score = bestScore(command, trimmed);
    if (score !== null) scored.push({ command, score });
  }
  scored.sort((a, b) => b.score - a.score || a.command.title.localeCompare(b.command.title));
  return scored.map((s) => s.command);
}
