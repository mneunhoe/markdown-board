// Resolve a plugin's effective settings: schema defaults overlaid with the
// user's stored values (clamped/typed per field). Pure so both the api
// factory (`api.settings.get()`) and the Settings UI share one source of truth.

import type { SettingsSchema } from '@markdown-board/plugin-api';

import type { PluginSettingsEntry } from '../settings.js';

export function resolvePluginSettings(
  schema: SettingsSchema | undefined,
  stored: PluginSettingsEntry | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!schema) return out;
  for (const field of schema) {
    const raw = stored?.[field.key];
    switch (field.type) {
      case 'number': {
        let n = typeof raw === 'number' && Number.isFinite(raw) ? raw : field.default;
        if (field.min !== undefined) n = Math.max(field.min, n);
        if (field.max !== undefined) n = Math.min(field.max, n);
        out[field.key] = n;
        break;
      }
      case 'boolean':
        out[field.key] = typeof raw === 'boolean' ? raw : field.default;
        break;
      case 'text':
        out[field.key] = typeof raw === 'string' ? raw : field.default;
        break;
    }
  }
  return out;
}
