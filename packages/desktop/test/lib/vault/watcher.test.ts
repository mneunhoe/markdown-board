import type {
  DebouncedWatchOptions,
  UnwatchFn,
  WatchEvent,
  WatchEventKind,
} from '@tauri-apps/plugin-fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  TauriExternalChangeWatcher,
  type NativeWatchFn,
  type TauriExternalChangeWatcherOptions,
} from '../../../src/lib/vault/watcher.js';

// The watcher top-imports the real `@tauri-apps/plugin-fs#watch`, which only
// works inside a Tauri webview. Stub the whole module so importing it under
// happy-dom is inert and an accidental use of the real path (instead of the
// injected fake) blows up loudly rather than silently no-op'ing.
vi.mock('@tauri-apps/plugin-fs', () => ({
  watch: () => {
    throw new Error('real plugin-fs watch must not be called in unit tests');
  },
}));

// --- event builders -------------------------------------------------------

function ev(type: WatchEventKind, path = '/vault/TASKS.md'): WatchEvent {
  return { type, paths: [path], attrs: null };
}

const MODIFY = ev({ modify: { kind: 'data', mode: 'content' } });
const CREATE = ev({ create: { kind: 'file' } });
const REMOVE = ev({ remove: { kind: 'file' } });
const ACCESS = ev({ access: { kind: 'open', mode: 'read' } });
const ANY = ev('any');
const OTHER = ev('other');

// --- fakes ----------------------------------------------------------------

/** Capturing watch fake: records calls, exposes a manual event emitter. */
function makeWatch() {
  const unwatch = vi.fn<UnwatchFn>();
  const calls: { path: string; options: DebouncedWatchOptions | undefined }[] = [];
  let cb: ((e: WatchEvent) => void) | null = null;
  const fn: NativeWatchFn = async (path, callback, options) => {
    calls.push({ path, options });
    cb = callback;
    return unwatch;
  };
  return {
    fn,
    unwatch,
    calls,
    emit(event: WatchEvent) {
      if (!cb) throw new Error('emit before watch started');
      cb(event);
    },
  };
}

/** Watch fake whose start promise resolves only when `resolveStart()` runs. */
function makeDeferredWatch() {
  const unwatch = vi.fn<UnwatchFn>();
  let resolve!: (u: UnwatchFn) => void;
  const fn: NativeWatchFn = () =>
    new Promise<UnwatchFn>((r) => {
      resolve = r;
    });
  return { fn, unwatch, resolveStart: () => resolve(unwatch) };
}

