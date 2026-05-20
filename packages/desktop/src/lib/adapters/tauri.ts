// TauriFileAdapter — Tauri 2 implementation of the core FileAdapter
// interface. Operates on a vault rooted at an absolute filesystem path
// (supplied at construction time, typically from a directory picker).
// Internal writes fire watch events synchronously (same contract as
// InMemoryAdapter / FSAFileAdapter). The native file watcher for
// external changes lives in a separate slice (Phase 2 task 3) and
// will surface via the same `watch()` event stream.
//
// Paths follow the core contract: vault-relative, forward-slash-separated,
// no leading slash, `''` is the vault root. Backslashes and surrounding
// slashes on input are normalised before use.

import type {
  DirEntry,
  Disposable,
  FileAdapter,
  WatchEvent,
  WatchHandler,
} from '@markdown-board/core';
import { FileNotFoundError } from '@markdown-board/core';
import { exists, mkdir, readDir, readTextFile, stat, writeTextFile } from '@tauri-apps/plugin-fs';

interface TauriWatcher {
  path: string;
  handler: WatchHandler;
}

function normalisePath(input: string): string {
  return input.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function parentDir(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i);
}

export class TauriFileAdapter implements FileAdapter {
  private readonly watchers: TauriWatcher[] = [];

  /**
   * @param rootPath Absolute filesystem path of the vault root, in the
   *   host OS's native form (e.g. `/Users/marcel/vault` on macOS,
   *   `C:\\Users\\marcel\\vault` on Windows). Forward slashes are
   *   accepted on all platforms by the underlying plugin-fs.
   */
  constructor(private readonly rootPath: string) {}

  async readFile(path: string): Promise<string> {
    const p = normalisePath(path);
    if (p === '') throw new FileNotFoundError(p);
    const abs = this.absolutise(p);
    try {
      return await readTextFile(abs);
    } catch (err) {
      if (!(await exists(abs))) throw new FileNotFoundError(p);
      throw err;
    }
  }

  /**
   * Read the `mtime` (epoch ms) for a file. The shell's external-change
   * watcher uses this to detect out-of-band edits between autosaves —
   * same role and contract as `FSAFileAdapter.getMtime`. FileAdapter
   * extension, not interface-mandated.
   */
  async getMtime(path: string): Promise<number> {
    const p = normalisePath(path);
    if (p === '') throw new FileNotFoundError(p);
    const abs = this.absolutise(p);
    let info;
    try {
      info = await stat(abs);
    } catch (err) {
      if (!(await exists(abs))) throw new FileNotFoundError(p);
      throw err;
    }
    return info.mtime ? info.mtime.getTime() : 0;
  }

  async writeFile(path: string, contents: string): Promise<void> {
    const p = normalisePath(path);
    if (p === '') throw new Error('Cannot write to vault root');
    const abs = this.absolutise(p);
    const existed = await exists(abs);
    const parent = parentDir(p);
    if (parent !== '') {
      await mkdir(this.absolutise(parent), { recursive: true });
    }
    await writeTextFile(abs, contents);
    this.emit({ kind: existed ? 'modify' : 'create', path: p });
  }

  async listDir(path: string): Promise<DirEntry[]> {
    const dir = normalisePath(path);
    const abs = dir === '' ? this.rootPath : this.absolutise(dir);
    let raw;
    try {
      raw = await readDir(abs);
    } catch (err) {
      if (!(await exists(abs))) throw new FileNotFoundError(dir);
      throw err;
    }
    const entries: DirEntry[] = raw.map((e) => ({
      name: e.name,
      kind: e.isDirectory ? 'directory' : 'file',
    }));
    entries.sort((a, b) => a.name.localeCompare(b.name));
    return entries;
  }

  watch(path: string, handler: WatchHandler): Disposable {
    const watcher: TauriWatcher = { path: normalisePath(path), handler };
    this.watchers.push(watcher);
    let disposed = false;
    return {
      dispose: () => {
        if (disposed) return;
        disposed = true;
        const i = this.watchers.indexOf(watcher);
        if (i >= 0) this.watchers.splice(i, 1);
      },
    };
  }

  private absolutise(vaultPath: string): string {
    // vaultPath is already normalised by the caller. The plugin-fs layer
    // accepts forward-slash separators on every OS, so we don't have to
    // splice in `\\` on Windows.
    return `${this.rootPath}/${vaultPath}`;
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
