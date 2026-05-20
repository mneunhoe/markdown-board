import type { SettingsSchema } from '@markdown-board/plugin-api';
import { describe, expect, it } from 'vitest';

import { resolvePluginSettings } from '../../../src/lib/plugins/plugin-settings.js';

const schema: SettingsSchema = [
  { key: 'focus', label: 'Focus', type: 'number', default: 25, min: 1, max: 120 },
  { key: 'label', label: 'Label', type: 'text', default: 'Pomodoro' },
  { key: 'autostart', label: 'Auto-start', type: 'boolean', default: false },
];

describe('resolvePluginSettings', () => {
  it('returns defaults when nothing is stored', () => {
    expect(resolvePluginSettings(schema, undefined)).toEqual({
      focus: 25,
      label: 'Pomodoro',
      autostart: false,
    });
  });

  it('overlays stored values over defaults', () => {
    const stored = { enabled: true, focus: 50, label: 'Deep work', autostart: true };
    expect(resolvePluginSettings(schema, stored)).toEqual({
      focus: 50,
      label: 'Deep work',
      autostart: true,
    });
  });

  it('clamps numbers to the field min/max', () => {
    expect(resolvePluginSettings(schema, { enabled: true, focus: 999 }).focus).toBe(120);
    expect(resolvePluginSettings(schema, { enabled: true, focus: 0 }).focus).toBe(1);
  });

  it('ignores wrong-typed stored values and falls back to the default', () => {
    const stored = { enabled: true, focus: 'nope', autostart: 'yes' };
    const out = resolvePluginSettings(schema, stored);
    expect(out.focus).toBe(25);
    expect(out.autostart).toBe(false);
  });

  it('returns an empty object for no schema', () => {
    expect(resolvePluginSettings(undefined, { enabled: true })).toEqual({});
  });
});
