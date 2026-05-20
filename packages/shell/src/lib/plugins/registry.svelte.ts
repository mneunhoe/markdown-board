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

interface Entry<T> {
  /** Unique insertion sequence — the dispose key (filtering by a primitive
   * survives Svelte's deep `$state` proxy, which would break `===` identity). */
  seq: number;
  value: T;
}

export function createPluginHost(onHookError?: (err: unknown) => void): PluginHost {
  // `$state.raw`: reassigning the whole array is reactive (host UI re-renders),
  // but entries are NOT deep-proxied — important because they hold Svelte
  // component references, which must keep their identity to render. Dispose
  // filters by the primitive `seq`.
  let commands = $state.raw<Entry<Command>[]>([]);
  let views = $state.raw<Entry<RegisteredView>[]>([]);
  let slots = $state.raw<Entry<RegisteredSlot>[]>([]);
  let taskActions = $state.raw<Entry<RegisteredTaskAction>[]>([]);
  const hooks = createHookBus(onHookError);

  let seq = 0;

  return {
    get commands() {
      return commands.map((e) => e.value);
    },
    get defaultShortcuts() {
      const map: Record<string, string> = {};
      for (const { value } of commands) {
        if (value.keybinding) map[value.id] = value.keybinding;
      }
      return map;
    },
    get views() {
      return views.map((e) => e.value);
    },
    slotsFor(slot) {
      return slots
        .map((e) => e.value)
        .filter((s) => s.slot === slot)
        .sort((a, b) => a.order - b.order || a.seq - b.seq);
    },
    get taskActions() {
      return taskActions.map((e) => e.value);
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
      const entrySeq = seq++;
      commands = [...commands, { seq: entrySeq, value: command }];
      return {
        dispose() {
          commands = commands.filter((e) => e.seq !== entrySeq);
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
      const entrySeq = seq++;
      views = [...views, { seq: entrySeq, value: view }];
      return {
        dispose() {
          views = views.filter((e) => e.seq !== entrySeq);
        },
      };
    },

    registerSlot(pluginId, slot, component, opts) {
      const entrySeq = seq++;
      const entry: RegisteredSlot = {
        slot,
        component,
        order: opts?.order ?? 0,
        pluginId,
        seq: entrySeq,
      };
      slots = [...slots, { seq: entrySeq, value: entry }];
      return {
        dispose() {
          slots = slots.filter((e) => e.seq !== entrySeq);
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
      const entrySeq = seq++;
      taskActions = [...taskActions, { seq: entrySeq, value: entry }];
      return {
        dispose() {
          taskActions = taskActions.filter((e) => e.seq !== entrySeq);
        },
      };
    },
  };
}
