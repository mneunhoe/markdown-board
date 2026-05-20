import type { PluginContext, Task, TaskRef } from '@markdown-board/plugin-api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetForTest,
  init,
  isPaused,
  isQueued,
  isRunning,
  pomo,
  playClicked,
  remainingMs,
  start,
  startForTask,
  stop,
} from '../src/state.svelte.js';

// A fake plugin context exposing just what the state machine touches.
function makeContext(
  over: {
    settings?: Record<string, unknown>;
    store?: Record<string, unknown>;
    task?: Task;
  } = {},
): {
  ctx: PluginContext;
  mutate: ReturnType<typeof vi.fn>;
  notify: ReturnType<typeof vi.fn>;
  store: Map<string, unknown>;
} {
  const store = new Map<string, unknown>(Object.entries(over.store ?? {}));
  const mutate = vi.fn((ref: TaskRef, fn: (t: Task) => void) => {
    if (over.task) fn(over.task);
    return Boolean(over.task);
  });
  const notify = vi.fn();
  const ctx = {
    settings: {
      get: () => over.settings ?? { focus: 25, shortBreak: 5, longBreak: 15, longBreakEvery: 4 },
    },
    storage: {
      get: async (key: string) => store.get(key),
      set: async (key: string, value: unknown) => {
        store.set(key, value);
      },
      delete: async () => {},
      keys: async () => [...store.keys()],
    },
    tasks: {
      find: () => over.task ?? null,
      mutate,
    },
    ui: { saveFile: async () => {}, notify },
  } as unknown as PluginContext;
  return { ctx, mutate, notify, store };
}

describe('pomodoro state machine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T09:00:00Z'));
    __resetForTest();
  });
  afterEach(() => {
    __resetForTest();
    vi.useRealTimers();
  });

  it('starts idle with the focus duration shown', () => {
    const { ctx } = makeContext();
    void init(ctx);
    expect(pomo.phase).toBe('idle');
    expect(isRunning()).toBe(false);
    expect(remainingMs()).toBe(25 * 60_000);
  });

  it('start(focus) begins a running countdown', () => {
    const { ctx } = makeContext();
    void init(ctx);
    start('focus');
    expect(pomo.phase).toBe('focus');
    expect(isRunning()).toBe(true);
    expect(remainingMs()).toBe(25 * 60_000);
  });

  it('pause then resume preserves the remaining time', () => {
    const { ctx } = makeContext();
    void init(ctx);
    start('focus');
    vi.advanceTimersByTime(60_000); // 1 min elapses
    playClicked(); // pause
    expect(isPaused()).toBe(true);
    const left = remainingMs();
    expect(left).toBe(24 * 60_000);
    vi.advanceTimersByTime(120_000); // time passes while paused — no countdown
    expect(remainingMs()).toBe(left);
    playClicked(); // resume
    expect(isRunning()).toBe(true);
    expect(remainingMs()).toBe(24 * 60_000);
  });

  it('completing a focus session increments the task pomodoro count and queues a short break', () => {
    const task: Task = {
      id: 't1',
      checked: false,
      title: 'Write spec',
      note: '',
      resolution: '',
      priority: null,
      project: null,
      day: null,
      pomodoros: 0,
      subtasks: [],
    };
    const { ctx, mutate, notify } = makeContext({ task });
    void init(ctx);
    startForTask({ taskId: 't1', sectionId: 'active' });
    vi.advanceTimersByTime(25 * 60_000 + 500); // run past the focus duration
    expect(mutate).toHaveBeenCalledOnce();
    expect(task.pomodoros).toBe(1);
    expect(pomo.focusCount).toBe(1);
    expect(pomo.phase).toBe('short');
    expect(isQueued()).toBe(true);
    expect(notify).toHaveBeenCalledOnce();
  });

  it('queues a long break after `longBreakEvery` focus sessions', () => {
    const { ctx } = makeContext({
      settings: { focus: 1, shortBreak: 1, longBreak: 1, longBreakEvery: 2 },
    });
    void init(ctx);
    // First focus → short break queued.
    start('focus');
    vi.advanceTimersByTime(60_000 + 500);
    expect(pomo.phase).toBe('short');
    // Second focus → long break queued (2 % 2 === 0).
    start('focus');
    vi.advanceTimersByTime(60_000 + 500);
    expect(pomo.focusCount).toBe(2);
    expect(pomo.phase).toBe('long');
  });

  it('stop resets to idle and clears the task link', () => {
    const { ctx } = makeContext();
    void init(ctx);
    startForTask({ taskId: 't1', sectionId: 'active' });
    stop();
    expect(pomo.phase).toBe('idle');
    expect(isRunning()).toBe(false);
    expect(pomo.currentTaskTitle).toBeNull();
  });

  it('restores a running session from storage and auto-completes if it expired', async () => {
    // A focus session that ended 1s ago.
    const expired = {
      phase: 'focus',
      endTime: Date.now() - 1000,
      pausedRemainingMs: null,
      focusCount: 0,
      currentTaskId: null,
      currentTaskSectionId: null,
      currentTaskTitle: null,
    };
    const { ctx } = makeContext({ store: { state: expired } });
    await init(ctx);
    // Expired focus → completed → short break queued, focusCount bumped.
    expect(pomo.focusCount).toBe(1);
    expect(pomo.phase).toBe('short');
  });

  it('persists state to storage on transitions', async () => {
    const { ctx, store } = makeContext();
    await init(ctx);
    start('focus');
    const saved = store.get('state') as { phase: string } | undefined;
    expect(saved?.phase).toBe('focus');
  });
});
