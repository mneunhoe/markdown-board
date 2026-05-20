import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SHORTCUTS,
  comboFromEvent,
  comboHasCommandModifier,
  commandForCombo,
  normaliseCombo,
  resolveShortcuts,
} from '../../src/lib/shortcuts.js';

function keyEvent(init: Partial<KeyboardEvent>): KeyboardEvent {
  return init as KeyboardEvent;
}

describe('normaliseCombo', () => {
  it('orders modifiers and upper-cases a single-char key', () => {
    expect(normaliseCombo('shift+mod+k')).toBe('Mod+Shift+K');
  });

  it('treats cmd / ctrl / control as Mod', () => {
    expect(normaliseCombo('Cmd+1')).toBe('Mod+1');
    expect(normaliseCombo('Ctrl+1')).toBe('Mod+1');
    expect(normaliseCombo('Control+1')).toBe('Mod+1');
  });

  it('preserves named keys', () => {
    expect(normaliseCombo('mod+ArrowDown')).toBe('Mod+ArrowDown');
  });
});

describe('comboFromEvent', () => {
  it('returns null when only a modifier is pressed', () => {
    expect(comboFromEvent(keyEvent({ key: 'Meta', metaKey: true }))).toBeNull();
  });

  it('builds a combo from meta/ctrl + key', () => {
    expect(comboFromEvent(keyEvent({ key: 'k', metaKey: true }))).toBe('Mod+K');
    expect(comboFromEvent(keyEvent({ key: '1', ctrlKey: true }))).toBe('Mod+1');
  });

  it('includes shift and alt in canonical order', () => {
    expect(comboFromEvent(keyEvent({ key: 'L', metaKey: true, shiftKey: true }))).toBe(
      'Mod+Shift+L',
    );
  });
});

describe('comboHasCommandModifier', () => {
  it('is true for Mod/Alt combos and false for bare or shift-only', () => {
    expect(comboHasCommandModifier('Mod+K')).toBe(true);
    expect(comboHasCommandModifier('Alt+P')).toBe(true);
    expect(comboHasCommandModifier('Shift+A')).toBe(false);
    expect(comboHasCommandModifier('A')).toBe(false);
  });
});

describe('resolveShortcuts', () => {
  it('returns the defaults with no overrides', () => {
    expect(resolveShortcuts()).toEqual(DEFAULT_SHORTCUTS);
  });

  it('lets an override replace a default binding', () => {
    expect(resolveShortcuts({ 'go-list': 'Mod+L' })['go-list']).toBe('Mod+L');
  });

  it('unbinds a default when the override is an empty string', () => {
    expect('command-palette' in resolveShortcuts({ 'command-palette': '' })).toBe(false);
  });

  it('adds a binding for a command that has no default', () => {
    expect(resolveShortcuts({ 'reload-theme': 'Mod+R' })['reload-theme']).toBe('Mod+R');
  });
});

describe('commandForCombo', () => {
  const resolved = resolveShortcuts();

  it('reverse-looks up the command id for a default combo', () => {
    expect(commandForCombo('Mod+1', resolved)).toBe('go-board');
    expect(commandForCombo('Mod+K', resolved)).toBe('command-palette');
  });

  it('matches regardless of modifier order / casing', () => {
    expect(commandForCombo('shift+mod+l', resolved)).toBe('toggle-theme');
  });

  it('returns undefined for an unbound combo', () => {
    expect(commandForCombo('Mod+9', resolved)).toBeUndefined();
  });
});
