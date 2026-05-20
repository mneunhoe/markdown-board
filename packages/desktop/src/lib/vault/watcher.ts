// TauriExternalChangeWatcher — desktop counterpart to the web shell's
// polling `ExternalChangeWatcher`. Detects out-of-band edits (Claude or
// another editor rewriting `TASKS.md` while the app is open) but, instead
// of polling `getMtime` on a timer, it subscribes to the OS file-system
// notifier through `tauri-plugin-fs`'s native `watch` (a `notify`-backed
// Rust watcher). Native events are the trigger; the proven mtime-baseline
// + local-write-pending reconcile from the web watcher is the filter.
//
// Why keep the mtime baseline if the events are native? Two reasons:
//   1. Self-writes. Our own autosave write fires a `modify` event too. The
//      baseline (bumped via `setBaseline` after each local write) means a
//      post-write event whose mtime hasn't advanced past the baseline is a
//      no-op — same last-write-wins guard the poller relied on.
//   2. Atomic-rename saves. Editors that write-temp-then-rename can emit a
//      burst of create/remove/modify events; reconciling against a single
//      tracked file's mtime collapses the burst into at most one reload.
//
// The watch target is the vault root (recursive) so directory-level events
// for library/archive files are seen, but only the tracked file's mtime
// advancing past the baseline actually triggers a reload — matching the
// web watcher, which only ever tracked `TASKS.md`.

import type {
  DebouncedWatchOptions,
  UnwatchFn,
  WatchEvent,
  WatchEventKind,
} from '@tauri-apps/plugin-fs';
import { watch as pluginWatch } from '@tauri-apps/plugin-fs';

/**
 * The slice of `@tauri-apps/plugin-fs#watch` this watcher uses. Narrowed to
 * a single string path so tests can pass a fake without reconstructing the
 * full overloaded plugin signature. The real `watch` is assignable to it.
 */
export type NativeWatchFn = (
  path: string,
  cb: (event: WatchEvent) => void,
  options?: DebouncedWatchOptions,
) => Promise<UnwatchFn>;

export interface TauriExternalChangeWatcherOptions {
  /**
   * Absolute OS path to watch — typically the vault root. Watched
   * recursively by default so nested library/archive writes are seen.
   */
  watchPath: string;
  /** Watch recursively. Defaults to `true` (vault root). */
  recursive?: boolean;
  /**
   * Debounce delay (ms) handed to the native watcher. Coalesces the
   * event burst an editor emits on save. Defaults to 500.
   */
  delayMs?: number;
  /** Async fetch of the tracked file's current modified-time, epoch ms. */
  getMtime: () => Promise<number>;
  /** Modified-time of the tracked file when the vault was first loaded. */
  initialMtime: number;
  /**
   * Returns `true` while the shell has unflushed local writes. Checked on
   * every native event; when `true` the reconcile is skipped so local
   * mutations aren't clobbered by an external reload (last-write-wins,
   * local user beats the concurrent external edit).
   */
  isLocalWritePending: () => boolean;
  /**
   * Called when a native event reveals the tracked file's mtime has
   * advanced past the baseline. The shell should reload the vault and then
   * call `setBaseline()` with the new mtime to avoid a re-trigger.
   */
  onExternalChange: () => void | Promise<void>;
  /** Optional sink for watch-start and transient `getMtime` failures. */
  onError?: (err: unknown) => void;
  /**
   * Injection seam for the native watch function. Defaults to the real
   * `@tauri-apps/plugin-fs#watch`, which only works inside a Tauri webview;
   * tests pass a fake so the reconcile logic is exercised under happy-dom.
   */
  watch?: NativeWatchFn;
}

/**
 * `true` for events that can reflect a content change worth reconciling.
 * Pure `access` events (open / read / close) never change bytes, so they're
 * filtered out to avoid a needless `getMtime` round-trip on every read.
 */
function isContentRelevant(kind: WatchEventKind): boolean {
  if (kind === 'any' || kind === 'other') return true;
  return !('access' in kind);
}

export class TauriExternalChangeWatcher {
  private readonly watchPath: string;
  private readonly recursive: boolean;
  private readonly delayMs: number;
  private readonly getMtime: () => Promise<number>;
  private readonly isLocalWritePending: () => boolean;
  private readonly onExternalChange: () => void | Promise<void>;
  private readonly onError?: (err: unknown) => void;
  private readonly watchFn: NativeWatchFn;

  private lastSeenMtime: number;
  private unwatch: UnwatchFn | null = null;
  private started = false;
  private disposed = false;
  private reconcileInProgress = false;

  constructor(options: TauriExternalChangeWatcherOptions) {
    this.watchPath = options.watchPath;
    this.recursive = options.recursive ?? true;
    this.delayMs = options.delayMs ?? 500;
    this.getMtime = options.getMtime;
    this.isLocalWritePending = options.isLocalWritePending;
    this.onExternalChange = options.onExternalChange;
    if (options.onError) this.onError = options.onError;
    this.watchFn = options.watch ?? pluginWatch;
    this.lastSeenMtime = options.initialMtime;
  }

  /**
   * Subscribe to native file-system events for the watch path. Idempotent
   * and disposal-safe: a `dispose()` that lands before the underlying watch
   * promise resolves still tears the subscription down.
   */
  async start(): Promise<void> {
    if (this.disposed || this.started) return;
    this.started = true;
    try {
      const unwatch = await this.watchFn(this.watchPath, (event) => this.handleEvent(event), {
        recursive: this.recursive,
        delayMs: this.delayMs,
      });
      if (this.disposed) {
        unwatch();
        return;
      }
      this.unwatch = unwatch;
    } catch (err) {
      this.started = false;
      this.onError?.(err);
    }
  }

  /**
   * Update the baseline mtime — call after our own writes settle so the
   * native event they provoke isn't mistaken for an external edit, and
   * after an external-reload settles so it doesn't re-trigger.
   */
  setBaseline(mtime: number): void {
    this.lastSeenMtime = mtime;
  }

  dispose(): void {
    this.disposed = true;
    if (this.unwatch) {
      this.unwatch();
      this.unwatch = null;
    }
  }

  /** Test seam: run a reconcile directly, bypassing the event filter. */
  async tickNow(): Promise<void> {
    await this.reconcile();
  }

  private handleEvent(event: WatchEvent): void {
    if (this.disposed) return;
    if (!isContentRelevant(event.type)) return;
    void this.reconcile();
  }

  private async reconcile(): Promise<void> {
    if (this.disposed) return;
    if (this.reconcileInProgress) return;
    if (this.isLocalWritePending()) return;
    this.reconcileInProgress = true;
    try {
      const current = await this.getMtime();
      if (this.disposed) return;
      if (current > this.lastSeenMtime) {
        this.lastSeenMtime = current;
        await this.onExternalChange();
      }
    } catch (err) {
      this.onError?.(err);
    } finally {
      this.reconcileInProgress = false;
    }
  }
}
