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

export const FIRST_PARTY_PLUGINS: readonly FirstPartyPlugin[] = [
  {
    manifest: {
      id: 'pomodoro',
      name: 'Pomodoro',
      version: '1.0.0',
      entry: '',
      minAppVersion: '1.0.0',
      description: 'A focus timer chip with a per-task start button.',
      settings: [
        { key: 'focus', label: 'Focus minutes', type: 'number', default: 25, min: 1, max: 180 },
        {
          key: 'shortBreak',
          label: 'Short break minutes',
          type: 'number',
          default: 5,
          min: 1,
          max: 60,
        },
        {
          key: 'longBreak',
          label: 'Long break minutes',
          type: 'number',
          default: 15,
          min: 1,
          max: 120,
        },
        {
          key: 'longBreakEvery',
          label: 'Long break every N focuses',
          type: 'number',
          default: 4,
          min: 1,
          max: 12,
        },
      ],
    },
    load: () => import('@markdown-board/plugin-pomodoro'),
  },
];
