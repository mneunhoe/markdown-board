import { describe, expect, it } from 'vitest';

import {
  basename,
  loadRecents,
  recordRecent,
  removeRecent,
  type RecentsStorage,
} from '../../src/lib/recents.js';

function fakeStorage(initial?: string): RecentsStorage {
  const map = new Map<string, string>();
  if (initial !== undefined) map.set('markdown-board:recent-vaults', initial);
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}

describe('basename', () => {
  it('returns the last segment for posix paths', () => {
    expect(basename('/Users/me/vault')).toBe('vault');
  });
  it('tolerates a trailing slash', () => {
    expect(basename('/Users/me/vault/')).toBe('vault');
  });
  it('handles windows backslash separators', () => {
    expect(basename('C:\\Users\\me\\notes')).toBe('notes');
  });
  it('returns the whole string when there is no separator', () => {
    expect(basename('vault')).toBe('vault');
  });
});

describe('loadRecents', () => {
  it('returns [] when nothing is stored', () => {
    expect(loadRecents(fakeStorage())).toEqual([]);
  });
  it('returns [] on malformed JSON', () => {
    expect(loadRecents(fakeStorage('{not json'))).toEqual([]);
  });
  it('returns [] when the stored value is not an array', () => {
    expect(loadRecents(fakeStorage('{"a":1}'))).toEqual([]);
  });
  it('maps stored paths to {path, name}, deriving names on read', () => {
    const storage = fakeStorage(JSON.stringify(['/Users/me/alpha', '/srv/beta']));
    expect(loadRecents(storage)).toEqual([
      { path: '/Users/me/alpha', name: 'alpha' },
      { path: '/srv/beta', name: 'beta' },
    ]);
  });
  it('filters out non-string / empty entries', () => {
    const storage = fakeStorage(JSON.stringify(['/a', 42, '', null, '/b']));
    expect(loadRecents(storage).map((r) => r.path)).toEqual(['/a', '/b']);
  });
});

describe('recordRecent', () => {
  it('adds a new path to the front', () => {
    const storage = fakeStorage(JSON.stringify(['/a']));
    recordRecent('/b', storage);
    expect(loadRecents(storage).map((r) => r.path)).toEqual(['/b', '/a']);
  });
  it('moves an existing path to the front without duplicating', () => {
    const storage = fakeStorage(JSON.stringify(['/a', '/b', '/c']));
    recordRecent('/c', storage);
    expect(loadRecents(storage).map((r) => r.path)).toEqual(['/c', '/a', '/b']);
  });
  it('caps the list at 8 entries', () => {
    const storage = fakeStorage();
    for (let i = 0; i < 12; i++) recordRecent(`/vault-${i}`, storage);
    const paths = loadRecents(storage).map((r) => r.path);
    expect(paths).toHaveLength(8);
    expect(paths[0]).toBe('/vault-11');
    expect(paths).not.toContain('/vault-3');
  });
});

describe('removeRecent', () => {
  it('drops the given path', () => {
    const storage = fakeStorage(JSON.stringify(['/a', '/b', '/c']));
    removeRecent('/b', storage);
    expect(loadRecents(storage).map((r) => r.path)).toEqual(['/a', '/c']);
  });
});
