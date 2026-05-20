import { FileNotFoundError, type WatchEvent } from '@markdown-board/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TauriFileAdapter } from '../../../src/lib/adapters/tauri.js';
import * as mockFs from '../../helpers/mock-tauri-fs.js';

// Hand the in-memory mock to anything that does
// `import * as fs from '@tauri-apps/plugin-fs'`. Factory uses dynamic
// import so the mock helpers stay tree-shake-friendly and tests can
// reach in for `readSync` / `touchSync` without going through the
// mocked module.
vi.mock('@tauri-apps/plugin-fs', async () => {
  const helpers = await import('../../helpers/mock-tauri-fs.js');
  return helpers.fsModule;
});

const { VAULT_ROOT } = mockFs;

function build(files: Record<string, string> = {}): TauriFileAdapter {
  mockFs.buildVault(files);
  return new TauriFileAdapter(VAULT_ROOT);
}

beforeEach(() => {
  mockFs.reset();
});

describe('TauriFileAdapter', () => {
  describe('readBinary', () => {
    it('returns the file contents as bytes', async () => {
      const adapter = build({ 'logo.svg': '<svg/>' });
      const bytes = await adapter.readBinary('logo.svg');
      expect(new TextDecoder().decode(bytes)).toBe('<svg/>');
    });

    it('throws FileNotFoundError when the file is missing', async () => {
      const adapter = build({});
      await expect(adapter.readBinary('missing.woff2')).rejects.toBeInstanceOf(FileNotFoundError);
    });
  });

  describe('readFile', () => {
    it('returns the contents of an existing file', async () => {
      const adapter = build({ 'TASKS.md': '## Active\n' });
      expect(await adapter.readFile('TASKS.md')).toBe('## Active\n');
    });

    it('reads nested paths', async () => {
      const adapter = build({ 'library/projects/alpha.md': '# Alpha\n' });
      expect(await adapter.readFile('library/projects/alpha.md')).toBe('# Alpha\n');
    });

    it('throws FileNotFoundError when the file is missing', async () => {
      const adapter = build({});
      await expect(adapter.readFile('missing.md')).rejects.toBeInstanceOf(FileNotFoundError);
    });

    it('throws FileNotFoundError when an intermediate directory is missing', async () => {
      const adapter = build({ 'TASKS.md': '' });
      const err = await adapter.readFile('library/missing/file.md').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(FileNotFoundError);
      expect((err as FileNotFoundError).path).toBe('library/missing/file.md');
    });

    it('normalises leading/trailing slashes', async () => {
      const adapter = build({ 'TASKS.md': 'hi' });
      expect(await adapter.readFile('/TASKS.md/')).toBe('hi');
    });

    it('normalises backslashes', async () => {
      const adapter = build({ 'library/foo.md': 'x' });
      expect(await adapter.readFile('library\\foo.md')).toBe('x');
    });
  });

  describe('writeFile', () => {
    it('updates an existing file', async () => {
      const adapter = build({ 'TASKS.md': 'old' });
      await adapter.writeFile('TASKS.md', 'new');
      expect(mockFs.readSync('TASKS.md')).toBe('new');
    });

    it('creates a new file at the vault root', async () => {
      const adapter = build({});
      await adapter.writeFile('TASKS.md', 'hello');
      expect(mockFs.readSync('TASKS.md')).toBe('hello');
    });

    it('creates parent directories implicitly', async () => {
      const adapter = build({});
      await adapter.writeFile('library/projects/alpha.md', '# Alpha\n');
      expect(mockFs.readSync('library/projects/alpha.md')).toBe('# Alpha\n');
    });

    it('rejects writes to the vault root', async () => {
      const adapter = build({});
      await expect(adapter.writeFile('', 'x')).rejects.toThrow(/vault root/i);
    });

    it('fires a create event for a brand-new file', async () => {
      const adapter = build({});
      const events: WatchEvent[] = [];
      adapter.watch('', (e) => events.push(e));
      await adapter.writeFile('TASKS.md', 'hi');
      expect(events).toEqual([{ kind: 'create', path: 'TASKS.md' }]);
    });

    it('fires a modify event for an existing file', async () => {
      const adapter = build({ 'TASKS.md': 'old' });
      const events: WatchEvent[] = [];
      adapter.watch('', (e) => events.push(e));
      await adapter.writeFile('TASKS.md', 'new');
      expect(events).toEqual([{ kind: 'modify', path: 'TASKS.md' }]);
    });

    it('normalises the path before emitting the event', async () => {
      const adapter = build({});
      const events: WatchEvent[] = [];
      adapter.watch('', (e) => events.push(e));
      await adapter.writeFile('/library\\notes.md/', 'x');
      expect(events).toEqual([{ kind: 'create', path: 'library/notes.md' }]);
    });
  });

  describe('listDir', () => {
    it('returns the immediate children of the vault root, sorted by name', async () => {
      // Sort is `localeCompare`-based — case-insensitive, so `library`
      // falls between `CLAUDE.md` and `TASKS.md`. Matches the FSA +
      // InMemoryAdapter contract so consumers can swap adapters
      // without behaviour drift.
      const adapter = build({
        'TASKS.md': '',
        'CLAUDE.md': '',
        'library/foo.md': '',
      });
      expect(await adapter.listDir('')).toEqual([
        { name: 'CLAUDE.md', kind: 'file' },
        { name: 'library', kind: 'directory' },
        { name: 'TASKS.md', kind: 'file' },
      ]);
    });

    it('returns the immediate children of a nested directory', async () => {
      const adapter = build({
        'library/a.md': '',
        'library/b.md': '',
        'library/projects/c.md': '',
      });
      expect(await adapter.listDir('library')).toEqual([
        { name: 'a.md', kind: 'file' },
        { name: 'b.md', kind: 'file' },
        { name: 'projects', kind: 'directory' },
      ]);
    });

    it('returns [] for an empty directory', async () => {
      build({});
      mockFs.ensureEmptyDir('empty');
      const adapter = new TauriFileAdapter(VAULT_ROOT);
      expect(await adapter.listDir('empty')).toEqual([]);
    });

    it('throws FileNotFoundError for a missing directory', async () => {
      const adapter = build({ 'TASKS.md': '' });
      await expect(adapter.listDir('library')).rejects.toBeInstanceOf(FileNotFoundError);
    });

    it('sorts entries by name', async () => {
      const adapter = build({
        'zebra.md': '',
        'alpha.md': '',
        'mango.md': '',
      });
      const names = (await adapter.listDir('')).map((e) => e.name);
      expect(names).toEqual(['alpha.md', 'mango.md', 'zebra.md']);
    });
  });

  describe('watch', () => {
    let adapter: TauriFileAdapter;
    let events: WatchEvent[];

    beforeEach(() => {
      adapter = build({});
      events = [];
    });

    it("fires for events under the watched path's subtree", async () => {
      adapter.watch('library', (e) => events.push(e));
      await adapter.writeFile('library/foo.md', 'x');
      expect(events).toEqual([{ kind: 'create', path: 'library/foo.md' }]);
    });

    it('does not fire for sibling-prefix paths', async () => {
      adapter.watch('library', (e) => events.push(e));
      await adapter.writeFile('library-archive.md', 'x');
      expect(events).toEqual([]);
    });

    it("fires for the watched path's exact file (not a parent dir)", async () => {
      adapter.watch('TASKS.md', (e) => events.push(e));
      await adapter.writeFile('TASKS.md', 'x');
      expect(events).toEqual([{ kind: 'create', path: 'TASKS.md' }]);
    });

    it('watching the vault root receives every event', async () => {
      adapter.watch('', (e) => events.push(e));
      await adapter.writeFile('TASKS.md', 'a');
      await adapter.writeFile('library/foo.md', 'b');
      expect(events.map((e) => e.path)).toEqual(['TASKS.md', 'library/foo.md']);
    });

    it('multiple watchers fire independently', async () => {
      const a: WatchEvent[] = [];
      const b: WatchEvent[] = [];
      adapter.watch('', (e) => a.push(e));
      adapter.watch('library', (e) => b.push(e));
      await adapter.writeFile('TASKS.md', 'x');
      await adapter.writeFile('library/notes.md', 'y');
      expect(a.map((e) => e.path)).toEqual(['TASKS.md', 'library/notes.md']);
      expect(b.map((e) => e.path)).toEqual(['library/notes.md']);
    });

    it('dispose() stops further events', async () => {
      const d = adapter.watch('', (e) => events.push(e));
      await adapter.writeFile('a.md', '1');
      d.dispose();
      await adapter.writeFile('b.md', '2');
      expect(events.map((e) => e.path)).toEqual(['a.md']);
    });

    it('dispose() is idempotent', async () => {
      const d = adapter.watch('', (e) => events.push(e));
      d.dispose();
      d.dispose();
      await adapter.writeFile('a.md', '1');
      expect(events).toEqual([]);
    });

    it('a watcher disposing itself mid-emit does not affect peers', async () => {
      const order: string[] = [];
      const dA = adapter.watch('', () => {
        order.push('A');
        dA.dispose();
      });
      adapter.watch('', () => order.push('B'));
      await adapter.writeFile('x.md', '1');
      await adapter.writeFile('y.md', '2');
      expect(order).toEqual(['A', 'B', 'B']);
    });

    it('normalises the watched path', async () => {
      adapter.watch('/library\\projects/', (e) => events.push(e));
      await adapter.writeFile('library/projects/alpha.md', 'x');
      expect(events.map((e) => e.path)).toEqual(['library/projects/alpha.md']);
    });
  });

  describe('getMtime', () => {
    it('returns the file mtime as epoch ms for an existing file', async () => {
      const adapter = build({ 'TASKS.md': 'x' });
      mockFs.touchSync('TASKS.md', 12345);
      expect(await adapter.getMtime('TASKS.md')).toBe(12345);
    });

    it('bumps after writeFile', async () => {
      const adapter = build({ 'TASKS.md': 'old' });
      mockFs.touchSync('TASKS.md', 1);
      const before = await adapter.getMtime('TASKS.md');
      await adapter.writeFile('TASKS.md', 'new');
      const after = await adapter.getMtime('TASKS.md');
      expect(after).toBeGreaterThan(before);
    });

    it('throws FileNotFoundError for a missing file', async () => {
      const adapter = build({});
      await expect(adapter.getMtime('missing.md')).rejects.toBeInstanceOf(FileNotFoundError);
    });

    it('normalises the path', async () => {
      const adapter = build({ 'TASKS.md': 'x' });
      mockFs.touchSync('TASKS.md', 9999);
      expect(await adapter.getMtime('/TASKS.md/')).toBe(9999);
    });

    it('returns 0 when the platform stat has no mtime', async () => {
      // stat() can legitimately return mtime: null (cf. FileInfo
      // platform-support notes). Adapter should not throw — it
      // surfaces 0 so callers compare epoch-ms without nullable.
      const adapter = build({ 'TASKS.md': 'x' });
      const fs = await import('@tauri-apps/plugin-fs');
      const realStat = fs.stat;
      const spy = vi.spyOn(fs, 'stat').mockImplementation(async (path, options) => {
        const info = await realStat(path, options);
        return { ...info, mtime: null };
      });
      try {
        expect(await adapter.getMtime('TASKS.md')).toBe(0);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('path normalisation', () => {
    it('treats backslashes as path separators', async () => {
      const adapter = build({ 'a/b/c.md': 'hi' });
      expect(await adapter.readFile('a\\b\\c.md')).toBe('hi');
    });

    it('strips leading and trailing slashes on read', async () => {
      const adapter = build({ 'a.md': 'hi' });
      expect(await adapter.readFile('///a.md///')).toBe('hi');
    });

    it('strips leading and trailing slashes on listDir', async () => {
      const adapter = build({ 'library/foo.md': '' });
      expect((await adapter.listDir('/library/')).map((e) => e.name)).toEqual(['foo.md']);
    });
  });
});
