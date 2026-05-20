// First-party plugin table. The manifest is declared inline (lightweight — no
// import of the plugin's code) so Settings can list + gate plugins without
// pulling their runtime; `load()` lazily dynamic-imports the actual module
// only when the plugin is enabled. That's what makes "disable a plugin →
// removed from runtime" true: a disabled plugin's code is never imported.
//
// Entries are added as each first-party plugin lands (S7 pomodoro, S8
// week-view, S9 ical-export).

import type { PluginManifest, PluginModule } from '@markdown-board/plugin-api';

export interface FirstPartyPlugin {
  manifest: PluginManifest;
  load: () => Promise<PluginModule>;
}

export const FIRST_PARTY_PLUGINS: readonly FirstPartyPlugin[] = [];
