// FSAFileAdapter — File System Access API implementation of the core
// FileAdapter interface. Internal writes fire watch events synchronously
// (same contract as InMemoryAdapter). External-change polling lives in
// a separate utility wired up by the shell (Phase 1 task 4, slice 4).
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

interface FsaWatcher {
  path: string;
  handler: WatchHandler;
}

// TypeScript's lib.dom omits the `entries()` async iterator on
// FileSystemDirectoryHandle even though the spec / Chromium implementation
// expose it. Narrow ambient type so the listDir loop typechecks without
// `any`.
interface DirHandleWithEntries {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
}

function normalisePath(input: string): string {
  return input.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function isDomNotFound(err: unknown): boolean {
  if (typeof DOMException !== 'undefined' && err instanceof DOMException) {
    return err.name === 'NotFoundError';
  }
  return err instanceof Error && err.name === 'NotFoundError';
}

export class FSAFileAdapter implements FileAdapter {
  private readonly watchers: FsaWatcher[] = [];

  constructor(private readonly root: FileSystemDirectoryHandle) {}

  /** Folder name of the picked vault (the FSA API doesn't expose a full path). */
  get displayPath(): string {
    return this.root.name;
  }

  async readFile(path: string): Promise<string> {
    const p = normalisePath(path);
    const handle = await this.resolveFileHandle(p, false);
    if (!handle) throw new FileNotFoundError(p);
    const file = await handle.getFile();
    return await file.text();
  }

  /**
   * Read the `lastModified` timestamp (epoch ms) for a file. The shell's
   * external-change watcher uses this to detect out-of-band edits between
   * autosaves. FileAdapter-extension, not interface-mandated — the
   * in-memory adapter doesn't expose it; the watcher is paired with this
   * adapter directly.
   */
  async getMtime(path: string): Promise<number> {
    const p = normalisePath(path);
    const handle = await this.resolveFileHandle(p, false);
    if (!handle) throw new FileNotFoundError(p);
    const file = await handle.getFile();
    return file.lastModified;
  }

  /**
   * Read a file as raw bytes. Used by the custom-theme loader for binary
   * assets (fonts, logo images). FileAdapter-extension, mirroring
   * `getMtime` — paired with the shell's `VaultAdapter` contract.
   */
  async readBinary(path: string): Promise<Uint8Array> {
    const p = normalisePath(path);
    const handle = await this.resolveFileHandle(p, false);
    if (!handle) throw new FileNotFoundError(p);
    const file = await handle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  }

  async writeFile(path: string, contents: string): Promise<void> {
    const p = normalisePath(path);
    if (p === '') throw new Error('Cannot write to vault root');
    const existed = (await this.resolveFileHandle(p, false)) !== null;
    const handle = await this.resolveFileHandle(p, true);
    if (!handle) throw new Error(`Failed to resolve handle for ${p}`);
    const writable = await handle.createWritable();
    try {
      await writable.write(contents);
    } finally {
      await writable.close();
    }
    this.emit({ kind: existed ? 'modify' : 'create', path: p });
  }

  async listDir(path: string): Promise<DirEntry[]> {
    const dir = normalisePath(path);
    const handle = dir === '' ? this.root : await this.resolveDirHandle(dir, false);
    if (!handle) throw new FileNotFoundError(dir);
    const entries: DirEntry[] = [];
    const iter = (handle as unknown as DirHandleWithEntries).entries();
    for await (const [name, child] of iter) {
      entries.push({ name, kind: child.kind === 'directory' ? 'directory' : 'file' });
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    return entries;
  }

  watch(path: string, handler: WatchHandler): Disposable {
    const watcher: FsaWatcher = { path: normalisePath(path), handler };
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

  private async resolveFileHandle(
    path: string,
    create: boolean,
  ): Promise<FileSystemFileHandle | null> {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return null;
    const fileName = segments.pop() as string;
    let dir: FileSystemDirectoryHandle = this.root;
    for (const seg of segments) {
      try {
        dir = await dir.getDirectoryHandle(seg, { create });
      } catch (err) {
        if (isDomNotFound(err)) return null;
        throw err;
      }
    }
    try {
      return await dir.getFileHandle(fileName, { create });
    } catch (err) {
      if (isDomNotFound(err)) return null;
      throw err;
    }
  }

  private async resolveDirHandle(
    path: string,
    create: boolean,
  ): Promise<FileSystemDirectoryHandle | null> {
    const segments = path.split('/').filter(Boolean);
    let dir: FileSystemDirectoryHandle = this.root;
    for (const seg of segments) {
      try {
        dir = await dir.getDirectoryHandle(seg, { create });
      } catch (err) {
        if (isDomNotFound(err)) return null;
        throw err;
      }
    }
    return dir;
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
