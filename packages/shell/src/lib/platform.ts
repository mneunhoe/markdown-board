// VaultPlatform — the injection seam that lets one shared shell run on top
// of different host file systems. The web entry injects {FSA picker,
// FSAFileAdapter, polling ExternalChangeWatcher}; the desktop entry injects
// {Tauri dialog picker, TauriFileAdapter, native TauriExternalChangeWatcher}.
// Everything platform-specific (DOM picker APIs, the FSA cancel/unsupported
// error split, the Tauri plugin imports) lives in the entry points; the
// shell only ever sees this contract.

import type { FileAdapter } from '@markdown-board/core';

/**
 * The adapter the shell needs: the core `FileAdapter` contract plus the
 * `getMtime` extension (used by the external-change watcher) and the
 * `readBinary` extension (used by the custom-theme loader to read font /
 * logo files). Matches `FSAFileAdapter` / `TauriFileAdapter`.
 */
export type VaultAdapter = FileAdapter & {
  getMtime(path: string): Promise<number>;
  /** Read a file as raw bytes (for binary assets like fonts and logos). */
  readBinary(path: string): Promise<Uint8Array>;
  /** Human-readable label for the open vault (folder name or absolute path). */
  readonly displayPath?: string;
};

/**
 * The reconcile inputs the shell hands a watcher. Mirrors the options both
 * `ExternalChangeWatcher` (web, polling) and `TauriExternalChangeWatcher`
 * (desktop, native) already accept.
 */
export interface WatcherDeps {
  getMtime: () => Promise<number>;
  initialMtime: number;
  isLocalWritePending: () => boolean;
  onExternalChange: () => void | Promise<void>;
  onError?: (err: unknown) => void;
}

/**
 * The slice of an external-change watcher the shell drives. `start()` is
 * typed `void | Promise<void>` so the sync polling watcher and the async
 * native watcher both satisfy it — callers `await` it either way.
 */
export interface VaultWatcher {
  start(): void | Promise<void>;
  setBaseline(mtime: number): void;
  dispose(): void;
}

/**
 * An open request pushed by the host from *outside* the picker — desktop
 * drag-and-drop today, the recent-vaults menu later. The shell owns the
 * mount/error/loading reaction; the host only translates its native events
 * into these.
 */
export type ExternalOpenEvent =
  | { kind: 'open'; adapter: VaultAdapter }
  | { kind: 'error'; message: string }
  | { kind: 'dragstate'; active: boolean };

export type ExternalOpenHandler = (event: ExternalOpenEvent) => void | Promise<void>;

/** A previously opened vault the shell can offer for one-click reopen. */
export interface RecentVault {
  /** Absolute path used to reopen (opaque to the shell). */
  path: string;
  /** Display label (typically the folder basename). */
  name: string;
}

export interface VaultPlatform {
  /**
   * Pick a vault folder and build an adapter for it. Resolves to `null`
   * when the user cancels the picker (a normal, non-error outcome). Any
   * other failure (e.g. an unsupported environment) should throw.
   */
  pickVault(): Promise<VaultAdapter | null>;
  /** Construct the platform's external-change watcher from the shared deps. */
  createWatcher(adapter: VaultAdapter, deps: WatcherDeps): VaultWatcher;
  /** Whether vault-opening is available here. Web: FSA support. Desktop: always true. */
  isSupported(): boolean;
  /** Copy for the "can't open a vault here" empty state. Web-only in practice. */
  unsupportedMessage?: { title: string; hint: string };
  /**
   * Optional: subscribe to host-driven open requests (desktop drag-and-drop,
   * recent-vaults menu). Returns an unsubscribe fn. Unimplemented on web.
   */
  subscribeExternalOpen?(handler: ExternalOpenHandler): () => void;
  /** Optional: recently opened vaults to offer on the empty state. */
  listRecentVaults?(): RecentVault[];
  /**
   * Optional: reopen a recent vault by path. Resolves to `null` if the vault
   * is gone (the platform should prune it from the recents list).
   */
  openRecentVault?(path: string): Promise<VaultAdapter | null>;
  /** Optional: open a second app window (desktop multi-window). */
  openNewWindow?(): Promise<void>;
}
