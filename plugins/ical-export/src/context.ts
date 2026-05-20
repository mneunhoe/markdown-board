// Holds the plugin `api` and the live export closure between `activate`, the
// toolbar button (which owns the view context + closure), and the palette
// command (which invokes the closure). The button is always mounted while a
// vault is open (the toolbar renders whenever a plugin contributes to it).

import type { PluginContext } from '@markdown-board/plugin-api';

let api: PluginContext | null = null;
let exporter: (() => void) | null = null;

export function setApi(ctx: PluginContext | null): void {
  api = ctx;
}

export function getApi(): PluginContext | null {
  return api;
}

export function setExporter(fn: (() => void) | null): void {
  exporter = fn;
}

export function runExport(): void {
  if (exporter) exporter();
  else api?.ui.notify('Open a vault to export its week.');
}