/** Let all pending microtasks + the fire-and-forget reconcile settle. */
function flush(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

// --- harness --------------------------------------------------------------

interface Harness {
  watcher: TauriExternalChangeWatcher;
  setMtime: (n: number) => void;
  getMtimeSpy: ReturnType<typeof vi.fn>;
  onExternalChange: ReturnType<typeof vi.fn>;
  onError: ReturnType<typeof vi.fn>;
}

function setup(
  overrides: Partial<TauriExternalChangeWatcherOptions> = {},
  watchFn: NativeWatchFn = makeWatch().fn,
  initialMtime = 100,
): Harness {
  let mtime = initialMtime;
  const getMtimeSpy = vi.fn(async () => mtime);
  const onExternalChange = vi.fn();
  const onError = vi.fn();
  const watcher = new TauriExternalChangeWatcher({
    watchPath: '/vault',
    getMtime: getMtimeSpy,
    initialMtime,
    isLocalWritePending: () => false,
    onExternalChange,
    onError,
    watch: watchFn,
    ...overrides,
  });
  return {
    watcher,
    setMtime: (n) => {
      mtime = n;
    },
    getMtimeSpy,
    onExternalChange,
    onError,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TauriExternalChangeWatcher', () => {
  describe('start', () => {
    it('subscribes to the watch path with recursive + debounce defaults', async () => {
      const w = makeWatch();
      const { watcher } = setup({}, w.fn);
      await watcher.start();
      expect(w.calls).toHaveLength(1);
      expect(w.calls[0]?.path).toBe('/vault');
      expect(w.calls[0]?.options).toEqual({ recursive: true, delayMs: 500 });
    });

    it('forwards custom recursive + delayMs', async () => {
      const w = makeWatch();
      const { watcher } = setup({ recursive: false, delayMs: 1200 }, w.fn);
      await watcher.start();
      expect(w.calls[0]?.options).toEqual({ recursive: false, delayMs: 1200 });
    });

    it('is idempotent — a second start does not double-subscribe', async () => {
      const w = makeWatch();
      const { watcher } = setup({}, w.fn);
      await watcher.start();
      await watcher.start();
      expect(w.calls).toHaveLength(1);
    });

    it('reports a watch-start failure to onError and allows a retry', async () => {
      const unwatch = vi.fn<UnwatchFn>();
      let attempt = 0;
      const flaky: NativeWatchFn = async () => {
        attempt += 1;
        if (attempt === 1) throw new Error('watch boom');
        return unwatch;
      };
      const { watcher, onError } = setup({}, flaky);
      await watcher.start();
      expect(onError).toHaveBeenCalledTimes(1);
      // started flag was rolled back, so a retry actually subscribes.
      await watcher.start();
      expect(attempt).toBe(2);
    });
  });

  describe('reconcile on native events', () => {
    it('fires onExternalChange when an external write advances the mtime', async () => {
      const w = makeWatch();
      const { watcher, setMtime, onExternalChange } = setup({}, w.fn);
      await watcher.start();
      setMtime(200);
      w.emit(MODIFY);
      await flush();
      expect(onExternalChange).toHaveBeenCalledTimes(1);
    });

    it('ignores an event whose mtime has not advanced (our own write)', async () => {
      const w = makeWatch();
      const { watcher, onExternalChange } = setup({}, w.fn);
      await watcher.start();
      w.emit(MODIFY); // mtime still 100 == baseline
      await flush();
      expect(onExternalChange).not.toHaveBeenCalled();
    });

    it.each([
      ['create', CREATE],
      ['remove', REMOVE],
      ['any', ANY],
      ['other', OTHER],
    ])('reconciles on a %s event', async (_label, event) => {
      const w = makeWatch();
      const { watcher, setMtime, onExternalChange } = setup({}, w.fn);
      await watcher.start();
      setMtime(150);
      w.emit(event);
      await flush();
      expect(onExternalChange).toHaveBeenCalledTimes(1);
    });

    it('skips access events without even reading the mtime', async () => {
      const w = makeWatch();
      const { watcher, setMtime, getMtimeSpy, onExternalChange } = setup({}, w.fn);
      await watcher.start();
      setMtime(999);
      w.emit(ACCESS);
      await flush();
      expect(getMtimeSpy).not.toHaveBeenCalled();
      expect(onExternalChange).not.toHaveBeenCalled();
    });

    it('skips reconcile while a local write is pending', async () => {
      const w = makeWatch();
      let pending = true;
      const { watcher, setMtime, onExternalChange } = setup(
        { isLocalWritePending: () => pending },
        w.fn,
      );
      await watcher.start();
      setMtime(200);
      w.emit(MODIFY);
      await flush();
      expect(onExternalChange).not.toHaveBeenCalled();
      // once the local write flushes, the next event reconciles.
      pending = false;
      w.emit(MODIFY);
      await flush();
      expect(onExternalChange).toHaveBeenCalledTimes(1);
    });

    it('fires again only when the mtime advances past the new baseline', async () => {
      const w = makeWatch();
      const { watcher, setMtime, onExternalChange } = setup({}, w.fn);
      await watcher.start();

      setMtime(200);
      w.emit(MODIFY);
      await flush();
      expect(onExternalChange).toHaveBeenCalledTimes(1);

      // same mtime → no re-trigger (baseline advanced to 200 internally).
      w.emit(MODIFY);
      await flush();
      expect(onExternalChange).toHaveBeenCalledTimes(1);

      setMtime(300);
      w.emit(MODIFY);
      await flush();
      expect(onExternalChange).toHaveBeenCalledTimes(2);
    });

    it('coalesces overlapping events into a single in-flight reconcile', async () => {
      const w = makeWatch();
      let resolveMtime!: (n: number) => void;
      const getMtime = vi.fn(
        () =>
          new Promise<number>((r) => {
            resolveMtime = r;
          }),
      );
      const onExternalChange = vi.fn();
      const watcher = new TauriExternalChangeWatcher({
        watchPath: '/vault',
        getMtime,
        initialMtime: 100,
        isLocalWritePending: () => false,
        onExternalChange,
        watch: w.fn,
      });
      await watcher.start();

      w.emit(MODIFY);
      w.emit(MODIFY); // second event lands while first reconcile awaits getMtime
      expect(getMtime).toHaveBeenCalledTimes(1);

      resolveMtime(200);
      await flush();
      expect(onExternalChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('setBaseline', () => {
    it('suppresses an event at or below the new baseline', async () => {
      const w = makeWatch();
      const { watcher, setMtime, onExternalChange } = setup({}, w.fn);
      await watcher.start();
      setMtime(250);
      watcher.setBaseline(250); // shell just wrote and bumped the baseline
      w.emit(MODIFY);
      await flush();
      expect(onExternalChange).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('unwatches and ignores subsequent events', async () => {
      const w = makeWatch();
      const { watcher, setMtime, onExternalChange } = setup({}, w.fn);
      await watcher.start();
      watcher.dispose();
      expect(w.unwatch).toHaveBeenCalledTimes(1);
      setMtime(200);
      w.emit(MODIFY);
      await flush();
      expect(onExternalChange).not.toHaveBeenCalled();
    });

    it('tears down a subscription disposed before the watch promise resolves', async () => {
      const deferred = makeDeferredWatch();
      const { watcher } = setup({}, deferred.fn);
      const startPromise = watcher.start();
      watcher.dispose();
      deferred.resolveStart();
      await startPromise;
      expect(deferred.unwatch).toHaveBeenCalledTimes(1);
    });

    it('does not fire onExternalChange when disposed mid-reconcile', async () => {
      const w = makeWatch();
      let resolveMtime!: (n: number) => void;
      const getMtime = vi.fn(
        () =>
          new Promise<number>((r) => {
            resolveMtime = r;
          }),
      );
      const onExternalChange = vi.fn();
      const watcher = new TauriExternalChangeWatcher({
        watchPath: '/vault',
        getMtime,
        initialMtime: 100,
        isLocalWritePending: () => false,
        onExternalChange,
        watch: w.fn,
      });
      await watcher.start();
      w.emit(MODIFY);
      watcher.dispose(); // disposes while getMtime is still pending
      resolveMtime(200);
      await flush();
      expect(onExternalChange).not.toHaveBeenCalled();
    });
  });

  describe('errors', () => {
    it('routes a getMtime failure to onError and recovers on the next event', async () => {
      const w = makeWatch();
      let throwOnce = true;
      const getMtime = vi.fn(async () => {
        if (throwOnce) {
          throwOnce = false;
          throw new Error('stat failed');
        }
        return 200;
      });
      const onError = vi.fn();
      const onExternalChange = vi.fn();
      const watcher = new TauriExternalChangeWatcher({
        watchPath: '/vault',
        getMtime,
        initialMtime: 100,
        isLocalWritePending: () => false,
        onExternalChange,
        onError,
        watch: w.fn,
      });
      await watcher.start();

      w.emit(MODIFY);
      await flush();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onExternalChange).not.toHaveBeenCalled();

      // in-progress guard was released, so the next event reconciles cleanly.
      w.emit(MODIFY);
      await flush();
      expect(onExternalChange).toHaveBeenCalledTimes(1);
    });

    it('swallows a getMtime failure when no onError sink is provided', async () => {
      const w = makeWatch();
      const getMtime = vi.fn(async () => {
        throw new Error('stat failed');
      });
      const watcher = new TauriExternalChangeWatcher({
        watchPath: '/vault',
        getMtime,
        initialMtime: 100,
        isLocalWritePending: () => false,
        onExternalChange: vi.fn(),
        watch: w.fn,
      });
      await watcher.start();
      w.emit(MODIFY);
      await expect(flush()).resolves.toBeUndefined();
    });
  });

  describe('tickNow', () => {
    it('reconciles directly, bypassing the event filter', async () => {
      const { watcher, setMtime, onExternalChange } = setup();
      await watcher.start();
      setMtime(200);
      await watcher.tickNow();
      expect(onExternalChange).toHaveBeenCalledTimes(1);
    });
  });
});
