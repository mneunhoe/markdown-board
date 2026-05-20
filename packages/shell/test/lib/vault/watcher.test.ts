import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ExternalChangeWatcher } from '../../../src/lib/vault/watcher.js';

interface Harness {
  mtime: number;
  pending: boolean;
  externalCalls: number;
  errors: unknown[];
  watcher: ExternalChangeWatcher;
}

function makeWatcher(overrides: { initialMtime?: number; pollMs?: number } = {}): Harness {
  const state = { mtime: 1000, pending: false, externalCalls: 0, errors: [] as unknown[] };
  const watcher = new ExternalChangeWatcher({
    getMtime: async () => state.mtime,
    initialMtime: overrides.initialMtime ?? 1000,
    pollMs: overrides.pollMs ?? 1000,
    isLocalWritePending: () => state.pending,
    onExternalChange: () => {
      state.externalCalls += 1;
    },
    onError: (err) => state.errors.push(err),
  });
  return {
    get mtime() {
      return state.mtime;
    },
    set mtime(v) {
      state.mtime = v;
    },
    get pending() {
      return state.pending;
    },
    set pending(v) {
      state.pending = v;
    },
    get externalCalls() {
      return state.externalCalls;
    },
    get errors() {
      return state.errors;
    },
    watcher,
  };
}

describe('ExternalChangeWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires onExternalChange when mtime advances past the baseline', async () => {
    const h = makeWatcher({ initialMtime: 1000 });
    h.mtime = 2000;
    await h.watcher.tickNow();
    expect(h.externalCalls).toBe(1);
  });

  it('does not fire when mtime is unchanged', async () => {
    const h = makeWatcher({ initialMtime: 1000 });
    await h.watcher.tickNow();
    expect(h.externalCalls).toBe(0);
  });

  it('does not fire when mtime is older than the baseline (clock skew)', async () => {
    const h = makeWatcher({ initialMtime: 5000 });
    h.mtime = 1000;
    await h.watcher.tickNow();
    expect(h.externalCalls).toBe(0);
  });

  it('skips the tick while local writes are pending', async () => {
    const h = makeWatcher({ initialMtime: 1000 });
    h.mtime = 2000;
    h.pending = true;
    await h.watcher.tickNow();
    expect(h.externalCalls).toBe(0);
    h.pending = false;
    await h.watcher.tickNow();
    expect(h.externalCalls).toBe(1);
  });

  it('updates the baseline after firing so consecutive ticks do not re-fire', async () => {
    const h = makeWatcher({ initialMtime: 1000 });
    h.mtime = 2000;
    await h.watcher.tickNow();
    await h.watcher.tickNow();
    expect(h.externalCalls).toBe(1);
  });

  it('setBaseline() acknowledges a known write', async () => {
    const h = makeWatcher({ initialMtime: 1000 });
    h.mtime = 2000;
    h.watcher.setBaseline(2000);
    await h.watcher.tickNow();
    expect(h.externalCalls).toBe(0);
  });

  it('start() polls on the configured interval', async () => {
    const h = makeWatcher({ initialMtime: 1000, pollMs: 500 });
    h.watcher.start();
    h.mtime = 2000;
    await vi.advanceTimersByTimeAsync(500);
    expect(h.externalCalls).toBe(1);
    h.mtime = 3000;
    await vi.advanceTimersByTimeAsync(500);
    expect(h.externalCalls).toBe(2);
  });

  it('dispose() stops further polling', async () => {
    const h = makeWatcher({ initialMtime: 1000, pollMs: 500 });
    h.watcher.start();
    h.watcher.dispose();
    h.mtime = 2000;
    await vi.advanceTimersByTimeAsync(2000);
    expect(h.externalCalls).toBe(0);
  });

  it('start() after dispose() is a no-op', async () => {
    const h = makeWatcher({ initialMtime: 1000, pollMs: 500 });
    h.watcher.dispose();
    h.watcher.start();
    h.mtime = 2000;
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.externalCalls).toBe(0);
  });

  it('routes getMtime errors through onError without stopping the watcher', async () => {
    let throwNext = true;
    const state = { externalCalls: 0, errors: [] as unknown[] };
    const watcher = new ExternalChangeWatcher({
      getMtime: async () => {
        if (throwNext) {
          throwNext = false;
          throw new Error('transient');
        }
        return 5000;
      },
      initialMtime: 1000,
      isLocalWritePending: () => false,
      onExternalChange: () => {
        state.externalCalls += 1;
      },
      onError: (err) => state.errors.push(err),
    });
    await watcher.tickNow();
    expect(state.errors).toHaveLength(1);
    expect(state.externalCalls).toBe(0);
    await watcher.tickNow();
    expect(state.externalCalls).toBe(1);
  });
});
