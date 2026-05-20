import { describe, expect, it } from 'vitest';

import { compileTheme } from '../../../src/lib/theme/compile.js';

describe('compileTheme', () => {
  it('returns an empty string for an empty config', () => {
    expect(compileTheme({})).toBe('');
  });

  it('maps friendly colour keys to the right tokens in :root', () => {
    const css = compileTheme({ colors: { accent: '#f00', background: '#fff', textMuted: '#888' } });
    expect(css).toContain(':root {');
    expect(css).toContain('--accent: #f00;');
    expect(css).toContain('--bg-primary: #fff;');
    expect(css).toContain('--text-muted: #888;');
  });

  it('emits font tokens and cssVars in :root, cssVars after friendly keys', () => {
    const css = compileTheme({
      fonts: { body: 'Inter', mono: 'Fira Code' },
      cssVars: { '--accent': 'rebeccapurple', '--day-mon': 'red' },
    });
    expect(css).toContain('--font-body: Inter;');
    expect(css).toContain('--font-mono: Fira Code;');
    expect(css).toContain('--accent: rebeccapurple;');
    expect(css.indexOf('--font-body')).toBeLessThan(css.indexOf('--accent: rebeccapurple'));
  });

  it('emits a [data-theme="dark"] block only when a dark variant is given', () => {
    const light = compileTheme({ colors: { background: '#fff' } });
    expect(light).not.toContain('[data-theme="dark"]');
    const both = compileTheme({
      colors: { background: '#fff' },
      dark: { colors: { background: '#111' } },
    });
    expect(both).toContain('[data-theme="dark"] {');
    expect(both).toContain('--bg-primary: #111;');
  });

  it('emits @font-face with the resolved url and inferred format', () => {
    const css = compileTheme(
      { fonts: { files: [{ family: 'Inter', src: 'fonts/Inter.woff2', weight: '100 900' }] } },
      { 'fonts/Inter.woff2': 'data:font/woff2;base64,AAAA' },
    );
    expect(css).toContain('@font-face {');
    expect(css).toContain('font-family: "Inter";');
    expect(css).toContain('src: url("data:font/woff2;base64,AAAA") format("woff2");');
    expect(css).toContain('font-weight: 100 900;');
  });

  it('skips font files whose url was not resolved', () => {
    const css = compileTheme({ fonts: { files: [{ family: 'Inter', src: 'missing.woff2' }] } }, {});
    expect(css).not.toContain('@font-face');
  });
});
