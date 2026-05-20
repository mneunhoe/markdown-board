// In-memory mock of the `@tauri-apps/plugin-fs` surface that
// `TauriFileAdapter` touches: `readTextFile`, `writeTextFile`,
// `readDir`, `mkdir`, `exists`, `stat`. Stored as a flat map of
// absolute paths so that the adapter's path-normalisation +
// root-prefix behaviour is exercised end-to-end through the
// mock (rather than re-implemented inside it).
//
// Wire via vi.mock in the test file:
//   vi.mock('@tauri-apps/plugin-fs', async () => {
//     const helpers = await import('../../helpers/mock-tauri-fs.js');
//     return helpers.fsModule;
//   });
//
// The mock is narrower than the real plugin — it implements only
// what the adapter uses. URL inputs are not supported (the adapter
// always hands string paths).

interface FileEntry {
  contents: string;
  mtime: number;
}

interface FileInfoLike {
  isFile: boolean;
  isDirectory: boolean;
  isSymlink: boolean;
  size: number;
  mtime: Date | null;
  atime: Date | null;
  birthtime: Date | null;
  readonly: boolean;
  fileAttributes: number | null;
}

interface DirEntryLike {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
  isSymlink: boolean;
}

const state = {
  files: new Map<string, FileEntry>(),
  dirs: new Set<string>(),
};

export const VAULT_ROOT = '/vault';

function notFound(path: string): Error {
  const err = new Error(`mock-tauri-fs: ${path} not found`);
  // Mirrors the shape Tauri's plugin error throws (no specific code
  // surface we can rely on cross-platform — adapter uses `exists()`
  // to disambiguate rather than error-name sniffing).
  (err as { code?: string }).code = 'ENOENT';
  return err;
}

function ensureDir(absPath: string): void {
  if (!absPath || absPath === '/') return;
  if (state.dirs.has(absPath)) return;
  state.dirs.add(absPath);
  const i = absPath.lastIndexOf('/');
  if (i > 0) ensureDir(absPath.slice(0, i));
}

function recordFile(absPath: string, contents: string, mtime?: number): void {
  state.files.set(absPath, { contents, mtime: mtime ?? Date.now() });
  const i = absPath.lastIndexOf('/');
  if (i > 0) ensureDir(absPath.slice(0, i));
}

/** Wipe the in-memory FS. Call from `beforeEach`. */
export function reset(): void {
  state.files.clear();
  state.dirs.clear();
}

/**
 * Seed a vault from a `{ 'foo/bar.md': '…' }` record (paths are
 * vault-relative). Implicitly registers `VAULT_ROOT` as a directory so
 * `readDir('')` on an empty vault returns `[]` rather than throwing.
 */
export function buildVault(files: Record<string, string> = {}): void {
  reset();
  ensureDir(VAULT_ROOT);
  for (const [rel, contents] of Object.entries(files)) {
    recordFile(`${VAULT_ROOT}/${rel}`, contents);
  }
}

/** Read the current contents of a vault-relative file (test helper). */
export function readSync(relPath: string): string | undefined {
  return state.files.get(`${VAULT_ROOT}/${relPath}`)?.contents;
}

/** Force the mtime of a seeded file (test helper). */
export function touchSync(relPath: string, mtime: number): void {
  const f = state.files.get(`${VAULT_ROOT}/${relPath}`);
  if (f) f.mtime = mtime;
}

/** Mark an empty directory as present (test helper). */
export function ensureEmptyDir(relPath: string): void {
  ensureDir(`${VAULT_ROOT}/${relPath}`);
}

export const fsModule = {
  async readTextFile(path: string): Promise<string> {
    const f = state.files.get(path);
    if (!f) throw notFound(path);
    return f.contents;
  },

  async writeTextFile(path: string, data: string): Promise<void> {
    recordFile(path, data);
  },

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    if (options?.recursive) {
      ensureDir(path);
      return;
    }
    const i = path.lastIndexOf('/');
    const parent = i > 0 ? path.slice(0, i) : '';
    if (parent && !state.dirs.has(parent)) throw notFound(parent);
    state.dirs.add(path);
  },

  async exists(path: string): Promise<boolean> {
    return state.files.has(path) || state.dirs.has(path);
  },

  async stat(path: string): Promise<FileInfoLike> {
    const f = state.files.get(path);
    if (f) {
      return {
        isFile: true,
        isDirectory: false,
        isSymlink: false,
        size: f.contents.length,
        mtime: new Date(f.mtime),
        atime: null,
        birthtime: null,
        readonly: false,
        fileAttributes: null,
      };
    }
    if (state.dirs.has(path)) {
      return {
        isFile: false,
        isDirectory: true,
        isSymlink: false,
        size: 0,
        mtime: null,
        atime: null,
        birthtime: null,
        readonly: false,
        fileAttributes: null,
      };
    }
    throw notFound(path);
  },

  async readDir(path: string): Promise<DirEntryLike[]> {
    if (!state.dirs.has(path)) throw notFound(path);
    const prefix = `${path}/`;
    const seen = new Set<string>();
    const out: DirEntryLike[] = [];

    for (const filePath of state.files.keys()) {
      if (!filePath.startsWith(prefix)) continue;
      const rel = filePath.slice(prefix.length);
      const slash = rel.indexOf('/');
      if (slash < 0) {
        if (seen.has(rel)) continue;
        seen.add(rel);
        out.push({ name: rel, isFile: true, isDirectory: false, isSymlink: false });
      } else {
        const dirName = rel.slice(0, slash);
        if (seen.has(dirName)) continue;
        seen.add(dirName);
        out.push({ name: dirName, isFile: false, isDirectory: true, isSymlink: false });
      }
    }

    // Empty subdirectories that were explicitly created (mkdir or
    // ensureEmptyDir) but contain no files. The walk above only sees
    // dirs implied by file paths.
    for (const d of state.dirs) {
      if (!d.startsWith(prefix)) continue;
      const rel = d.slice(prefix.length);
      if (rel.indexOf('/') >= 0) continue;
      if (seen.has(rel)) continue;
      seen.add(rel);
      out.push({ name: rel, isFile: false, isDirectory: true, isSymlink: false });
    }

    // The adapter sorts on its side; preserving insertion order here
    // catches accidental ordering assumptions in adapter code.
    return out;
  },
};
