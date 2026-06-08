import { useSyncExternalStore } from 'react';
import type { Observable } from '@legendapp/state';

/**
 * Subscribe a component to a Legend-State observable with a single, stable
 * hook (`useSyncExternalStore`).
 *
 * We use this instead of Legend-State's `use$`/`useSelector`, whose internal
 * hook count varies depending on a global `inObserver` flag — which is
 * unstable across renders under React 19 and triggers rules-of-hooks errors
 * unless every consumer is wrapped in the `observer` HOC. `useObs` has no such
 * dependency and always calls exactly one hook.
 */
export function useObs<T>(obs: Observable<T>): T {
  return useSyncExternalStore(
    (cb) => obs.onChange(cb),
    () => obs.peek() as T,
    () => obs.peek() as T,
  );
}
