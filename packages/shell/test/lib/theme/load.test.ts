import { FileNotFoundError } from '@markdown-board/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { VaultAdapter } from '../../../src/lib/platform.js';
import { THEME_STYLE_ID, clearVaultTheme, loadVaultTheme } from '../../../src/lib/theme/load.js';

class FakeAdapter implements VaultAdapter {
  private files = new Map<string, string>();
  private bin = new Map<string, Uint8Array>();

  setText(path: string, contents: string): void {
    this.files.set(path, contents);
  }
  setBinary(path: string, bytes: Uint8Array): void {
    this.bin.set(path, bytes);
  }

  readFile(path: string): Promise<string> {
    const v = this.files.get(path);
    if (v === undefined) return Promise.reject(new FileNotFoundError(path));
    return Promise.resolve(v);
  }
  readBinary(path: string): Promise<Uint8Array> {
    const v = this.bin.get(path);
    if (v === undefined) return Promise.reject(new FileNotFoundError(path));
    return Promise.resolve(v);
  }
  writeFile(): Promise<void> {
    return Promise.resolve();
  }
  listDir(): Promise<never[]> {
    return Promise.resolve([]);
  }
  watch() {
    return { dispose() {} };
  }
  getMtime(): Promise<number> {
    return Promise.resolve(1);
  }
}

function styleEl(): HTMLStyleElement | null {
  return document.getElementById(THEME_STYLE_ID) as HTMLStyleElement | null;
}

describe('loadVaultTheme', () => {
  beforeEach(() => {
    clearVaultTheme();
  });
  afterEach(() => {
    clearVaultTheme();
  });

  it('reports state=none and injects nothing when theme.yaml is absent', async () => {
    const result = await loadVaultTheme(new FakeAdapter());
    expect(result.status.state).toBe('none');
    expect(result.logoUrl).toBeNull();
    expect(styleEl()).toBeNull();
  });

  it('injects compiled CSS and reports state=active for a valid theme', async () => {
    const a = new FakeAdapter();
    a.setText('theme.yaml', 'name: T\ncolors:\n  accent: "#abcdef"\n');
    const result = await loadVaultTheme(a);
    expect(result.status.state).toBe('active');
    expect(result.status.name).toBe('T');
    expect(styleEl()?.textContent).toContain('--accent: #abcdef;');
  });

  it('resolves a logo to a data URL', async () => {
    const a = new FakeAdapter();
    a.setText('theme.yaml', 'logo: logo.svg\n');
    a.setBinary('logo.svg', new TextEncoder().encode('<svg/>'));
    const result = await loadVaultTheme(a);
    expect(result.logoUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(result.status.state).toBe('active');
  });

  it('embeds a resolved font file as @font-face', async () => {
    const a = new FakeAdapter();
    a.setText('theme.yaml', 'fonts:\n  files:\n    - family: Inter\n      src: f.woff2\n');
    a.setBinary('f.woff2', new Uint8Array([1, 2, 3]));
    await loadVaultTheme(a);
    expect(styleEl()?.textContent).toContain('@font-face');
    expect(styleEl()?.textContent).toContain('data:font/woff2;base64,');
  });

  it('collects an error and reports state=error when an asset is missing', async () => {
    const a = new FakeAdapter();
    a.setText('theme.yaml', 'logo: missing.png\n');
    const result = await loadVaultTheme(a);
    expect(result.status.state).toBe('error');
    expect(result.status.errors).toContain('Could not load logo: missing.png');
    expect(result.logoUrl).toBeNull();
  });

  it('clearVaultTheme removes the injected style', async () => {
    const a = new FakeAdapter();
    a.setText('theme.yaml', 'colors:\n  accent: red\n');
    await loadVaultTheme(a);
    expect(styleEl()).not.toBeNull();
    clearVaultTheme();
    expect(styleEl()).toBeNull();
  });
});
