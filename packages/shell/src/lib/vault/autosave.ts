// Autosaver — debounced write-back of a single file's contents.
//
// `schedule(content)` (re)starts a debounce timer; when the timer fires the
// most-recently-scheduled content is handed to the user-provided `write`
// callback. Consecutive schedules within the debounce window coalesce into
// one write. `flush()` writes any pending content immediately and waits for
// any in-flight write to complete. `isPending` is true while either a timer
// is running or a write is in flight — used by the external-change watcher
// to defer reloads so user mutations aren't clobbered.
//
// Errors from `write` flow through the optional `onError` callback (the
// shell turns them into a `role=alert` line); the next `schedule` call
// will retry.

export interface AutosaverOptions {
  /** Async sink that performs the actual write. */
  write: (content: string) => Promise<void>;
  /** Debounce window in milliseconds. Defaults to 500. */
  debounceMs?: number;
  /** Called when the write callback rejects. Optional. */
  onError?: (err: unknown) => void;
}

export class Autosaver {
  private readonly write: (content: string) => Promise<void>;
  private readonly debounceMs: number;
  private readonly onError?: (err: unknown) => void;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingContent: string | null = null;
  private writingPromise: Promise<void> | null = null;
  private disposed = false;

  constructor(options: AutosaverOptions) {
    this.write = options.write;
    this.debounceMs = options.debounceMs ?? 500;
    if (options.onError) this.onError = options.onError;
  }

  /** Schedule a write of `content` after the debounce window. */
  schedule(content: string): void {
    if (this.disposed) return;
    this.pendingContent = content;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.runPending();
    }, this.debounceMs);
  }

  /** True while a write is queued (timer running) or actively in flight. */
  get isPending(): boolean {
    return this.timer !== null || this.writingPromise !== null;
  }

  /**
   * Write any pending content immediately and wait for any in-flight write
   * to finish. Safe to call when nothing is pending.
   */
  async flush(): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
      await this.runPending();
    } else if (this.writingPromise) {
      await this.writingPromise;
    }
  }

  /** Cancel any pending timer; in-flight writes are allowed to complete. */
  dispose(): void {
    this.disposed = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pendingContent = null;
  }

  private async runPending(): Promise<void> {
    this.timer = null;
    if (this.pendingContent === null) return;
    const content = this.pendingContent;
    this.pendingContent = null;

    // If a previous write is still in flight, wait for it before issuing
    // the next — keeps the on-disk order matching the schedule order.
    if (this.writingPromise) {
      try {
        await this.writingPromise;
      } catch {
        // The previous write's error already reported via onError.
      }
    }

    const promise = this.write(content).catch((err: unknown) => {
      this.onError?.(err);
    });
    this.writingPromise = promise;
    try {
      await promise;
    } finally {
      // Only clear the slot if the in-flight promise is still ours — a
      // later schedule may have already started another write.
      if (this.writingPromise === promise) {
        this.writingPromise = null;
      }
    }
  }
}
