// iCal-export plugin entry. Adds a view-toolbar button + a palette command
// that export the current week's scheduled tasks as an .ics file.

import type { PluginComponent, PluginContext } from '@markdown-board/plugin-api';

import ExportButton from './ExportButton.svelte';
import { runExport, setApi, setExporter } from './context.js';

export function activate(ctx: PluginContext): void {
  setApi(ctx);
  ctx.slots.register('view-toolbar', ExportButton as unknown as PluginComponent);
  ctx.commands.register('export-week', () => runExport(), {
    title: 'Export week to .ics',
    group: 'Calendar',
    keywords: ['ical', 'calendar', 'download'],
  });
}

export function deactivate(): void {
  setExporter(null);
  setApi(null);
}
