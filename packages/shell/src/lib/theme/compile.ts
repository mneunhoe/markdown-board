// Compile a validated ThemeConfig into a CSS string injected at runtime.
//
// Output layering (later wins, matching the cascade):
//   1. @font-face rules for any local font files (src already resolved to a
//      loadable URL by the caller).
//   2. a `:root` block — friendly colour keys + font keys + raw cssVars.
//   3. a `[data-theme="dark"]` block — dark.colors overrides (only emitted
//      when the theme declares a dark variant), so it composes with the
//      existing light/dark switch in settings.ts.
//
// Pure and synchronous: asset bytes are resolved to URLs upstream (load.ts)
// and passed in via `fontUrls`, keyed by the font file's vault-relative src.

import { COLOR_TOKENS, FONT_TOKENS, type ThemeColors, type ThemeConfig } from './schema.js';

/** Vault-relative font `src` → a URL the browser can load (e.g. a data URL). */
export type FontUrlMap = Record<string, string>;

function fontFormat(src: string): string | null {
  const ext = src.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'woff2':
      return 'woff2';
    case 'woff':
      return 'woff';
    case 'ttf':
      return 'truetype';
    case 'otf':
      return 'opentype';
    default:
      return null;
  }
}

function colorDeclarations(colors: ThemeColors | undefined, indent: string): string[] {
  if (!colors) return [];
  const lines: string[] = [];
  for (const [key, token] of Object.entries(COLOR_TOKENS)) {
    const value = colors[key as keyof ThemeColors];
    if (typeof value === 'string') lines.push(`${indent}${token}: ${value};`);
  }
  return lines;
}

function fontFaceRules(config: ThemeConfig, fontUrls: FontUrlMap): string[] {
  const files = config.fonts?.files;
  if (!files) return [];
  const rules: string[] = [];
  for (const file of files) {
    const url = fontUrls[file.src];
    if (!url) continue;
    const format = fontFormat(file.src);
    const srcValue = format ? `url("${url}") format("${format}")` : `url("${url}")`;
    const parts = ['@font-face {', `  font-family: "${file.family}";`, `  src: ${srcValue};`];
    if (file.weight) parts.push(`  font-weight: ${file.weight};`);
    if (file.style) parts.push(`  font-style: ${file.style};`);
    parts.push('  font-display: swap;', '}');
    rules.push(parts.join('\n'));
  }
  return rules;
}

export function compileTheme(config: ThemeConfig, fontUrls: FontUrlMap = {}): string {
  const blocks: string[] = [];

  blocks.push(...fontFaceRules(config, fontUrls));

  const rootLines: string[] = [];
  rootLines.push(...colorDeclarations(config.colors, '  '));
  if (config.fonts?.body) rootLines.push(`  ${FONT_TOKENS.body}: ${config.fonts.body};`);
  if (config.fonts?.mono) rootLines.push(`  ${FONT_TOKENS.mono}: ${config.fonts.mono};`);
  if (config.cssVars) {
    for (const [token, value] of Object.entries(config.cssVars)) {
      rootLines.push(`  ${token}: ${value};`);
    }
  }
  if (rootLines.length > 0) {
    blocks.push(`:root {\n${rootLines.join('\n')}\n}`);
  }

  const darkLines = colorDeclarations(config.dark?.colors, '  ');
  if (darkLines.length > 0) {
    blocks.push(`[data-theme="dark"] {\n${darkLines.join('\n')}\n}`);
  }

  return blocks.join('\n\n');
}
