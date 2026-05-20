// Keyboard-shortcut engine: maps key-combos to command ids and back.
//
// Pure and UI-free. A "combo" is a normalised string like `Mod+Shift+K`,
// where `Mod` is Cmd on macOS and Ctrl elsewhere (so a single binding works
// cross-platform). Bindings are keyed by command id; users override defaults
// via `Settings.shortcuts`. VaultApp resolves the effective map, reverse-looks
// up the command id for an event's combo, and runs the matching command from
// the S2 registry. The id `command-palette` is handled specially by VaultApp
// (it toggles the palette rather than running a registry command).

/** Command id → combo string (e.g. `"Mod+K"`). */
export type ShortcutMap = Record<string, string>;

const MODIFIER_ORDER = ['Mod', 'Shift', 'Alt'] as const;
const MODIFIER_KEYS = new Set(['Control', 'Meta', 'Shift', 'Alt', 'AltGraph']);

/** Built-in bindings. Users override individual entries via settings. */
export const DEFAULT_SHORTCUTS: ShortcutMap = {
  'command-palette': 'Mod+K',
  search: 'Mod+Shift+F',
  'quick-add': 'Mod+Shift+N',
  'open-vault': 'Mod+O',
  'open-settings': 'Mod+,',
  'toggle-theme': 'Mod+Shift+L',
  'go-board': 'Mod+1',
  'go-list': 'Mod+2',
  'go-library': 'Mod+3',
  'go-overview': 'Mod+4',
};

function normaliseKey(key: string): string {
  return key.length === 1 ? key.toUpperCase() : key;
}

/** Canonicalise a combo: ordered modifiers + a single normalised key. */
export function normaliseCombo(combo: string): string {
  const parts = combo
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean);
  const mods = new Set<string>();
  let key = '';
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'mod' || lower === 'cmd' || lower === 'ctrl' || lower === 'control') {
      mods.add('Mod');
    } else if (lower === 'shift') {
      mods.add('Shift');
    } else if (lower === 'alt' || lower === 'option') {
      mods.add('Alt');
    } else {
      key = normaliseKey(part);
    }
  }
  const ordered = MODIFIER_ORDER.filter((m) => mods.has(m));
  return key ? [...ordered, key].join('+') : ordered.join('+');
}

/**
 * Build a normalised combo from a keyboard event, or `null` if only modifier
 * keys are held (no actual key yet).
 */
export function comboFromEvent(event: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(event.key)) return null;
  const parts: string[] = [];
  if (event.metaKey || event.ctrlKey) parts.push('Mod');
  if (event.shiftKey) parts.push('Shift');
  if (event.altKey) parts.push('Alt');
  parts.push(normaliseKey(event.key));
  return parts.join('+');
}

/** Whether a combo carries a non-shift modifier (safe to fire while typing). */
export function comboHasCommandModifier(combo: string): boolean {
  return /(^|\+)(Mod|Alt)(\+|$)/.test(normaliseCombo(combo));
}

/** Defaults merged with user overrides (overrides win; empty string unbinds). */
export function resolveShortcuts(overrides: ShortcutMap = {}): ShortcutMap {
  const merged: ShortcutMap = { ...DEFAULT_SHORTCUTS };
  for (const [id, combo] of Object.entries(overrides)) {
    if (combo === '') delete merged[id];
    else merged[id] = combo;
  }
  return merged;
}

/** Reverse lookup: the command id bound to `combo`, or `undefined`. */
export function commandForCombo(combo: string, resolved: ShortcutMap): string | undefined {
  const target = normaliseCombo(combo);
  for (const [id, bound] of Object.entries(resolved)) {
    if (normaliseCombo(bound) === target) return id;
  }
  return undefined;
}
