// Plugin loader: version-gates a plugin module against the host's
// PLUGIN_API_VERSION, runs `activate(context)`, and returns a handle that
// tears the plugin down (its own `deactivate` + every Disposable its
// registrations produced). Pure over the injected context, so it's testable
// with a fake module + a stub context.

import type {
  Disposable,
  PluginContext,
  PluginManifest,
  PluginModule,
} from '@markdown-board/plugin-api';

export class IncompatiblePluginError extends Error {
  override readonly name = 'IncompatiblePluginError';
  constructor(
    public readonly pluginId: string,
    public readonly minAppVersion: string,
    public readonly appVersion: string,
  ) {
    super(
      `Plugin "${pluginId}" needs plugin-api ${minAppVersion}, but the host provides ${appVersion}.`,
    );
  }
}

export interface PluginHandle {
  manifest: PluginManifest;
  deactivate(): Promise<void>;
}

type Version = [number, number, number];

function parseVersion(raw: string): Version | null {
  const cleaned = raw.trim().replace(/^[\^~>=v\s]+/, '');
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(cleaned);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/**
 * A plugin is compatible when the host's major version matches the required
 * major (majors carry breaking API changes) and the host version is at least
 * the required version.
 */
export function isCompatible(minAppVersion: string, appVersion: string): boolean {
  const min = parseVersion(minAppVersion);
  const app = parseVersion(appVersion);
  if (!min || !app) return false;
  if (app[0] !== min[0]) return false;
  if (app[1] !== min[1]) return app[1] > min[1];
  return app[2] >= min[2];
}

/**
 * Activate a plugin against an already-built context. `disposables` is the
 * array the context's `register*` / `hooks.on` calls push into (owned by the
 * caller's api factory); the returned handle disposes them in reverse order
 * after the plugin's own `deactivate`.
 */
export async function activatePlugin(
  module: PluginModule,
  manifest: PluginManifest,
  context: PluginContext,
  disposables: Disposable[],
): Promise<PluginHandle> {
  if (!isCompatible(manifest.minAppVersion, context.appVersion)) {
    throw new IncompatiblePluginError(manifest.id, manifest.minAppVersion, context.appVersion);
  }
  if (typeof module.activate !== 'function') {
    throw new Error(`Plugin "${manifest.id}" has no activate() export.`);
  }
  await module.activate(context);
  return {
    manifest,
    // Best-effort teardown: a throwing plugin `deactivate` or `dispose` must
    // not reject (it would strand other plugins / leave the host inconsistent).
    async deactivate() {
      try {
        await module.deactivate?.();
      } catch {
        // Swallow — registrations below are still cleaned up.
      }
      for (const d of [...disposables].reverse()) {
        try {
          d.dispose();
        } catch {
          // A failed teardown of one registration must not block the rest.
        }
      }
    },
  };
}
