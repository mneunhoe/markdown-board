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

export const GRAMMAR_PROFILES = ['default', 'obsidian-tasks'] as const;
export type GrammarProfile = (typeof GRAMMAR_PROFILES)[number];

/** Clamp bounds for the autosave debounce window (ms). */
export const AUTOSAVE_DELAY_MIN = 100;
export const AUTOSAVE_DELAY_MAX = 10_000;

/**
 * Per-plugin configuration: an `enabled` flag plus any schema-driven setting
 * values (keyed by the plugin's settings-schema keys). Stored under the
 * plugin id in `Settings.plugins`.
 */
export interface PluginSettingsEntry {
  enabled: boolean;
  [key: string]: unknown;
}

export interface Settings {
  theme: ThemeChoice;
  grammarProfile: GrammarProfile;
  /** Autosave debounce window in milliseconds. */
  autosaveDelayMs: number;
  /** Per-project colour overrides, keyed by short project name → CSS colour. */
  projectColorOverrides: Record<string, string>;
  /** Keyboard-shortcut overrides, keyed by command id → combo (empty unbinds). */
  shortcuts: Record<string, string>;
  /** Per-plugin enable flag + setting values, keyed by plugin id. */
  plugins: Record<string, PluginSettingsEntry>;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  grammarProfile: 'default',
  autosaveDelayMs: 500,
  projectColorOverrides: {},
  shortcuts: {},
  plugins: {},
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
      autosaveDelayMs: parseAutosaveDelay(parsed.autosaveDelayMs),
      projectColorOverrides: parseProjectColorOverrides(parsed.projectColorOverrides),
      shortcuts: parseShortcuts(parsed.shortcuts),
      plugins: parsePlugins(parsed.plugins),
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
  return (GRAMMAR_PROFILES as readonly string[]).includes(value as string)
    ? (value as GrammarProfile)
    : DEFAULT_SETTINGS.grammarProfile;
}

function parseAutosaveDelay(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SETTINGS.autosaveDelayMs;
  }
  return Math.min(AUTOSAVE_DELAY_MAX, Math.max(AUTOSAVE_DELAY_MIN, Math.round(value)));
}

function parseProjectColorOverrides(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'string' && raw.trim() !== '') out[key] = raw;
  }
  return out;
}

function parseShortcuts(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    // Empty string is meaningful here: it unbinds a default shortcut.
    if (typeof raw === 'string') out[key] = raw;
  }
  return out;
}

function parsePlugins(value: unknown): Record<string, PluginSettingsEntry> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const out: Record<string, PluginSettingsEntry> = {};
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) continue;
    const entry = raw as Record<string, unknown>;
    // Default to enabled when the flag is absent (first-party plugins are on
    // by default); only an explicit `false` disables.
    out[id] = { ...entry, enabled: entry.enabled !== false };
  }
  return out;
}

/** Test seam: detach the active matchMedia listener (used by tests between cases). */
export function _resetThemeListener(): void {
  detachMediaListener();
}
