/**
 * Minimal observable: a single value with subscribe/notify. Replaces the one
 * Legend-State feature we still needed (a tiny global store for the auth user).
 * Compatible with React's useSyncExternalStore (onChange returns an unsubscribe).
 */
export interface Obs<T> {
  get(): T;
  peek(): T;
  set(value: T): void;
  onChange(cb: () => void): () => void;
}

export function makeObservable<T>(initial: T): Obs<T> {
  let value = initial;
  const subs = new Set<() => void>();
  return {
    get: () => value,
    peek: () => value,
    set: (next: T) => {
      value = next;
      subs.forEach((cb) => cb());
    },
    onChange: (cb: () => void) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
  };
}
