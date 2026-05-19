// Minimal in-memory mock of the File System Access API surface
// (`FileSystemDirectoryHandle`, `FileSystemFileHandle`,
// `FileSystemWritableFileStream`) that the FSAFileAdapter touches.
//
// Stores the vault as a tree of `MockDirectoryHandle` / `MockFileHandle`
// nodes so that empty directories are first-class. `seed()` lets tests
// describe the initial vault as a flat `{ 'foo/bar.md': '…' }` record.
//
// The mock is intentionally narrower than the spec — it only implements
// what the adapter uses. Cast to `FileSystemDirectoryHandle` when handing
// it to the adapter (the real handle has a wider surface than we exercise).

export class MockFileHandle {
  readonly kind = 'file' as const;
  constructor(
    readonly name: string,
    public contents = '',
  ) {}

  async getFile(): Promise<File> {
    return new File([this.contents], this.name, { type: 'text/plain' });
  }

  async createWritable(): Promise<MockWritableStream> {
    return new MockWritableStream(this);
  }
}

export class MockWritableStream {
  private buffer = '';
  constructor(private readonly target: MockFileHandle) {}

  async write(data: string | { type: 'write'; data: string }): Promise<void> {
    this.buffer = typeof data === 'string' ? data : data.data;
  }

  async close(): Promise<void> {
    this.target.contents = this.buffer;
  }
}

export class MockDirectoryHandle {
  readonly kind = 'directory' as const;
  readonly children = new Map<string, MockDirectoryHandle | MockFileHandle>();

  constructor(readonly name = 'root') {}

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<MockFileHandle> {
    const existing = this.children.get(name);
    if (existing) {
      if (existing.kind !== 'file') {
        throw new DOMException(`Entry ${name} exists as a directory`, 'TypeMismatchError');
      }
      return existing;
    }
    if (!options?.create) {
      throw new DOMException(`File not found: ${name}`, 'NotFoundError');
    }
    const file = new MockFileHandle(name);
    this.children.set(name, file);
    return file;
  }

  async getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<MockDirectoryHandle> {
    const existing = this.children.get(name);
    if (existing) {
      if (existing.kind !== 'directory') {
        throw new DOMException(`Entry ${name} exists as a file`, 'TypeMismatchError');
      }
      return existing;
    }
    if (!options?.create) {
      throw new DOMException(`Directory not found: ${name}`, 'NotFoundError');
    }
    const dir = new MockDirectoryHandle(name);
    this.children.set(name, dir);
    return dir;
  }

  async *entries(): AsyncIterableIterator<[string, MockDirectoryHandle | MockFileHandle]> {
    for (const [name, child] of this.children) {
      yield [name, child];
    }
  }

  /** Test-only helper: read a file's current contents by vault path. */
  readSync(path: string): string | undefined {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return undefined;
    const fileName = segments.pop() as string;
    const dir = walkToDir(this, segments);
    if (!dir) return undefined;
    const file = dir.children.get(fileName);
    return file?.kind === 'file' ? file.contents : undefined;
  }
}

function walkToDir(
  start: MockDirectoryHandle,
  segments: string[],
): MockDirectoryHandle | undefined {
  let dir = start;
  for (const seg of segments) {
    const child = dir.children.get(seg);
    if (!child || child.kind !== 'directory') return undefined;
    dir = child;
  }
  return dir;
}

/**
 * Build a mock vault from a `{ 'foo/bar.md': 'contents' }` record. Keys are
 * vault-relative paths; intermediate directories are created implicitly.
 */
export function seedVault(files: Record<string, string>): MockDirectoryHandle {
  const root = new MockDirectoryHandle();
  for (const [path, contents] of Object.entries(files)) {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) continue;
    const fileName = segments.pop() as string;
    let dir: MockDirectoryHandle = root;
    for (const seg of segments) {
      const existing = dir.children.get(seg);
      if (existing && existing.kind === 'directory') {
        dir = existing;
      } else {
        const child = new MockDirectoryHandle(seg);
        dir.children.set(seg, child);
        dir = child;
      }
    }
    dir.children.set(fileName, new MockFileHandle(fileName, contents));
  }
  return root;
}

/** Cast helper: hand a `MockDirectoryHandle` to a caller expecting the real type. */
export function asRoot(handle: MockDirectoryHandle): FileSystemDirectoryHandle {
  return handle as unknown as FileSystemDirectoryHandle;
}
