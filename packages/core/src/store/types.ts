// FileAdapter — the I/O contract between core and a host (web FSA shell,
// Tauri desktop shell, Node-based tests).
//
// Paths are vault-relative, forward-slash-separated, no leading slash.
// `''` is the vault root. Implementations must accept Windows-style
// backslashes on input by normalising them before use.

export type FileKind = 'file' | 'directory';

export interface DirEntry {
  /** Entry name (no path component), e.g. `'TASKS.md'` or `'library'`. */
  name: string;
  kind: FileKind;
}

export type WatchEventKind = 'create' | 'modify' | 'delete';

export interface WatchEvent {
  kind: WatchEventKind;
  /** Vault-relative path of the file that changed. */
  path: string;
}

export type WatchHandler = (event: WatchEvent) => void;

export interface Disposable {
  dispose(): void;
}

export class FileNotFoundError extends Error {
  override readonly name = 'FileNotFoundError';
  constructor(public readonly path: string) {
    super(`File not found: ${path}`);
  }
}

export interface FileAdapter {
  /** Read a file as a UTF-8 string. Throws `FileNotFoundError` if missing. */
  readFile(path: string): Promise<string>;

  /**
   * Overwrite (or create) a file with the given UTF-8 contents.
   * Parent directories are created implicitly.
   */
  writeFile(path: string, contents: string): Promise<void>;

  /**
   * List the immediate children of a directory. Returns `[]` for a
   * directory that exists but is empty; the contract for a missing
   * directory is adapter-defined (the in-memory adapter returns `[]`,
   * the FSA / Tauri adapters throw — directories aren't first-class in
   * the in-memory model, so "missing" is indistinguishable from "empty").
   */
  listDir(path: string): Promise<DirEntry[]>;

  /**
   * Subscribe to write/delete events under `path`. Returns a `Disposable`
   * that stops the subscription. Watching `''` watches the entire vault.
   *
   * The in-memory adapter fires synchronously inside `writeFile` /
   * `delete` / `externalWrite`; real adapters debounce and may coalesce.
   * Subscribers must therefore treat events as hints, not as a strict
   * change log.
   */
  watch(path: string, handler: WatchHandler): Disposable;
}
