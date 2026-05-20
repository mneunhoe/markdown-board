// Typed hook event bus. Pure (no runes / DOM) so it's unit-testable in
// isolation. Handlers registered via `on` return a Disposable; `emit` fans out
// to current subscribers and swallows handler errors (a misbehaving plugin
// must not break the host's mutation path) — routing them to `onError`.

import type { Disposable, HookEvents, HookRegistry } from '@markdown-board/plugin-api';

// `never` payload makes every concrete `Handler<E>` assignable to the stored
// type without resorting to `any` (banned by eslint).
type StoredHandler = (payload: never) => void | Promise<void>;

export interface HookBus extends HookRegistry {
  emit<E extends keyof HookEvents>(event: E, payload: HookEvents[E]): void;
  /** Drop every subscriber (used when tearing down all plugins). */
  clear(): void;
}

export function createHookBus(onError?: (err: unknown) => void): HookBus {
  const handlers = new Map<keyof HookEvents, Set<StoredHandler>>();

  return {
    on(event, handler) {
      let set = handlers.get(event);
      if (!set) {
        set = new Set();
        handlers.set(event, set);
      }
      set.add(handler as StoredHandler);
      const disposable: Disposable = {
        dispose() {
          set?.delete(handler as StoredHandler);
        },
      };
      return disposable;
    },

    emit(event, payload) {
      const set = handlers.get(event);
      if (!set) return;
      // Snapshot so a handler that unsubscribes mid-emit doesn't mutate the
      // set we're iterating.
      for (const handler of [...set]) {
        try {
          const result = (handler as (p: HookEvents[typeof event]) => void | Promise<void>)(
            payload,
          );
          if (result instanceof Promise) result.catch((err) => onError?.(err));
        } catch (err) {
          onError?.(err);
        }
      }
    },

    clear() {
      handlers.clear();
    },
  };
}
