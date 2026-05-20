// Holds the plugin `api` between `activate` (which receives it) and the
// WeekBoard view component (which the shell renders and which reads the api to
// mutate a task's day on drop). Module singleton — the plugin is imported once.

import type { PluginContext } from '@markdown-board/plugin-api';

let api: PluginContext | null = null;

export function setApi(ctx: PluginContext | null): void {
  api = ctx;
}

export function getApi(): PluginContext | null {
  return api;
}
