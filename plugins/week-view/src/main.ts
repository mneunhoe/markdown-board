// Week-view plugin entry. Registers a "Week" view (a seven-column day board)
// and stashes the api so the board can set a task's day on drop.

import type { PluginComponent, PluginContext } from '@markdown-board/plugin-api';

import WeekBoard from './WeekBoard.svelte';
import { setApi } from './context.js';

export function activate(ctx: PluginContext): void {
  setApi(ctx);
  ctx.views.register('week', WeekBoard as unknown as PluginComponent, { title: 'Week' });
}

export function deactivate(): void {
  setApi(null);
}
