// Folder drag-and-drop → open-vault wiring for the desktop shell.
//
// Translates Tauri's native window drag-drop events into the shell's
// platform-agnostic `ExternalOpenHandler` channel: drag enter/over toggles
// the drop overlay on, leave toggles it off, and a drop validates that the
// first path is a directory before handing a `TauriFileAdapter` to the shell
// (a dropped file surfaces a friendly error instead of a confusing load
// failure). All Tauri imports are behind an injection seam so the logic is
// unit-testable under happy-dom without a live webview.

import type { ExternalOpenHandler, VaultAdapter } from '@markdown-board/shell';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { stat } from '@tauri-apps/plugin-fs';
import { TauriFileAdapter } from './adapters/index.js';

/** The slice of a Tauri drag-drop payload this module reads. */
export type DragDropPayload =
  | { type: 'enter'; paths: string[] }
  | { type: 'over' }
  | { type: 'drop'; paths: string[] }
  | { type: 'leave' };

export interface FolderDropDeps {
  /** Subscribe to native drag-drop events; resolves to an unlisten fn. */
  onDragDropEvent: (cb: (payload: DragDropPayload) => void) => Promise<() => void>;
  /** Stat a path. Only `isDirectory` is consulted. */
  stat: (path: string) => Promise<{ isDirectory: boolean }>;
  /** Build a vault adapter for a dropped directory path. */
  makeAdapter: (path: string) => VaultAdapter;
}

const defaultDeps: FolderDropDeps = {
  onDragDropEvent: (cb) =>
    getCurrentWebview().onDragDropEvent((event) => cb(event.payload as DragDropPayload)),
  stat: (path) => stat(path),
  makeAdapter: (path) => new TauriFileAdapter(path),
};

/**
 * Wire folder drag-and-drop into the shell's external-open channel. Returns
 * an unsubscribe fn; disposal is safe across the async listener setup.
 */
export function subscribeFolderDrop(
  handler: ExternalOpenHandler,
  overrides: Partial<FolderDropDeps> = {},
): () => void {
  const deps: FolderDropDeps = { ...defaultDeps, ...overrides };
  let unlisten: (() => void) | null = null;
  let disposed = false;

  void deps
    .onDragDropEvent((payload) => {
      if (payload.type === 'enter' || payload.type === 'over') {
        void handler({ kind: 'dragstate', active: true });
        return;
      }
      if (payload.type === 'leave') {
        void handler({ kind: 'dragstate', active: false });
        return;
      }
      // payload.type === 'drop'
      const path = payload.paths[0];
      void (async () => {
        await handler({ kind: 'dragstate', active: false });
        if (!path) return;
        try {
          const info = await deps.stat(path);
          if (!info.isDirectory) {
            await handler({
              kind: 'error',
              message: 'Drop a folder, not a file, to open it as a vault.',
            });
            return;
          }
          await handler({ kind: 'open', adapter: deps.makeAdapter(path) });
        } catch (err) {
          await handler({
            kind: 'error',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      })();
    })
    .then((fn) => {
      if (disposed) fn();
      else unlisten = fn;
    });

  return () => {
    disposed = true;
    unlisten?.();
    unlisten = null;
  };
}
