// Test-environment polyfills.
//
// happy-dom@15.11.7 ships `window.localStorage` as a null-prototype `{}`
// instead of a real `Storage` instance — calls like `setItem` /
// `getItem` / `removeItem` fail with `TypeError: ... is not a function`.
// Install a Map-backed shim so settings persistence tests can exercise
// the real load/save round-trip without bypassing the API surface.

class MapStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

const storage = new MapStorage();
Object.defineProperty(window, 'localStorage', { value: storage, writable: true });
Object.defineProperty(globalThis, 'localStorage', { value: storage, writable: true });
