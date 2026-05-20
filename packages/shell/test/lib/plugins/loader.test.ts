import type {
  Disposable,
  PluginContext,
  PluginManifest,
  PluginModule,
} from '@markdown-board/plugin-api';
import { describe, expect, it, vi } from 'vitest';

import {
  activatePlugin,
  isCompatible,
  IncompatiblePluginError,
} from '../../../src/lib/plugins/loader.js';

function manifest(over: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: 'demo',
    name: 'Demo',
    version: '1.0.0',
    entry: 'main.js',
    minAppVersion: '1.0.0',
    ...over,
  };
}

// Minimal context — the loader only reads `appVersion` and passes the object
// straight to `activate`.
function context(appVersion = '1.0.0'): PluginContext {
  const stub = { register: () => ({ dispose() {} }) };
  return {
    manifest: manifest(),
    appVersion,
    commands: stub,
    views: stub,
    slots: stub,
    taskActions: stub,
    hooks: { on: () => ({ dispose() {} }) },
    storage: {
      get: async () => undefined,
      set: async () => {},
      delete: async () => {},
      keys: async () => [],
    },
    tasks: { find: () => null, mutate: () => false },
    ui: { saveFile: async () => {}, notify: () => {} },
    settings: { get: () => ({}) },
    log: { info: () => {}, warn: () => {}, error: () => {} },
  } as unknown as PluginContext;
}

describe('isCompatible', () => {
  it('accepts an exact match', () => {
    expect(isCompatible('1.0.0', '1.0.0')).toBe(true);
  });
  it('accepts a host newer in patch/minor within the same major', () => {
    expect(isCompatible('1.0.0', '1.2.3')).toBe(true);
    expect(isCompatible('1.1.0', '1.1.5')).toBe(true);
  });
  it('rejects a host older than required', () => {
    expect(isCompatible('1.2.0', '1.1.9')).toBe(false);
  });
  it('rejects a major-version mismatch', () => {
    expect(isCompatible('1.0.0', '2.0.0')).toBe(false);
    expect(isCompatible('2.0.0', '1.9.9')).toBe(false);
  });
  it('tolerates caret / range prefixes', () => {
    expect(isCompatible('^1.0.0', '1.4.0')).toBe(true);
    expect(isCompatible('>=1.2.0', '1.2.0')).toBe(true);
  });
});

describe('activatePlugin', () => {
  it('activates a compatible plugin and reports the manifest', async () => {
    const activate = vi.fn();
    const mod: PluginModule = { activate };
    const handle = await activatePlugin(mod, manifest(), context(), []);
    expect(activate).toHaveBeenCalledOnce();
    expect(handle.manifest.id).toBe('demo');
  });

  it('refuses an incompatible plugin without calling activate', async () => {
    const activate = vi.fn();
    await expect(
      activatePlugin({ activate }, manifest({ minAppVersion: '2.0.0' }), context('1.0.0'), []),
    ).rejects.toBeInstanceOf(IncompatiblePluginError);
    expect(activate).not.toHaveBeenCalled();
  });

  it('disposes tracked registrations (reverse order) and calls deactivate', async () => {
    const order: string[] = [];
    const make = (tag: string): Disposable => ({
      dispose: () => {
        order.push(tag);
      },
    });
    const disposables = [make('a'), make('b')];
    const deactivate = vi.fn(() => {
      order.push('deactivate');
    });
    const handle = await activatePlugin(
      { activate: () => {}, deactivate },
      manifest(),
      context(),
      disposables,
    );
    await handle.deactivate();
    expect(deactivate).toHaveBeenCalledOnce();
    expect(order).toEqual(['deactivate', 'b', 'a']);
  });

  it('still disposes registrations when deactivate throws', async () => {
    const disposed = vi.fn();
    const handle = await activatePlugin(
      {
        activate: () => {},
        deactivate: () => {
          throw new Error('bad teardown');
        },
      },
      manifest(),
      context(),
      [{ dispose: disposed }],
    );
    await handle.deactivate();
    expect(disposed).toHaveBeenCalledOnce();
  });
});
