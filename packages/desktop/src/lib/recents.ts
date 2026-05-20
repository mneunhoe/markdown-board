// Recent-vaults store for the desktop shell.
//
// Persists the absolute paths of recently opened vaults so the empty state
// can offer one-click reopen. Backed by the webview's localStorage (same
// mechanism the settings module uses) — it survives app restarts and is
// shared across windows, which is the behaviour we want. The storage backend
// is injectable so the logic is unit-testable without a DOM.

const STORAGE_KEY = 'markdown-board:recent-vaults';
const MAX_RECENTS = 8;

export interface RecentVault {
  /** Absolute filesystem path of the vault root (used to reopen). */
  path: string;
  /** Basename of the path, for display. */
  name: string;
}

/** The slice of the Storage API this module uses. Defaults to localStorage. */
export interface RecentsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): RecentsStorage | null {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

/** Last path segment, tolerant of both `/` and `\` separators. */
export function basename(path: string): string {
  const trimmed = path.replace(/[/\\]+$/, '');
  const i = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  return i < 0 ? trimmed : trimmed.slice(i + 1);
}

export function loadRecents(storage: RecentsStorage | null = defaultStorage()): RecentVault[] {
  if (!storage) return [];
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Stored as a string[] of paths; names are derived on read so a moved
    // binary or renamed folder never shows a stale display name.
    return parsed
      .filter((p): p is string => typeof p === 'string' && p.length > 0)
      .map((path) => ({ path, name: basename(path) }));
  } catch {
    return [];
  }
}

function save(paths: string[], storage: RecentsStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(paths.slice(0, MAX_RECENTS)));
}

/** Add `path` to the front (most-recent), de-duplicating and capping the list. */
export function recordRecent(
  path: string,
  storage: RecentsStorage | null = defaultStorage(),
): void {
  if (!storage || !path) return;
  const existing = loadRecents(storage).map((r) => r.path);
  const next = [path, ...existing.filter((p) => p !== path)];
  save(next, storage);
}

/** Drop `path` from the list (e.g. when it no longer exists on disk). */
export function removeRecent(
  path: string,
  storage: RecentsStorage | null = defaultStorage(),
): void {
  if (!storage) return;
  const next = loadRecents(storage)
    .map((r) => r.path)
    .filter((p) => p !== path);
  save(next, storage);
}
