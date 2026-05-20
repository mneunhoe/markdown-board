// User-facing settings persisted to localStorage + the theme application
// glue that sets `data-theme="dark"` on `<html>` (or removes it).
//
// Pure-ish on top of `localStorage` + `document.documentElement` —
// SSR-safe because the type guards check `typeof window` and
// `typeof document` first. The web shell's `main.ts` calls
// `applyTheme(loadSettings().theme)` *before* mounting the app so
// dark-mode users don't see a flash of light theme on first paint.

export type ThemeChoice = 'light' | 'dark' | 'system';
export const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

export const GRAMMAR_PROFILES = ['default'] as const;
export type GrammarProfile = (typeof GRAMMAR_PROFILES)[number];

export interface Settings {
  theme: ThemeChoice;
  grammarProfile: GrammarProfile;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  grammarProfile: 'default',
};

export const STORAGE_KEY = 'markdown-board:settings';

export function loadSettings(): Settings {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      theme: parseTheme(parsed.theme),
      grammarProfile: parseGrammar(parsed.grammarProfile),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// Module-level reference to the active matchMedia listener so we can
// detach it when the theme choice changes (avoids stacking listeners on
// every Settings save).
let activeMediaQuery: MediaQueryList | null = null;
let activeMediaListener: ((event: MediaQueryListEvent) => void) | null = null;

export function applyTheme(theme: ThemeChoice): void {
  if (typeof document === 'undefined') return;
  detachMediaListener();

  if (theme === 'system') {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      activeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      activeMediaListener = (event) => applyResolved(event.matches ? 'dark' : 'light');
      activeMediaQuery.addEventListener('change', activeMediaListener);
      applyResolved(activeMediaQuery.matches ? 'dark' : 'light');
    } else {
      applyResolved('light');
    }
    return;
  }
  applyResolved(theme);
}

function applyResolved(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

function detachMediaListener(): void {
  if (activeMediaQuery && activeMediaListener) {
    activeMediaQuery.removeEventListener('change', activeMediaListener);
  }
  activeMediaQuery = null;
  activeMediaListener = null;
}

function parseTheme(value: unknown): ThemeChoice {
  return value === 'light' || value === 'dark' || value === 'system'
    ? value
    : DEFAULT_SETTINGS.theme;
}

function parseGrammar(value: unknown): GrammarProfile {
  return value === 'default' ? value : DEFAULT_SETTINGS.grammarProfile;
}

/** Test seam: detach the active matchMedia listener (used by tests between cases). */
export function _resetThemeListener(): void {
  detachMediaListener();
}
