import type { PluginContext } from '@markdown-board/plugin-api';
import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PomodoroChip from '../src/PomodoroChip.svelte';
import { __resetForTest, init, isRunning } from '../src/state.svelte.js';

function fakeContext(): PluginContext {
  const store = new Map<string, unknown>();
  return {
    settings: { get: () => ({ focus: 25, shortBreak: 5, longBreak: 15, longBreakEvery: 4 }) },
    storage: {
      get: async (k: string) => store.get(k),
      set: async (k: string, v: unknown) => {
        store.set(k, v);
      },
      delete: async () => {},
      keys: async () => [...store.keys()],
    },
    tasks: { find: () => null, mutate: () => false },
    ui: { saveFile: async () => {}, notify: () => {} },
  } as unknown as PluginContext;
}

describe('PomodoroChip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetForTest();
    void init(fakeContext());
  });
  afterEach(() => {
    __resetForTest();
    vi.useRealTimers();
  });

  it('renders the idle chip with the focus duration and a play button', () => {
    const { getByTestId, container } = render(PomodoroChip);
    expect(getByTestId('pomodoro-time').textContent).toBe('25:00');
    expect(container.querySelector('[data-phase="idle"]')).toBeTruthy();
    const play = container.querySelector<HTMLButtonElement>('.pomo-play');
    expect(play?.getAttribute('aria-label')).toBe('Start pomodoro');
    // No stop button while idle.
    expect(container.querySelector('.pomo-stop')).toBeNull();
  });

  it('clicking play starts a running focus session and shows pause + stop', async () => {
    const { container } = render(PomodoroChip);
    await fireEvent.click(container.querySelector<HTMLButtonElement>('.pomo-play')!);
    expect(isRunning()).toBe(true);
    expect(container.querySelector('[data-phase="focus"]')).toBeTruthy();
    expect(
      container.querySelector<HTMLButtonElement>('.pomo-play')?.getAttribute('aria-label'),
    ).toBe('Pause pomodoro');
    expect(container.querySelector('.pomo-stop')).toBeTruthy();
  });
});
