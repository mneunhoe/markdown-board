// Desktop third-party plugin discovery. Scans `<vault>/.markdown-board/plugins/
// <id>/plugin.json`, and lazily imports each plugin's bundled entry module.
//
// Trust model: third-party plugins run in-process, unsandboxed. They must ship
// a single self-contained ESM file (no bare `import` specifiers) — it's loaded
// from a blob URL, which can't resolve node-style imports. See docs/plugins.md.

import type { PluginManifest, PluginModule } from '@markdown-board/plugin-api';
import type { LoadablePlugin, VaultAdapter } from '@markdown-board/shell';

const PLUGIN_DIR = '.markdown-board/plugins';

function isValidManifest(value: unknown): value is PluginManifest {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === 'string' && typeof m.entry === 'string' && typeof m.minAppVersion === 'string'
  );
}

export async function listLocalPlugins(adapter: VaultAdapter): Promise<LoadablePlugin[]> {
  let entries;
  try {
    entries = await adapter.listDir(PLUGIN_DIR);
  } catch {
    return []; // no plugins directory ⇒ nothing to load
  }

  const plugins: LoadablePlugin[] = [];
  for (const entry of entries) {
    if (entry.kind !== 'directory') continue;
    const base = `${PLUGIN_DIR}/${entry.name}`;
    let manifest: unknown;
    try {
      manifest = JSON.parse(await adapter.readFile(`${base}/plugin.json`));
    } catch {
      continue; // missing / invalid manifest ⇒ skip
    }
    if (!isValidManifest(manifest)) continue;

    const entryPath = `${base}/${manifest.entry}`;
    plugins.push({
      manifest,
      load: async () => {
        const source = await adapter.readFile(entryPath);
        const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
        try {
          return (await import(/* @vite-ignore */ url)) as PluginModule;
        } finally {
          URL.revokeObjectURL(url);
        }
      },
    });
  }
  return plugins;
}
