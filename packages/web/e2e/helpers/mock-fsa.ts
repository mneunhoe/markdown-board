// In-browser FSA mock for Playwright. Runs as an `addInitScript`
// before the app boots so `isFileSystemAccessSupported()` sees a
// picker-capable window. Exposes the synthetic vault as
// `window.__vault` (a `Map<path, { contents, lastModified }>`) so
// specs can assert what the app wrote (e.g. archive/TASKS.md after
// a resolve).

import type { Page } from '@playwright/test';

export async function installMockFsa(
  page: Page,
  initialFiles: Record<string, string>,
): Promise<void> {
  await page.addInitScript((files: Record<string, string>) => {
    interface VaultFile {
      contents: string;
      lastModified: number;
    }
    const vault = new Map<string, VaultFile>();
    for (const [path, contents] of Object.entries(files)) {
      vault.set(path, { contents, lastModified: Date.now() });
    }
    (window as unknown as { __vault: Map<string, VaultFile> }).__vault = vault;

    class MockFileHandle {
      readonly kind = 'file';
      constructor(
        readonly name: string,
        readonly fullPath: string,
      ) {}
      async getFile(): Promise<File> {
        const entry = vault.get(this.fullPath);
        const contents = entry?.contents ?? '';
        const lastModified = entry?.lastModified ?? Date.now();
        return new File([contents], this.name, { lastModified });
      }
      async createWritable(): Promise<{
        write(data: string): Promise<void>;
        close(): Promise<void>;
      }> {
        let buffer = '';
        return {
          write: async (data: string) => {
            buffer = data;
          },
          close: async () => {
            vault.set(this.fullPath, { contents: buffer, lastModified: Date.now() });
          },
        };
      }
    }

    class MockDirectoryHandle {
      readonly kind = 'directory';
      readonly children = new Map<string, MockDirectoryHandle | MockFileHandle>();
      constructor(
        readonly name: string,
        readonly fullPath: string,
      ) {}

      async getFileHandle(name: string, opts?: { create?: boolean }): Promise<MockFileHandle> {
        const child = this.children.get(name);
        if (child instanceof MockFileHandle) return child;
        if (child instanceof MockDirectoryHandle) {
          throw new DOMException(`${name} is a directory`, 'TypeMismatchError');
        }
        if (!opts?.create) {
          throw new DOMException(`File ${name} not found`, 'NotFoundError');
        }
        const full = this.fullPath === '' ? name : `${this.fullPath}/${name}`;
        const handle = new MockFileHandle(name, full);
        this.children.set(name, handle);
        return handle;
      }

      async getDirectoryHandle(
        name: string,
        opts?: { create?: boolean },
      ): Promise<MockDirectoryHandle> {
        const child = this.children.get(name);
        if (child instanceof MockDirectoryHandle) return child;
        if (child instanceof MockFileHandle) {
          throw new DOMException(`${name} is a file`, 'TypeMismatchError');
        }
        if (!opts?.create) {
          throw new DOMException(`Directory ${name} not found`, 'NotFoundError');
        }
        const full = this.fullPath === '' ? name : `${this.fullPath}/${name}`;
        const handle = new MockDirectoryHandle(name, full);
        this.children.set(name, handle);
        return handle;
      }

      async *entries(): AsyncIterableIterator<[string, MockDirectoryHandle | MockFileHandle]> {
        for (const [name, child] of this.children) yield [name, child];
      }
    }

    const root = new MockDirectoryHandle('vault', '');
    // Seed the tree.
    for (const [path] of Object.entries(files)) {
      const segments = path.split('/').filter(Boolean);
      if (segments.length === 0) continue;
      const fileName = segments.pop() as string;
      let dir = root;
      for (const seg of segments) {
        const child = dir.children.get(seg);
        if (child instanceof MockDirectoryHandle) {
          dir = child;
        } else {
          const full = dir.fullPath === '' ? seg : `${dir.fullPath}/${seg}`;
          const next = new MockDirectoryHandle(seg, full);
          dir.children.set(seg, next);
          dir = next;
        }
      }
      const full = dir.fullPath === '' ? fileName : `${dir.fullPath}/${fileName}`;
      dir.children.set(fileName, new MockFileHandle(fileName, full));
    }

    (window as unknown as { showDirectoryPicker: () => Promise<unknown> }).showDirectoryPicker =
      async () => root;
  }, initialFiles);
}

export async function getVaultFiles(page: Page): Promise<Record<string, string>> {
  return await page.evaluate(() => {
    const v = (window as unknown as { __vault?: Map<string, { contents: string }> }).__vault;
    if (!v) return {};
    const out: Record<string, string> = {};
    for (const [k, entry] of v) out[k] = entry.contents;
    return out;
  });
}
