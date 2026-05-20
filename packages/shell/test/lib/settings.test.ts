import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  _resetThemeListener,
  applyTheme,
  loadSettings,
  saveSettings,
} from '../../src/lib/settings.js';

describe('loadSettings / saveSettings', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('returns DEFAULT_SETTINGS when nothing is stored', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips through saveSettings', () => {
    const settings = {
      theme: 'dark' as const,
      grammarProfile: 'default' as const,
      autosaveDelayMs: 750,
      projectColorOverrides: { PSD_GAN: '#ff0000' },
      shortcuts: { 'go-board': 'Mod+B' },
    };
    saveSettings(settings);
    expect(loadSettings()).toEqual(settings);
  });

  it('falls back to defaults for unknown theme values', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'neon', grammarProfile: 'default' }));
    expect(loadSettings().theme).toBe(DEFAULT_SETTINGS.theme);
  });

  it('falls back to defaults for unknown grammar profiles', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'dark', grammarProfile: 'custom' }));
    expect(loadSettings().grammarProfile).toBe(DEFAULT_SETTINGS.grammarProfile);
  });

  it('backfills new fields with defaults for legacy stored settings', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'dark', grammarProfile: 'default' }));
    const loaded = loadSettings();
    expect(loaded.autosaveDelayMs).toBe(DEFAULT_SETTINGS.autosaveDelayMs);
    expect(loaded.projectColorOverrides).toEqual({});
    expect(loaded.shortcuts).toEqual({});
  });

  it('keeps string shortcut overrides, including empty (unbind) values', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ shortcuts: { 'go-list': 'Mod+L', 'command-palette': '', bad: 5 } }),
    );
    expect(loadSettings().shortcuts).toEqual({ 'go-list': 'Mod+L', 'command-palette': '' });
  });

  it('clamps autosaveDelayMs into the allowed range', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ autosaveDelayMs: 99_999 }));
    expect(loadSettings().autosaveDelayMs).toBe(10_000);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ autosaveDelayMs: 1 }));
    expect(loadSettings().autosaveDelayMs).toBe(100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ autosaveDelayMs: 'fast' }));
    expect(loadSettings().autosaveDelayMs).toBe(DEFAULT_SETTINGS.autosaveDelayMs);
  });

  it('drops non-string project colour overrides', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ projectColorOverrides: { Good: '#abc', Bad: 42, Empty: '' } }),
    );
    expect(loadSettings().projectColorOverrides).toEqual({ Good: '#abc' });
  });

  it('falls back to defaults when localStorage holds invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('persists under the expected storage key', () => {
    const settings = {
      theme: 'light' as const,
      grammarProfile: 'default' as const,
      autosaveDelayMs: 500,
      projectColorOverrides: {},
      shortcuts: {},
    };
    saveSettings(settings);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(settings));
  });
});

describe('applyTheme', () => {
  let mediaListeners: ((event: MediaQueryListEvent) => void)[] = [];
  let matches = false;

  beforeEach(() => {
    mediaListeners = [];
    matches = false;
    _resetThemeListener();
    document.documentElement.removeAttribute('data-theme');
    // Install a controllable matchMedia mock.
    window.matchMedia = ((query: string): MediaQueryList => {
      const mql: Partial<MediaQueryList> = {
        media: query,
        get matches() {
          return matches;
        },
        addEventListener: ((_type: string, l: EventListener) =>
          mediaListeners.push(
            l as (e: MediaQueryListEvent) => void,
          )) as MediaQueryList['addEventListener'],
        removeEventListener: ((_type: string, l: EventListener) => {
          const i = mediaListeners.indexOf(l as (e: MediaQueryListEvent) => void);
          if (i >= 0) mediaListeners.splice(i, 1);
        }) as MediaQueryList['removeEventListener'],
        dispatchEvent: () => true,
      };
      return mql as MediaQueryList;
    }) as typeof window.matchMedia;
  });

  afterEach(() => {
    _resetThemeListener();
    document.documentElement.removeAttribute('data-theme');
    // @ts-expect-error -- restore default
    delete window.matchMedia;
  });

  it("sets data-theme='dark' for theme=dark", () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('removes data-theme for theme=light', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    applyTheme('light');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('respects OS preference under theme=system (no dark preference → light)', () => {
    matches = false;
    applyTheme('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('respects OS preference under theme=system (dark preference → dark)', () => {
    matches = true;
    applyTheme('system');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('reacts to OS preference changes while theme=system', () => {
    matches = false;
    applyTheme('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    matches = true;
    mediaListeners[0]?.({ matches: true } as MediaQueryListEvent);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('detaches the matchMedia listener when switching to an explicit theme', () => {
    applyTheme('system');
    expect(mediaListeners).toHaveLength(1);
    applyTheme('dark');
    expect(mediaListeners).toHaveLength(0);
  });

  it('does not stack listeners when applyTheme(system) is called twice', () => {
    applyTheme('system');
    applyTheme('system');
    expect(mediaListeners).toHaveLength(1);
  });

  it('falls back to light when window.matchMedia is unavailable', () => {
    // @ts-expect-error -- intentionally unset
    delete window.matchMedia;
    applyTheme('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
