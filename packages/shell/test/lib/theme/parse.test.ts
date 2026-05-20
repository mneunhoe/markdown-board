import { describe, expect, it } from 'vitest';

import { parseTheme } from '../../../src/lib/theme/parse.js';

describe('parseTheme', () => {
  it('returns an empty config with no errors for an empty document', () => {
    expect(parseTheme('')).toEqual({ config: {}, errors: [] });
  });

  it('parses friendly colour keys, fonts, logo, dark, and cssVars', () => {
    const { config, errors } = parseTheme(`
name: My Theme
colors:
  accent: "#ff0000"
  background: "#ffffff"
fonts:
  body: Inter
  files:
    - family: Inter
      src: fonts/Inter.woff2
      weight: "100 900"
logo: assets/logo.svg
dark:
  colors:
    background: "#111111"
cssVars:
  "--day-mon": "hsl(1,2%,3%)"
`);
    expect(errors).toEqual([]);
    expect(config).toEqual({
      name: 'My Theme',
      colors: { accent: '#ff0000', background: '#ffffff' },
      fonts: {
        body: 'Inter',
        files: [{ family: 'Inter', src: 'fonts/Inter.woff2', weight: '100 900' }],
      },
      logo: 'assets/logo.svg',
      dark: { colors: { background: '#111111' } },
      cssVars: { '--day-mon': 'hsl(1,2%,3%)' },
    });
  });

  it('reports a single error and stays usable on malformed YAML', () => {
    const { config, errors } = parseTheme(':\n  - [unbalanced');
    expect(config).toEqual({});
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/Could not parse theme\.yaml/);
  });

  it('ignores unknown colour keys and non-string values, collecting errors', () => {
    const { config, errors } = parseTheme(`
colors:
  accent: "#abc"
  nonsense: "#def"
  background: 42
`);
    expect(config.colors).toEqual({ accent: '#abc' });
    expect(errors).toContain('colors.nonsense is not a recognised colour key (ignored).');
    expect(errors).toContain('colors.background must be a string (ignored).');
  });

  it('rejects cssVars keys that do not start with --', () => {
    const { config, errors } = parseTheme(`
cssVars:
  accent: red
  "--ok": blue
`);
    expect(config.cssVars).toEqual({ '--ok': 'blue' });
    expect(errors).toContain('cssVars.accent must start with "--" (ignored).');
  });

  it('errors when the top level is not a map', () => {
    const { errors } = parseTheme('- just\n- a\n- list');
    expect(errors).toEqual(['theme.yaml must be a YAML map at the top level.']);
  });
});
