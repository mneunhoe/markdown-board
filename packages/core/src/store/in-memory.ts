// In-memory `FileAdapter` implementation, backed by a `Map<path, contents>`.
// Directories are not stored as first-class entries — they are synthesised
// from file paths on every `listDir` call. This keeps the test surface tiny
// (one Map) at the cost of being unable to represent an empty directory; in
// practice tests don't need that, and real adapters (FSA / Tauri) cover the
// empty-dir case.

import type { DirEntry, Disposable, FileAdapter, WatchEvent, WatchHandler } from './types.js';
import { FileNotFoundError } from './types.js';

interface InMemoryWatcher {
  /** Normalised, no leading/trailing slash. `''` watches the vault root. */
  path: string;
  handler: WatchHandler;
}

function normalisePath(input: string): string {
  return input.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

export class InMemoryAdapter implements FileAdapter {
  private readonly files = new Map<string, string>();
  private readonly watchers: InMemoryWatcher[] = [];

  /**
   * Seed initial files. Keys are vault-relative paths, values are file
   * contents. Backslashes and leading/trailing slashes are normalised.
   */
  constructor(initial: Record<string, string> = {}) {
    for (const [path, contents] of Object.entries(initial)) {
      this.files.set(normalisePath(path), contents);
    }
  }

  readFile(path: string): Promise<string> {
    const p = normalisePath(path);
    const contents = this.files.get(p);
    if (contents === undefined) {
      return Promise.reject(new FileNotFoundError(p));
    }
    return Promise.resolve(contents);
  }

  writeFile(path: string, contents: string): Promise<void> {
    const p = normalisePath(path);
    const kind: WatchEvent['kind'] = this.files.has(p) ? 'modify' : 'create';
    this.files.set(p, contents);
    this.emit({ kind, path: p });
    return Promise.resolve();
  }

  listDir(path: string): Promise<DirEntry[]> {
    const dir = normalisePath(path);
    const prefix = dir === '' ? '' : `${dir}/`;
    const entries = new Map<string, DirEntry>();
    for (const filePath of this.files.keys()) {
      if (dir !== '' && !filePath.startsWith(prefix)) continue;
      const rest = filePath.slice(prefix.length);
      if (rest === '') continue;
      const slash = rest.indexOf('/');
      if (slash === -1) {
        entries.set(rest, { name: rest, kind: 'file' });
      } else {
        const name = rest.slice(0, slash);
        if (!entries.has(name)) {
          entries.set(name, { name, kind: 'directory' });
        }
      }
    }
    return Promise.resolve([...entries.values()].sort((a, b) => a.name.localeCompare(b.name)));
  }

  watch(path: string, handler: WatchHandler): Disposable {
    const watcher: InMemoryWatcher = { path: normalisePath(path), handler };
    this.watchers.push(watcher);
    return {
      dispose: () => {
        const i = this.watchers.indexOf(watcher);
        if (i >= 0) this.watchers.splice(i, 1);
      },
    };
  }

  /**
   * Test helper: simulate an external delete (e.g. user moves a file
   * outside the app). Fires a `'delete'` event if the file existed.
   */
  delete(path: string): Promise<void> {
    const p = normalisePath(path);
    if (this.files.delete(p)) this.emit({ kind: 'delete', path: p });
    return Promise.resolve();
  }

  /**
   * Test helper: simulate an out-of-band write (e.g. Claude edits the
   * file while the app is open). Fires the same event as `writeFile`
   * would; provided as a separate name so tests stay readable.
   */
  externalWrite(path: string, contents: string): void {
    const p = normalisePath(path);
    const kind: WatchEvent['kind'] = this.files.has(p) ? 'modify' : 'create';
    this.files.set(p, contents);
    this.emit({ kind, path: p });
  }

  /** Test helper: returns true if the file exists. */
  has(path: string): boolean {
    return this.files.has(normalisePath(path));
  }

  private emit(event: WatchEvent): void {
    for (const w of [...this.watchers]) {
      if (this.matches(w.path, event.path)) w.handler(event);
    }
  }

  private matches(watchPath: string, eventPath: string): boolean {
    if (watchPath === '') return true;
    if (watchPath === eventPath) return true;
    return eventPath.startsWith(`${watchPath}/`);
  }
}
