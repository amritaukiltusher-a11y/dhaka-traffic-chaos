import { useSyncExternalStore } from 'react';

type Listener = () => void;

export interface Store<T> {
  get: () => T;
  set: (next: T) => void;
  update: (fn: (prev: T) => T) => void;
  subscribe: (l: Listener) => () => void;
}

/**
 * Tiny persisted store. Every access to localStorage is wrapped in try/catch
 * because it can throw (private mode, blocked storage, quota exceeded).
 */
export function createPersistedStore<T>(key: string, initial: T, sanitize: (raw: unknown) => T): Store<T> {
  const listeners = new Set<Listener>();

  const load = (): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? sanitize(JSON.parse(raw)) : initial;
    } catch {
      return initial;
    }
  };

  let value: T = load();

  const notify = () => listeners.forEach((l) => l());

  if (typeof window !== 'undefined') {
    // keep multiple tabs in sync
    window.addEventListener('storage', (e) => {
      if (e.key === key) {
        value = load();
        notify();
      }
    });
  }

  const set = (next: T) => {
    value = next;
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* storage unavailable: keep the in-memory value */
    }
    notify();
  };

  return {
    get: () => value,
    set,
    update: (fn) => set(fn(value)),
    subscribe: (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    }
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
