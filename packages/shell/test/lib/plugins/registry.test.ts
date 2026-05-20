import type { PluginComponent } from '@markdown-board/plugin-api';
import { describe, expect, it, vi } from 'vitest';

import { createPluginHost } from '../../../src/lib/plugins/registry.svelte.js';

// Stand-in component reference; the registry never renders it.
const fakeComponent = (() => {}) as unknown as PluginComponent;

describe('createPluginHost — commands', () => {
  it('namespaces command ids by plugin and humanises a default title', () => {
    const host = createPluginHost();
    host.registerCommand('pomodoro', 'start-focus', () => {});
    expect(host.commands).toHaveLength(1);
    expect(host.commands[0]?.id).toBe('pomodoro:start-focus');
    expect(host.commands[0]?.title).toBe('Start Focus');
  });

  it('passes through title, group, keywords, and keybinding', () => {
    const host = createPluginHost();
    host.registerCommand('p', 'do', () => {}, {
      title: 'Do the thing',
      group: 'Stuff',
      keywords: ['x'],
      keybinding: 'Mod+Shift+P',
    });
    const c = host.commands[0]!;
    expect(c.title).toBe('Do the thing');
    expect(c.group).toBe('Stuff');
    expect(c.keywords).toEqual(['x']);
    expect(c.keybinding).toBe('Mod+Shift+P');
    expect(host.defaultShortcuts).toEqual({ 'p:do': 'Mod+Shift+P' });
  });

  it('removes the command on dispose', () => {
    const host = createPluginHost();
    const sub = host.registerCommand('p', 'do', () => {});
    expect(host.commands).toHaveLength(1);
    sub.dispose();
    expect(host.commands).toHaveLength(0);
  });

  it('runs the bound handler', () => {
    const host = createPluginHost();
    const run = vi.fn();
    host.registerCommand('p', 'do', run);
    void host.commands[0]?.run();
    expect(run).toHaveBeenCalledOnce();
  });
});

describe('createPluginHost — views', () => {
  it('registers a namespaced view tab and disposes it', () => {
    const host = createPluginHost();
    const sub = host.registerView('week-view', 'week', fakeComponent, { title: 'Week' });
    expect(host.views).toEqual([
      { key: 'week-view:week', title: 'Week', component: fakeComponent, pluginId: 'week-view' },
    ]);
    sub.dispose();
    expect(host.views).toHaveLength(0);
  });
});

describe('createPluginHost — slots', () => {
  it('filters by slot and orders by order then insertion sequence', () => {
    const host = createPluginHost();
    host.registerSlot('a', 'header', fakeComponent, { order: 2 });
    host.registerSlot('b', 'header', fakeComponent, { order: 1 });
    host.registerSlot('c', 'view-toolbar', fakeComponent);
    const header = host.slotsFor('header');
    expect(header.map((s) => s.pluginId)).toEqual(['b', 'a']);
    expect(host.slotsFor('view-toolbar').map((s) => s.pluginId)).toEqual(['c']);
  });

  it('keeps insertion order for equal `order`', () => {
    const host = createPluginHost();
    host.registerSlot('first', 'header', fakeComponent);
    host.registerSlot('second', 'header', fakeComponent);
    expect(host.slotsFor('header').map((s) => s.pluginId)).toEqual(['first', 'second']);
  });
});

describe('createPluginHost — task actions', () => {
  it('namespaces the action id and exposes label/icon/run', () => {
    const host = createPluginHost();
    const run = vi.fn();
    host.registerTaskAction('pomodoro', { id: 'start', label: 'Start pomodoro', icon: '▶', run });
    const action = host.taskActions[0]!;
    expect(action.key).toBe('pomodoro:start');
    expect(action.label).toBe('Start pomodoro');
    expect(action.icon).toBe('▶');
    void action.run({ taskId: 't', sectionId: 's' });
    expect(run).toHaveBeenCalledWith({ taskId: 't', sectionId: 's' });
  });

  it('removes the action on dispose', () => {
    const host = createPluginHost();
    const sub = host.registerTaskAction('p', { id: 'a', label: 'A', run: () => {} });
    expect(host.taskActions).toHaveLength(1);
    sub.dispose();
    expect(host.taskActions).toHaveLength(0);
  });
});
