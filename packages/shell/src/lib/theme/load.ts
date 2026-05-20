// Runtime loader for a vault's custom `theme.yaml`.
//
// Flow: read theme.yaml → parse/validate → resolve local font + logo files
// to data URLs (via the adapter's readBinary) → compile to CSS → inject a
// single <style id="mb-custom-theme"> into <head>. Re-running replaces the
// style in place, so edits take effect without a restart. The header logo is
// returned to the caller (it is markup, not CSS) and rendered by VaultApp.
//
// Nothing here throws on bad input: a missing file clears any applied theme;
// parse/asset problems are collected into `status.errors` for the Settings UI.

import { FileNotFoundError } from '@markdown-board/core';

import type { VaultAdapter } from '../platform.js';
import { compileTheme, type FontUrlMap } from './compile.js';
import { parseTheme } from './parse.js';

export const THEME_FILE = 'theme.yaml';
export const THEME_STYLE_ID = 'mb-custom-theme';
const POLL_INTERVAL_MS = 1500;

export interface ThemeStatus {
  /** `none` = no theme.yaml; `active` = applied cleanly; `error` = applied with problems. */
  state: 'none' | 'active' | 'error';
  name?: string;
  errors: string[];
}

export interface ThemeLoadResult {
  status: ThemeStatus;
  /** Data URL for the header logo, or `null` when the theme sets none. */
  logoUrl: string | null;
  /** Header title override, or `null` when the theme sets none. */
  title: string | null;
}

function mimeFromExt(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'woff2':
      return 'font/woff2';
    case 'woff':
      return 'font/woff';
    case 'ttf':
      return 'font/ttf';
    case 'otf':
      return 'font/otf';
    case 'svg':
      return 'image/svg+xml';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }
  // Node fallback (non-browser test runners without a global btoa).
  return Buffer.from(bytes).toString('base64');
}

async function readAsDataUrl(adapter: VaultAdapter, path: string): Promise<string> {
  const bytes = await adapter.readBinary(path);
  return `data:${mimeFromExt(path)};base64,${bytesToBase64(bytes)}`;
}

function injectCss(css: string): void {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(THEME_STYLE_ID) as HTMLStyleElement | null;
  if (!css) {
    style?.remove();
    return;
  }
  if (!style) {
    style = document.createElement('style');
    style.id = THEME_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = css;
}

/** Remove any injected custom-theme styles (used when switching vaults). */
export function clearVaultTheme(): void {
  injectCss('');
}

/**
 * Load and apply the active vault's `theme.yaml`. Safe to call repeatedly;
 * it replaces the injected style in place.
 */
export async function loadVaultTheme(adapter: VaultAdapter): Promise<ThemeLoadResult> {
  let text: string;
  try {
    text = await adapter.readFile(THEME_FILE);
  } catch (err) {
    if (err instanceof FileNotFoundError) {
      injectCss('');
      return { status: { state: 'none', errors: [] }, logoUrl: null, title: null };
    }
    injectCss('');
    return {
      status: { state: 'error', errors: [`Could not read ${THEME_FILE}: ${String(err)}`] },
      logoUrl: null,
      title: null,
    };
  }

  const { config, errors } = parseTheme(text);

  const fontUrls: FontUrlMap = {};
  for (const file of config.fonts?.files ?? []) {
    try {
      fontUrls[file.src] = await readAsDataUrl(adapter, file.src);
    } catch {
      errors.push(`Could not load font file: ${file.src}`);
    }
  }

  let logoUrl: string | null = null;
  if (config.logo) {
    try {
      logoUrl = await readAsDataUrl(adapter, config.logo);
    } catch {
      errors.push(`Could not load logo: ${config.logo}`);
    }
  }

  const css = compileTheme(config, fontUrls);
  injectCss(css);

  const applied = css.length > 0 || logoUrl !== null;
  const state: ThemeStatus['state'] = errors.length > 0 ? 'error' : applied ? 'active' : 'none';
  const status: ThemeStatus = { state, errors };
  if (config.name) status.name = config.name;
  return { status, logoUrl, title: config.title ?? null };
}

/**
 * Poll `theme.yaml`'s mtime and invoke `onChange` whenever it changes
 * (including appearing or disappearing), so external edits hot-reload
 * without a restart. Returns a disposer.
 */
export function watchVaultTheme(adapter: VaultAdapter, onChange: () => void): () => void {
  let last: number | null = null;
  let disposed = false;

  const tick = async (): Promise<void> => {
    let mtime = 0;
    try {
      mtime = await adapter.getMtime(THEME_FILE);
    } catch {
      mtime = 0; // absent → 0
    }
    if (disposed) return;
    if (last === null) {
      last = mtime;
      return;
    }
    if (mtime !== last) {
      last = mtime;
      onChange();
    }
  };

  void tick();
  const id = setInterval(() => void tick(), POLL_INTERVAL_MS);
  return () => {
    disposed = true;
    clearInterval(id);
  };
}
