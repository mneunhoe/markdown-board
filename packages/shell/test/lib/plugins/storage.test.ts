import { InMemoryAdapter } from '@markdown-board/core';
import { describe, expect, it } from 'vitest';

import { createScopedStorage, pluginStoragePath } from '../../../src/lib/plugins/storage.js';
import type { VaultAdapter } from '../../../src/lib/platform.js';

// The scoped store only needs readFile/writeFile; wrap an InMemoryAdapter to
// satisfy the VaultAdapter shape (getMtime/readBinary unused here).
function adapter(initial: Record<string, string> = {}): {
  vault: VaultAdapter;
  mem: InMemoryAdapter;
} {
  const mem = new InMemoryAdapter(initial);
  const vault = mem as unknown as VaultAdapter;
  return { vault, mem };
}

describe('pluginStoragePath', () => {
  it('namespaces under .markdown-board/plugins', () => {
    expect(pluginStoragePath('pomodoro')).toBe('.markdown-board/plugins/pomodoro.json');
  });
});

describe('createScopedStorage', () => {
  it('returns undefined for a missing key (no file yet)', async () => {
    const { vault } = adapter();
    const store = createScopedStorage(vault, 'p');
    expect(await store.get('nope')).toBeUndefined();
  });

  it('persists a value to the namespaced file and reads it back', async () => {
    const { vault, mem } = adapter();
    const store = createScopedStorage(vault, 'pomodoro');
    await store.set('state', { phase: 'focus', count: 3 });
    expect(await store.get('state')).toEqual({ phase: 'focus', count: 3 });
    expect(mem.has('.markdown-board/plugins/pomodoro.json')).toBe(true);
  });

  it('round-trips through a fresh store reading the same file', async () => {
    const { vault } = adapter();
    await createScopedStorage(vault, 'p').set('k', 42);
    const reread = createScopedStorage(vault, 'p');
    expect(await reread.get<number>('k')).toBe(42);
  });

  it('lists keys and deletes them', async () => {
    const { vault } = adapter();
    const store = createScopedStorage(vault, 'p');
    await store.set('a', 1);
    await store.set('b', 2);
    expect((await store.keys()).sort()).toEqual(['a', 'b']);
    await store.delete('a');
    expect(await store.keys()).toEqual(['b']);
    expect(await store.get('a')).toBeUndefined();
  });

  it('treats a corrupt JSON file as empty rather than throwing', async () => {
    const { vault } = adapter({ '.markdown-board/plugins/p.json': '{ not json' });
    const store = createScopedStorage(vault, 'p');
    expect(await store.get('x')).toBeUndefined();
  });

  it('scopes plugins to separate files', async () => {
    const { vault } = adapter();
    await createScopedStorage(vault, 'one').set('k', 'v1');
    await createScopedStorage(vault, 'two').set('k', 'v2');
    expect(await createScopedStorage(vault, 'one').get('k')).toBe('v1');
    expect(await createScopedStorage(vault, 'two').get('k')).toBe('v2');
  });
});
