// ExternalChangeWatcher — polls a file's `lastModified` to detect
// out-of-band edits (e.g. Claude rewriting TASKS.md while the app is open,
// or the user editing in VS Code on the side). Fires `onExternalChange`
// when the timestamp advances past the known baseline AND the autosave
// pipeline is idle. Pending local writes pause the poller until they
// flush — pairing with `Autosaver.isPending` enforces a last-write-wins
// resolution where the local user beats a concurrent external edit.
//
// Pure polling utility — adapter-independent. Callers wire it to
// `FSAFileAdapter.getMtime` (browser) or, eventually, to a native
// notifier (Tauri Phase 2).

export interface ExternalChangeWatcherOptions {
  /** Async fetch of the file's current modified-time, in epoch ms. */
  getMtime: () => Promise<number>;
  /** Modified-time of the file at the moment the vault was first loaded. */
  initialMtime: number;
  /** Poll interval in milliseconds. Defaults to 1000. */
  pollMs?: number;
  /**
   * Returns `true` while the shell has unflushed local writes. Polled on
   * every tick; when `true` the watcher skips the mtime check so local
   * mutations aren't clobbered by an external reload.
   */
  isLocalWritePending: () => boolean;
  /**
   * Called when the watcher detects an external edit. The shell should
   * reload the vault and then call `setBaseline()` with the new mtime to
   * avoid a re-trigger on the next tick.
   */
  onExternalChange: () => void | Promise<void>;
  /** Optional error sink for transient `getMtime` failures. */
  onError?: (err: unknown) => void;
}

export class ExternalChangeWatcher {
  private readonly getMtime: () => Promise<number>;
  private readonly pollMs: number;
  private readonly isLocalWritePending: () => boolean;
  private readonly onExternalChange: () => void | Promise<void>;
  private readonly onError?: (err: unknown) => void;
  private lastSeenMtime: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private tickInProgress = false;
  private disposed = false;

  constructor(options: ExternalChangeWatcherOptions) {
    this.getMtime = options.getMtime;
    this.pollMs = options.pollMs ?? 1000;
    this.isLocalWritePending = options.isLocalWritePending;
    this.onExternalChange = options.onExternalChange;
    if (options.onError) this.onError = options.onError;
    this.lastSeenMtime = options.initialMtime;
  }

  start(): void {
    if (this.disposed || this.timer !== null) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.pollMs);
  }

  /**
   * Update the baseline mtime — call after our own writes complete so the
   * next tick doesn't mistake our own write for an external one, and after
   * an external-reload settles.
   */
  setBaseline(mtime: number): void {
    this.lastSeenMtime = mtime;
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Test seam: trigger a single tick on demand (bypasses the timer). */
  async tickNow(): Promise<void> {
    await this.tick();
  }

  private async tick(): Promise<void> {
    if (this.disposed) return;
    if (this.tickInProgress) return;
    if (this.isLocalWritePending()) return;
    this.tickInProgress = true;
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
      this.tickInProgress = false;
    }
  }
}
