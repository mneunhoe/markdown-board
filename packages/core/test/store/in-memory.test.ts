import { describe, expect, it, vi } from 'vitest';
import { FileNotFoundError, InMemoryAdapter, type WatchEvent } from '../../src/index.js';

describe('InMemoryAdapter', () => {
  describe('readFile / writeFile', () => {
    it('reads back what writeFile wrote', async () => {
      const fs = new InMemoryAdapter();
      await fs.writeFile('TASKS.md', '# Tasks\n');
      expect(await fs.readFile('TASKS.md')).toBe('# Tasks\n');
    });

    it('reads files passed to the constructor seed', async () => {
      const fs = new InMemoryAdapter({
        'TASKS.md': '## Active\n',
        'library/people/alice.md': '# Alice\n',
      });
      expect(await fs.readFile('TASKS.md')).toBe('## Active\n');
      expect(await fs.readFile('library/people/alice.md')).toBe('# Alice\n');
    });

    it('throws FileNotFoundError on a missing file', async () => {
      const fs = new InMemoryAdapter();
      await expect(fs.readFile('nope.md')).rejects.toBeInstanceOf(FileNotFoundError);
    });

    it('FileNotFoundError carries the requested path', async () => {
      const fs = new InMemoryAdapter();
      try {
        await fs.readFile('missing/sub/file.md');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(FileNotFoundError);
        expect((err as FileNotFoundError).path).toBe('missing/sub/file.md');
      }
    });

    it('overwrites on a repeat writeFile', async () => {
      const fs = new InMemoryAdapter();
      await fs.writeFile('x.md', 'one');
      await fs.writeFile('x.md', 'two');
      expect(await fs.readFile('x.md')).toBe('two');
    });

    it('preserves the empty string as a legitimate file body', async () => {
      const fs = new InMemoryAdapter();
      await fs.writeFile('empty.md', '');
      expect(await fs.readFile('empty.md')).toBe('');
    });
  });

  describe('listDir', () => {
    it('lists immediate children of the vault root', async () => {
      const fs = new InMemoryAdapter({
        'TASKS.md': '',
        'DASHBOARD.md': '',
        'library/projects/foo.md': '',
        'archive/TASKS.md': '',
      });
      // Locale-aware case-insensitive sort: `archive` precedes `DASHBOARD.md`.
      expect(await fs.listDir('')).toEqual([
        { name: 'archive', kind: 'directory' },
        { name: 'DASHBOARD.md', kind: 'file' },
        { name: 'library', kind: 'directory' },
        { name: 'TASKS.md', kind: 'file' },
      ]);
    });

    it('lists immediate children of a nested directory', async () => {
      const fs = new InMemoryAdapter({
        'library/projects/foo.md': '',
        'library/projects/bar.md': '',
        'library/people/alice.md': '',
        'TASKS.md': '',
      });
      expect(await fs.listDir('library')).toEqual([
        { name: 'people', kind: 'directory' },
        { name: 'projects', kind: 'directory' },
      ]);
      expect(await fs.listDir('library/projects')).toEqual([
        { name: 'bar.md', kind: 'file' },
        { name: 'foo.md', kind: 'file' },
      ]);
    });

    it('returns [] for a directory that does not exist', async () => {
      const fs = new InMemoryAdapter({ 'TASKS.md': '' });
      expect(await fs.listDir('nope')).toEqual([]);
    });

    it('does not include the watched directory itself in its listing', async () => {
      const fs = new InMemoryAdapter({ 'library/foo.md': '' });
      const names = (await fs.listDir('library')).map((e) => e.name);
      expect(names).toEqual(['foo.md']);
    });

    it('reports each implicit ancestor exactly once', async () => {
      const fs = new InMemoryAdapter({
        'library/projects/foo.md': '',
        'library/projects/bar.md': '',
        'library/projects/sub/baz.md': '',
      });
      expect(await fs.listDir('library/projects')).toEqual([
        { name: 'bar.md', kind: 'file' },
        { name: 'foo.md', kind: 'file' },
        { name: 'sub', kind: 'directory' },
      ]);
    });
  });

  describe('watch', () => {
    it('fires a create event on the first writeFile', async () => {
      const fs = new InMemoryAdapter();
      const handler = vi.fn();
      fs.watch('', handler);
      await fs.writeFile('TASKS.md', '');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0]?.[0]).toEqual<WatchEvent>({
        kind: 'create',
        path: 'TASKS.md',
      });
    });

    it('fires a modify event when an existing file is overwritten', async () => {
      const fs = new InMemoryAdapter({ 'TASKS.md': 'a' });
      const handler = vi.fn();
      fs.watch('', handler);
      await fs.writeFile('TASKS.md', 'b');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0]?.[0]).toEqual<WatchEvent>({
        kind: 'modify',
        path: 'TASKS.md',
      });
    });

    it('fires a delete event from the delete() helper', async () => {
      const fs = new InMemoryAdapter({ 'TASKS.md': 'a' });
      const handler = vi.fn();
      fs.watch('', handler);
      await fs.delete('TASKS.md');
      expect(handler).toHaveBeenCalledWith({ kind: 'delete', path: 'TASKS.md' });
    });

    it('delete() on a missing file is a no-op', async () => {
      const fs = new InMemoryAdapter();
      const handler = vi.fn();
      fs.watch('', handler);
      await fs.delete('nope');
      expect(handler).not.toHaveBeenCalled();
    });

    it('externalWrite fires a modify on an existing path', () => {
      const fs = new InMemoryAdapter({ 'TASKS.md': 'a' });
      const handler = vi.fn();
      fs.watch('', handler);
      fs.externalWrite('TASKS.md', 'b');
      expect(handler).toHaveBeenCalledWith({ kind: 'modify', path: 'TASKS.md' });
    });

    it('externalWrite fires a create on a new path', () => {
      const fs = new InMemoryAdapter();
      const handler = vi.fn();
      fs.watch('', handler);
      fs.externalWrite('new.md', 'a');
      expect(handler).toHaveBeenCalledWith({ kind: 'create', path: 'new.md' });
    });

    it('scopes events to a watched subdirectory', async () => {
      const fs = new InMemoryAdapter();
      const handler = vi.fn();
      fs.watch('library', handler);
      await fs.writeFile('TASKS.md', 'a');
      await fs.writeFile('library/projects/foo.md', 'b');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0]?.[0]).toEqual<WatchEvent>({
        kind: 'create',
        path: 'library/projects/foo.md',
      });
    });

    it('does not match a sibling that shares a prefix with the watched path', async () => {
      const fs = new InMemoryAdapter();
      const handler = vi.fn();
      fs.watch('lib', handler);
      await fs.writeFile('library/foo.md', 'a');
      expect(handler).not.toHaveBeenCalled();
    });

    it('stops firing after dispose', async () => {
      const fs = new InMemoryAdapter();
      const handler = vi.fn();
      const subscription = fs.watch('', handler);
      await fs.writeFile('TASKS.md', 'a');
      subscription.dispose();
      await fs.writeFile('TASKS.md', 'b');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('runs multiple subscribers independently', async () => {
      const fs = new InMemoryAdapter();
      const a = vi.fn();
      const b = vi.fn();
      fs.watch('', a);
      fs.watch('library', b);
      await fs.writeFile('library/foo.md', '');
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
    });

    it('disposing one subscription does not affect the other', async () => {
      const fs = new InMemoryAdapter();
      const a = vi.fn();
      const b = vi.fn();
      const subA = fs.watch('', a);
      fs.watch('', b);
      subA.dispose();
      await fs.writeFile('x.md', '');
      expect(a).not.toHaveBeenCalled();
      expect(b).toHaveBeenCalledTimes(1);
    });

    it('survives a subscriber that disposes itself mid-emit', async () => {
      const fs = new InMemoryAdapter();
      const other = vi.fn();
      const selfDisposing = vi.fn(() => subscription.dispose());
      const subscription = fs.watch('', selfDisposing);
      fs.watch('', other);
      await fs.writeFile('x.md', '');
      expect(selfDisposing).toHaveBeenCalledTimes(1);
      expect(other).toHaveBeenCalledTimes(1);
      await fs.writeFile('y.md', '');
      expect(selfDisposing).toHaveBeenCalledTimes(1);
      expect(other).toHaveBeenCalledTimes(2);
    });
  });

  describe('path normalisation', () => {
    it('treats leading and trailing slashes as equivalent', async () => {
      const fs = new InMemoryAdapter();
      await fs.writeFile('/TASKS.md/', 'hello');
      expect(await fs.readFile('TASKS.md')).toBe('hello');
    });

    it('normalises Windows-style backslashes to forward slashes', async () => {
      const fs = new InMemoryAdapter();
      await fs.writeFile('library\\projects\\foo.md', 'x');
      expect(await fs.readFile('library/projects/foo.md')).toBe('x');
    });

    it('normalises the constructor seed too', async () => {
      const fs = new InMemoryAdapter({
        '\\TASKS.md\\': 'one',
        'library\\foo.md': 'two',
      });
      expect(await fs.readFile('TASKS.md')).toBe('one');
      expect(await fs.readFile('library/foo.md')).toBe('two');
    });

    it('has() reflects the normalised key space', async () => {
      const fs = new InMemoryAdapter({ 'TASKS.md': '' });
      expect(fs.has('TASKS.md')).toBe(true);
      expect(fs.has('/TASKS.md')).toBe(true);
      expect(fs.has('nope')).toBe(false);
    });
  });
});
