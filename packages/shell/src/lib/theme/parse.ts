// Parse + validate a vault's `theme.yaml` into a typed `ThemeConfig`.
//
// Philosophy: never throw on bad user input. A malformed file should leave
// the app fully usable and surface a readable list of problems in the
// Settings UI. Unknown keys are ignored (forward-compatible); known keys
// with the wrong shape are dropped and reported.

import { parse as parseYaml } from 'yaml';

import {
  COLOR_KEYS,
  FONT_KEYS,
  type ThemeColors,
  type ThemeConfig,
  type ThemeFontFile,
} from './schema.js';

export interface ParsedTheme {
  config: ThemeConfig;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseColors(raw: unknown, where: string, errors: string[]): ThemeColors | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    errors.push(`${where} must be a map of colour names to values.`);
    return undefined;
  }
  const out: ThemeColors = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!(COLOR_KEYS as string[]).includes(key)) {
      errors.push(`${where}.${key} is not a recognised colour key (ignored).`);
      continue;
    }
    if (typeof value !== 'string') {
      errors.push(`${where}.${key} must be a string (ignored).`);
      continue;
    }
    out[key as keyof ThemeColors] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseFontFiles(raw: unknown, errors: string[]): ThemeFontFile[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    errors.push('fonts.files must be a list.');
    return undefined;
  }
  const out: ThemeFontFile[] = [];
  raw.forEach((entry, i) => {
    if (!isRecord(entry)) {
      errors.push(`fonts.files[${i}] must be a map with family + src.`);
      return;
    }
    const { family, src, weight, style } = entry;
    if (typeof family !== 'string' || typeof src !== 'string') {
      errors.push(`fonts.files[${i}] requires string family and src (ignored).`);
      return;
    }
    const file: ThemeFontFile = { family, src };
    if (typeof weight === 'string') file.weight = weight;
    if (typeof style === 'string') file.style = style;
    out.push(file);
  });
  return out.length > 0 ? out : undefined;
}

function parseFonts(raw: unknown, errors: string[]): ThemeConfig['fonts'] {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    errors.push('fonts must be a map.');
    return undefined;
  }
  const fonts: NonNullable<ThemeConfig['fonts']> = {};
  for (const key of FONT_KEYS) {
    const value = raw[key];
    if (value === undefined) continue;
    if (typeof value !== 'string') {
      errors.push(`fonts.${key} must be a string (ignored).`);
      continue;
    }
    fonts[key] = value;
  }
  const files = parseFontFiles(raw.files, errors);
  if (files) fonts.files = files;
  return Object.keys(fonts).length > 0 ? fonts : undefined;
}

function parseCssVars(raw: unknown, errors: string[]): Record<string, string> | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    errors.push('cssVars must be a map of --token to value.');
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith('--')) {
      errors.push(`cssVars.${key} must start with "--" (ignored).`);
      continue;
    }
    if (typeof value !== 'string') {
      errors.push(`cssVars.${key} must be a string (ignored).`);
      continue;
    }
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function parseTheme(yamlText: string): ParsedTheme {
  const errors: string[] = [];
  let doc: unknown;
  try {
    doc = parseYaml(yamlText);
  } catch (err) {
    return {
      config: {},
      errors: [`Could not parse theme.yaml: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
  if (doc === null || doc === undefined) return { config: {}, errors };
  if (!isRecord(doc)) {
    return { config: {}, errors: ['theme.yaml must be a YAML map at the top level.'] };
  }

  const config: ThemeConfig = {};
  if (typeof doc.name === 'string') config.name = doc.name;
  else if (doc.name !== undefined) errors.push('name must be a string (ignored).');

  const colors = parseColors(doc.colors, 'colors', errors);
  if (colors) config.colors = colors;

  const fonts = parseFonts(doc.fonts, errors);
  if (fonts) config.fonts = fonts;

  if (typeof doc.logo === 'string') config.logo = doc.logo;
  else if (doc.logo !== undefined) errors.push('logo must be a string path (ignored).');

  const darkColors = isRecord(doc.dark)
    ? parseColors(doc.dark.colors, 'dark.colors', errors)
    : doc.dark === undefined
      ? undefined
      : (errors.push('dark must be a map.'), undefined);
  if (darkColors) config.dark = { colors: darkColors };

  const cssVars = parseCssVars(doc.cssVars, errors);
  if (cssVars) config.cssVars = cssVars;

  return { config, errors };
}
