import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Autosaver } from '../../../src/lib/vault/autosave.js';

describe('Autosaver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes the scheduled content after the debounce window', async () => {
    const writes: string[] = [];
    const saver = new Autosaver({
      write: async (md) => {
        writes.push(md);
      },
      debounceMs: 500,
    });
    saver.schedule('hello');
    expect(writes).toEqual([]);
    await vi.advanceTimersByTimeAsync(499);
    expect(writes).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(writes).toEqual(['hello']);
  });

  it('coalesces consecutive schedules into a single write', async () => {
    const writes: string[] = [];
    const saver = new Autosaver({
      write: async (md) => {
        writes.push(md);
      },
      debounceMs: 500,
    });
    saver.schedule('a');
    await vi.advanceTimersByTimeAsync(200);
    saver.schedule('b');
    await vi.advanceTimersByTimeAsync(200);
    saver.schedule('c');
    await vi.advanceTimersByTimeAsync(500);
    expect(writes).toEqual(['c']);
  });

  it('isPending stays true between schedule and write completion', async () => {
    let resolveWrite: () => void = () => {};
    const writePromise = new Promise<void>((r) => (resolveWrite = r));
    const saver = new Autosaver({
      write: () => writePromise,
      debounceMs: 100,
    });
    expect(saver.isPending).toBe(false);
    saver.schedule('x');
    expect(saver.isPending).toBe(true); // timer pending
    await vi.advanceTimersByTimeAsync(100);
    expect(saver.isPending).toBe(true); // write in flight
    resolveWrite();
    await vi.runAllTimersAsync();
    // Drain microtasks.
    await Promise.resolve();
    await Promise.resolve();
    expect(saver.isPending).toBe(false);
  });

  it('flush() writes immediately and resolves when the write completes', async () => {
    const writes: string[] = [];
    const saver = new Autosaver({
      write: async (md) => {
        writes.push(md);
      },
      debounceMs: 500,
    });
    saver.schedule('hello');
    await saver.flush();
    expect(writes).toEqual(['hello']);
    expect(saver.isPending).toBe(false);
  });

  it('flush() is a no-op when nothing is scheduled', async () => {
    const writes: string[] = [];
    const saver = new Autosaver({ write: async (md) => void writes.push(md) });
    await saver.flush();
    expect(writes).toEqual([]);
  });

  it('dispose() cancels a pending timer', async () => {
    const writes: string[] = [];
    const saver = new Autosaver({
      write: async (md) => {
        writes.push(md);
      },
      debounceMs: 500,
    });
    saver.schedule('a');
    saver.dispose();
    await vi.advanceTimersByTimeAsync(1000);
    expect(writes).toEqual([]);
  });

  it('schedule() after dispose() is a no-op', async () => {
    const writes: string[] = [];
    const saver = new Autosaver({
      write: async (md) => {
        writes.push(md);
      },
      debounceMs: 100,
    });
    saver.dispose();
    saver.schedule('ignored');
    await vi.advanceTimersByTimeAsync(500);
    expect(writes).toEqual([]);
  });

  it('reports write errors through onError without throwing', async () => {
    const errors: unknown[] = [];
    const saver = new Autosaver({
      write: async () => {
        throw new Error('disk full');
      },
      onError: (err) => errors.push(err),
      debounceMs: 50,
    });
    saver.schedule('boom');
    await vi.advanceTimersByTimeAsync(50);
    // Drain the write microtask + error handler microtask.
    await Promise.resolve();
    await Promise.resolve();
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('disk full');
    expect(saver.isPending).toBe(false);
  });

  it('chains consecutive writes — the second waits for the first', async () => {
    const order: string[] = [];
    let firstResolve: () => void = () => {};
    const firstPromise = new Promise<void>((r) => (firstResolve = r));
    let firstStarted = false;
    const saver = new Autosaver({
      write: async (md) => {
        order.push(`start ${md}`);
        if (!firstStarted) {
          firstStarted = true;
          await firstPromise;
        }
        order.push(`end ${md}`);
      },
      debounceMs: 50,
    });
    saver.schedule('a');
    await vi.advanceTimersByTimeAsync(50);
    // 'a' has started but is awaiting firstPromise.
    saver.schedule('b');
    await vi.advanceTimersByTimeAsync(50);
    // 'b' debounce fired but the new write must wait for 'a'.
    expect(order).toEqual(['start a']);
    firstResolve();
    await vi.runAllTimersAsync();
    await Promise.resolve();
    await Promise.resolve();
    expect(order).toEqual(['start a', 'end a', 'start b', 'end b']);
  });
});
