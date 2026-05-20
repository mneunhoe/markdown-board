import { describe, expect, it, vi } from 'vitest';

import { createHookBus } from '../../../src/lib/plugins/hooks.js';

describe('createHookBus', () => {
  it('delivers an emitted payload to subscribers of that event', () => {
    const bus = createHookBus();
    const seen: string[] = [];
    bus.on('vault.opened', (p) => {
      seen.push(p.vaultPath ?? 'null');
    });
    bus.emit('vault.opened', { vaultPath: '/vault' });
    expect(seen).toEqual(['/vault']);
  });

  it('does not deliver to handlers of other events', () => {
    const bus = createHookBus();
    const saved = vi.fn();
    bus.on('vault.saved', saved);
    bus.emit('vault.opened', { vaultPath: null });
    expect(saved).not.toHaveBeenCalled();
  });

  it('stops delivering after dispose', () => {
    const bus = createHookBus();
    const handler = vi.fn();
    const sub = bus.on('vault.saved', handler);
    bus.emit('vault.saved', { vaultPath: null });
    sub.dispose();
    bus.emit('vault.saved', { vaultPath: null });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('isolates a throwing handler and routes the error to onError', () => {
    const onError = vi.fn();
    const bus = createHookBus(onError);
    const after = vi.fn();
    bus.on('vault.saved', () => {
      throw new Error('boom');
    });
    bus.on('vault.saved', after);
    bus.emit('vault.saved', { vaultPath: null });
    expect(onError).toHaveBeenCalledOnce();
    expect(after).toHaveBeenCalledOnce();
  });

  it('routes a rejected async handler to onError', async () => {
    const onError = vi.fn();
    const bus = createHookBus(onError);
    bus.on('vault.saved', () => Promise.reject(new Error('async boom')));
    bus.emit('vault.saved', { vaultPath: null });
    await Promise.resolve();
    await Promise.resolve();
    expect(onError).toHaveBeenCalledOnce();
  });

  it('clear() drops all subscribers', () => {
    const bus = createHookBus();
    const handler = vi.fn();
    bus.on('vault.opened', handler);
    bus.clear();
    bus.emit('vault.opened', { vaultPath: null });
    expect(handler).not.toHaveBeenCalled();
  });

  it('tolerates a handler unsubscribing mid-emit', () => {
    const bus = createHookBus();
    const order: number[] = [];
    const sub = bus.on('vault.saved', () => {
      order.push(1);
      sub.dispose();
    });
    bus.on('vault.saved', () => {
      order.push(2);
    });
    bus.emit('vault.saved', { vaultPath: null });
    expect(order).toEqual([1, 2]);
  });
});
