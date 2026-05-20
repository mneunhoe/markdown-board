import { describe, expect, it, vi } from 'vitest';

import { checkForUpdates, type UpdateLike, type UpdaterDeps } from '../../src/lib/updater.js';

function deps(overrides: Partial<UpdaterDeps> = {}): UpdaterDeps {
  return {
    check: vi.fn(() => Promise.resolve(null)),
    ask: vi.fn(() => Promise.resolve(true)),
    relaunch: vi.fn(() => Promise.resolve()),
    notify: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

function fakeUpdate(downloadAndInstall = vi.fn(() => Promise.resolve())): UpdateLike {
  return { version: '0.2.1', downloadAndInstall };
}

describe('checkForUpdates', () => {
  it('does nothing when no update is available', async () => {
    const d = deps({ check: vi.fn(() => Promise.resolve(null)) });
    await checkForUpdates(d);
    expect(d.ask).not.toHaveBeenCalled();
    expect(d.relaunch).not.toHaveBeenCalled();
  });

  it('downloads, installs, and relaunches when the user accepts', async () => {
    const install = vi.fn(() => Promise.resolve());
    const d = deps({
      check: vi.fn(() => Promise.resolve(fakeUpdate(install))),
      ask: vi.fn(() => Promise.resolve(true)),
    });
    await checkForUpdates(d);
    expect(d.ask).toHaveBeenCalledOnce();
    expect(install).toHaveBeenCalledOnce();
    expect(d.relaunch).toHaveBeenCalledOnce();
  });

  it('does not install when the user declines', async () => {
    const install = vi.fn(() => Promise.resolve());
    const d = deps({
      check: vi.fn(() => Promise.resolve(fakeUpdate(install))),
      ask: vi.fn(() => Promise.resolve(false)),
    });
    await checkForUpdates(d);
    expect(install).not.toHaveBeenCalled();
    expect(d.relaunch).not.toHaveBeenCalled();
  });

  it('swallows a failed check without prompting', async () => {
    const d = deps({ check: vi.fn(() => Promise.reject(new Error('offline'))) });
    await expect(checkForUpdates(d)).resolves.toBeUndefined();
    expect(d.ask).not.toHaveBeenCalled();
  });

  it('notifies and does not relaunch when the install fails', async () => {
    const install = vi.fn(() => Promise.reject(new Error('signature mismatch')));
    const d = deps({
      check: vi.fn(() => Promise.resolve(fakeUpdate(install))),
      ask: vi.fn(() => Promise.resolve(true)),
    });
    await checkForUpdates(d);
    expect(d.relaunch).not.toHaveBeenCalled();
    expect(d.notify).toHaveBeenCalledOnce();
    expect(vi.mocked(d.notify).mock.calls[0]?.[0]).toContain('signature mismatch');
  });
});
