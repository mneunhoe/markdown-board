import { describe, expect, it } from 'vitest';
import { projectShort, projectColor } from '../../src/lib/project.js';

describe('projectShort', () => {
  it('returns null for null / undefined / empty', () => {
    expect(projectShort(null)).toBeNull();
    expect(projectShort(undefined)).toBeNull();
    expect(projectShort('')).toBeNull();
    expect(projectShort('   ')).toBeNull();
  });

  it('returns the tag verbatim when no separator is present', () => {
    expect(projectShort('PSD_GAN')).toBe('PSD_GAN');
  });

  it('splits on em-dash, en-dash, and colon — first segment wins', () => {
    expect(projectShort('PSD_GAN — open decisions')).toBe('PSD_GAN');
    expect(projectShort('PSD_GAN – revised')).toBe('PSD_GAN');
    expect(projectShort('PSD_GAN: revised')).toBe('PSD_GAN');
  });

  it('trims surrounding whitespace from the short form', () => {
    expect(projectShort('  PSD_GAN  — note')).toBe('PSD_GAN');
  });
});

describe('projectColor', () => {
  it('returns var(--text-muted) for null / empty', () => {
    expect(projectColor(null)).toBe('var(--text-muted)');
    expect(projectColor(undefined)).toBe('var(--text-muted)');
    expect(projectColor('')).toBe('var(--text-muted)');
  });

  it('returns a deterministic hsl(...) string for a given name', () => {
    const first = projectColor('PSD_GAN');
    const second = projectColor('PSD_GAN');
    expect(first).toBe(second);
    expect(first).toMatch(/^hsl\(\d{1,3}, 52%, 45%\)$/);
  });

  it('maps different names to different hues (high collision is acceptable; equality is not)', () => {
    const a = projectColor('alpha');
    const b = projectColor('beta');
    expect(a).not.toBe(b);
  });

  it('keeps the short form and the full tag visually distinct', () => {
    expect(projectColor('PSD_GAN')).not.toBe(projectColor('PSD_GAN — extra'));
  });
});
