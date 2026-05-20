// Per-plugin scoped key-value storage, persisted to a JSON file in the vault
// at `.markdown-board/plugins/<id>.json`. Portable (syncs with the vault) and
// pure over the adapter seam, so it's testable with the in-memory adapter.
//
// The whole doc is read once (lazily), cached, and rewritten on every
// set/delete. Plugin storage is small (timer state, preferences), so a
// read-modify-write of the full doc is fine and keeps the on-disk file
// human-readable.

import { FileNotFoundError } from '@markdown-board/core';
import type { ScopedStorage } from '@markdown-board/plugin-api';

import type { VaultAdapter } from '../platform.js';

export const PLUGIN_STORAGE_DIR = '.markdown-board/plugins';

export function pluginStoragePath(pluginId: string): string {
  return `${PLUGIN_STORAGE_DIR}/${pluginId}.json`;
}

type StorageDoc = Record<string, unknown>;

export function createScopedStorage(adapter: VaultAdapter, pluginId: string): ScopedStorage {
  const path = pluginStoragePath(pluginId);
  let cache: StorageDoc | null = null;

  async function load(): Promise<StorageDoc> {
    if (cache) return cache;
    try {
      const raw = await adapter.readFile(path);
      const parsed: unknown = JSON.parse(raw);
      cache =
        parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? (parsed as StorageDoc)
          : {};
    } catch (err) {
      // Missing file (first write) or unreadable JSON ⇒ start empty.
      if (err instanceof FileNotFoundError || err instanceof SyntaxError) {
        cache = {};
      } else {
        throw err;
      }
    }
    return cache;
  }

  async function persist(doc: StorageDoc): Promise<void> {
    cache = doc;
    await adapter.writeFile(path, `${JSON.stringify(doc, null, 2)}\n`);
  }

  return {
    async get<T = unknown>(key: string): Promise<T | undefined> {
      const doc = await load();
      return doc[key] as T | undefined;
    },
    async set(key: string, value: unknown): Promise<void> {
      const doc = await load();
      await persist({ ...doc, [key]: value });
    },
    async delete(key: string): Promise<void> {
      const doc = await load();
      if (!(key in doc)) return;
      const next = { ...doc };
      delete next[key];
      await persist(next);
    },
    async keys(): Promise<string[]> {
      return Object.keys(await load());
    },
  };
}
