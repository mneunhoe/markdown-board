// Custom-theme schema + the friendly-key → CSS-custom-property map.
//
// A vault may carry a `theme.yaml` at its root that overrides the built-in
// palette, fonts, and header logo. Friendly keys (`colors.accent`,
// `fonts.body`, ...) map onto the internal `--tokens` defined in
// `@markdown-board/ui/theme/tokens.css`. A raw `cssVars` block is an escape
// hatch for any token not surfaced as a friendly key; it is merged last and
// wins. This module is the single source of truth for that mapping and is
// imported by both the parser and the compiler.

/** Friendly colour keys → the CSS custom property each one drives. */
export const COLOR_TOKENS = {
  accent: '--accent',
  accentHover: '--accent-hover',
  background: '--bg-primary',
  surface: '--bg-secondary',
  card: '--bg-card',
  text: '--text-primary',
  textSecondary: '--text-secondary',
  textMuted: '--text-muted',
  border: '--border',
  borderLight: '--border-light',
} as const satisfies Record<string, string>;

export type ColorKey = keyof typeof COLOR_TOKENS;

/** Friendly font keys → the CSS custom property each one drives. */
export const FONT_TOKENS = {
  body: '--font-body',
  mono: '--font-mono',
} as const satisfies Record<string, string>;

export type FontKey = keyof typeof FONT_TOKENS;

export const COLOR_KEYS = Object.keys(COLOR_TOKENS) as ColorKey[];
export const FONT_KEYS = Object.keys(FONT_TOKENS) as FontKey[];

export type ThemeColors = Partial<Record<ColorKey, string>>;

/** A `@font-face` declaration backed by a font file inside the vault. */
export interface ThemeFontFile {
  family: string;
  /** Vault-relative path to the font file (woff2/woff/ttf/otf). */
  src: string;
  /** Optional CSS `font-weight` (e.g. `"400"` or `"100 900"` for variable fonts). */
  weight?: string;
  /** Optional CSS `font-style` (e.g. `"italic"`). */
  style?: string;
}

export interface ThemeFonts {
  body?: string;
  mono?: string;
  files?: ThemeFontFile[];
}

/** A palette variant (the base theme, or its dark-mode overrides). */
export interface ThemePalette {
  colors?: ThemeColors;
}

export interface ThemeConfig {
  name?: string;
  colors?: ThemeColors;
  fonts?: ThemeFonts;
  /** Header title text. Overrides the default "markdown-board"; "" hides it. */
  title?: string;
  /** Vault-relative path to a logo image that replaces the header mark. */
  logo?: string;
  /** Dark-mode-only overrides, applied under `[data-theme="dark"]`. */
  dark?: ThemePalette;
  /** Raw `--token` → value overrides. Merged last; wins over friendly keys. */
  cssVars?: Record<string, string>;
}
