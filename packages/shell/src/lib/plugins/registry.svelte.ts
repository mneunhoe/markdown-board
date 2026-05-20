// Reactive plugin host. Holds the live registries plugins contribute to
// (commands, views, slots, task actions) plus the hook bus. Backed by Svelte 5
// `$state` arrays so VaultApp's `$derived` command list / view tabs / slot
// mounts recompute when a plugin registers or its Disposable fires.
//
// `.svelte.ts` (not `.ts`) so the runes compiler runs over it.

import type {
  CommandOptions,
  Disposable,
  PluginComponent,
  SlotName,
  SlotOptions,
  TaskActionSpec,
  ViewOptions,
} from '@markdown-board/plugin-api';

import type { Command } from '../commands.js';
import { createHookBus, type HookBus } from './hooks.js';

export interface RegisteredView {
  /** Namespaced id used as the active-tab key (`<plugin>:<id>`). */
  key: string;
  title: string;
  component: PluginComponent;
  pluginId: string;
}

export interface RegisteredSlot {
  slot: SlotName;
  component: PluginComponent;
  order: number;
  pluginId: string;
  /** Insertion sequence — stable tiebreaker when `order` ties. */
  seq: number;
}

export interface RegisteredTaskAction {
  /** Namespaced id (`<plugin>:<id>`). */
  key: string;
  label: string;
  icon: string | undefined;
  run: TaskActionSpec['run'];
  pluginId: string;
}

export interface PluginHost {
  /** Plugin-contributed palette commands (already namespaced + bound). */
  readonly commands: Command[];
  /** Default keybindings declared by plugin commands (command id → combo). */
  readonly defaultShortcuts: Record<string, string>;
  readonly views: RegisteredView[];
  slotsFor(slot: SlotName): RegisteredSlot[];
  readonly taskActions: RegisteredTaskAction[];
  readonly hooks: HookBus;

  registerCommand(
    pluginId: string,
    id: string,
    run: () => void | Promise<void>,
    opts?: CommandOptions,
  ): Disposable;
  registerView(
    pluginId: string,
    id: string,
    component: PluginComponent,
    opts: ViewOptions,
  ): Disposable;
  registerSlot(
    pluginId: string,
    slot: SlotName,
    component: PluginComponent,
    opts?: SlotOptions,
  ): Disposable;
  registerTaskAction(pluginId: string, action: TaskActionSpec): Disposable;
}

function humanise(id: string): string {
  const last = id.includes(':') ? id.slice(id.indexOf(':') + 1) : id;
  return last.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function createPluginHost(onHookError?: (err: unknown) => void): PluginHost {
  // `$state.raw`: entries are immutable once registered and we always replace
  // the whole array (never mutate in place), so we don't want Svelte's deep
  // proxy — it would also break identity-based dispose (`c !== entry`).
  let commands = $state.raw<Command[]>([]);
  let views = $state.raw<RegisteredView[]>([]);
  let slots = $state.raw<RegisteredSlot[]>([]);
  let taskActions = $state.raw<RegisteredTaskAction[]>([]);
  const hooks = createHookBus(onHookError);

  let seq = 0;

  return {
    get commands() {
      return commands;
    },
    get defaultShortcuts() {
      const map: Record<string, string> = {};
      for (const c of commands) {
        if (c.keybinding) map[c.id] = c.keybinding;
      }
      return map;
    },
    get views() {
      return views;
    },
    slotsFor(slot) {
      return slots
        .filter((s) => s.slot === slot)
        .sort((a, b) => a.order - b.order || a.seq - b.seq);
    },
    get taskActions() {
      return taskActions;
    },
    hooks,

    registerCommand(pluginId, id, run, opts) {
      const key = `${pluginId}:${id}`;
      const command: Command = {
        id: key,
        title: opts?.title ?? humanise(id),
        run,
        ...(opts?.group ? { group: opts.group } : {}),
        ...(opts?.keywords ? { keywords: opts.keywords } : {}),
        ...(opts?.keybinding ? { keybinding: opts.keybinding } : {}),
        ...(opts?.enabled === false ? { enabled: false } : {}),
      };
      commands = [...commands, command];
      return {
        dispose() {
          commands = commands.filter((c) => c !== command);
        },
      };
    },

    registerView(pluginId, id, component, opts) {
      const view: RegisteredView = {
        key: `${pluginId}:${id}`,
        title: opts.title,
        component,
        pluginId,
      };
      views = [...views, view];
      return {
        dispose() {
          views = views.filter((v) => v !== view);
        },
      };
    },

    registerSlot(pluginId, slot, component, opts) {
      const entry: RegisteredSlot = {
        slot,
        component,
        order: opts?.order ?? 0,
        pluginId,
        seq: seq++,
      };
      slots = [...slots, entry];
      return {
        dispose() {
          slots = slots.filter((s) => s !== entry);
        },
      };
    },

    registerTaskAction(pluginId, action) {
      const entry: RegisteredTaskAction = {
        key: `${pluginId}:${action.id}`,
        label: action.label,
        icon: action.icon,
        run: action.run,
        pluginId,
      };
      taskActions = [...taskActions, entry];
      return {
        dispose() {
          taskActions = taskActions.filter((a) => a !== entry);
        },
      };
    },
  };
}
