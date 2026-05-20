import type { ExternalOpenEvent, VaultAdapter } from '@markdown-board/shell';
import { describe, expect, it, vi } from 'vitest';

import {
  subscribeFolderDrop,
  type DragDropPayload,
  type FolderDropDeps,
} from '../../src/lib/dnd.js';

const flush = () => new Promise((r) => setTimeout(r, 0));

function harness(overrides: Partial<FolderDropDeps> = {}) {
  const events: ExternalOpenEvent[] = [];
  const unlisten = vi.fn();
  let captured: ((p: DragDropPayload) => void) | null = null;
  const fakeAdapter = { rootPath: '/vault' } as unknown as VaultAdapter;

  const deps: FolderDropDeps = {
    onDragDropEvent: (cb) => {
      captured = cb;
      return Promise.resolve(unlisten);
    },
    stat: vi.fn(() => Promise.resolve({ isDirectory: true })),
    makeAdapter: vi.fn(() => fakeAdapter),
    ...overrides,
  };

  const dispose = subscribeFolderDrop((e) => void events.push(e), deps);
  return {
    events,
    unlisten,
    fakeAdapter,
    deps,
    dispose,
    emit: (p: DragDropPayload) => captured!(p),
  };
}

describe('subscribeFolderDrop', () => {
  it('toggles drag state on enter / over / leave', () => {
    const h = harness();
    h.emit({ type: 'enter', paths: ['/x'] });
    h.emit({ type: 'over' });
    h.emit({ type: 'leave' });
    expect(h.events).toEqual([
      { kind: 'dragstate', active: true },
      { kind: 'dragstate', active: true },
      { kind: 'dragstate', active: false },
    ]);
  });

  it('opens a dropped directory with a freshly built adapter', async () => {
    const h = harness();
    h.emit({ type: 'drop', paths: ['/Users/me/vault'] });
    await flush();
    expect(h.deps.stat).toHaveBeenCalledWith('/Users/me/vault');
    expect(h.deps.makeAdapter).toHaveBeenCalledWith('/Users/me/vault');
    expect(h.events).toEqual([
      { kind: 'dragstate', active: false },
      { kind: 'open', adapter: h.fakeAdapter },
    ]);
  });

  it('reports a friendly error when a file (not a folder) is dropped', async () => {
    const h = harness({ stat: vi.fn(() => Promise.resolve({ isDirectory: false })) });
    h.emit({ type: 'drop', paths: ['/Users/me/notes.md'] });
    await flush();
    expect(h.deps.makeAdapter).not.toHaveBeenCalled();
    expect(h.events).toEqual([
      { kind: 'dragstate', active: false },
      { kind: 'error', message: 'Drop a folder, not a file, to open it as a vault.' },
    ]);
  });

  it('surfaces a stat failure as an error event', async () => {
    const h = harness({ stat: vi.fn(() => Promise.reject(new Error('permission denied'))) });
    h.emit({ type: 'drop', paths: ['/root/secret'] });
    await flush();
    expect(h.events).toEqual([
      { kind: 'dragstate', active: false },
      { kind: 'error', message: 'permission denied' },
    ]);
  });

  it('ignores a drop with no paths (only clears drag state)', async () => {
    const h = harness();
    h.emit({ type: 'drop', paths: [] });
    await flush();
    expect(h.deps.stat).not.toHaveBeenCalled();
    expect(h.events).toEqual([{ kind: 'dragstate', active: false }]);
  });

  it('unlistens on dispose', async () => {
    const h = harness();
    await flush(); // let the onDragDropEvent promise resolve
    h.dispose();
    expect(h.unlisten).toHaveBeenCalledTimes(1);
  });
});
