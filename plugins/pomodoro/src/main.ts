// Pomodoro plugin entry. Registers a header-slot chip, a per-task "start"
// action, and a play/pause command, then restores any persisted timer state.

import type { PluginComponent, PluginContext } from '@markdown-board/plugin-api';

import PomodoroChip from './PomodoroChip.svelte';
import { init, playClicked, startForTask, stop, teardown } from './state.svelte.js';

export async function activate(ctx: PluginContext): Promise<void> {
  ctx.slots.register('header', PomodoroChip as unknown as PluginComponent);

  ctx.taskActions.register({
    id: 'start',
    label: 'Start pomodoro',
    icon: '▶',
    run: (ref) => startForTask(ref),
  });

  ctx.commands.register('toggle', () => playClicked(), {
    title: 'Pomodoro: start / pause',
    group: 'Pomodoro',
    keywords: ['timer', 'focus'],
  });
  ctx.commands.register('stop', () => stop(), {
    title: 'Pomodoro: stop',
    group: 'Pomodoro',
  });

  await init(ctx);
}

export function deactivate(): void {
  teardown();
}
