// Auto-update check for the desktop app.
//
// On launch (see main.ts) this asks GitHub Releases — via the endpoint +
// pubkey in tauri.conf.json — whether a newer signed build exists. If so it
// prompts with a native dialog and, on confirmation, downloads, installs, and
// relaunches. A failed check never blocks startup (offline, GitHub down, or
// running outside a Tauri webview during `pnpm dev`). The Tauri imports are
// behind an injection seam so the flow is unit-testable under happy-dom.

import { ask, message } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';

type DialogOptions = { title?: string; kind?: 'info' | 'warning' | 'error' };

/** The slice of plugin-updater's `Update` this module uses. */
export interface UpdateLike {
  version: string;
  downloadAndInstall(): Promise<void>;
}

export interface UpdaterDeps {
  check: () => Promise<UpdateLike | null>;
  ask: (msg: string, options?: DialogOptions) => Promise<boolean>;
  relaunch: () => Promise<void>;
  notify: (msg: string, options?: DialogOptions) => Promise<void>;
}

const defaultDeps: UpdaterDeps = {
  check: () => check(),
  ask: (msg, options) => ask(msg, options),
  relaunch: () => relaunch(),
  notify: async (msg, options) => {
    await message(msg, options);
  },
};

export async function checkForUpdates(overrides: Partial<UpdaterDeps> = {}): Promise<void> {
  const deps: UpdaterDeps = { ...defaultDeps, ...overrides };

  let update: UpdateLike | null = null;
  try {
    update = await deps.check();
  } catch {
    // Never let a failed check block app usage.
    return;
  }
  if (!update) return;

  const proceed = await deps.ask(
    `markdown-board ${update.version} is available. Download and restart to update now?`,
    { title: 'Update available', kind: 'info' },
  );
  if (!proceed) return;

  try {
    await update.downloadAndInstall();
    await deps.relaunch();
  } catch (err) {
    await deps.notify(`Update failed: ${err instanceof Error ? err.message : String(err)}`, {
      title: 'Update failed',
      kind: 'error',
    });
  }
}
