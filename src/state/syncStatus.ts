import { useSyncExternalStore } from 'react';
import { makeObservable } from './observable';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'localOnly' | 'error';

export const syncStatus$ = makeObservable<SyncStatus>('localOnly');

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(syncStatus$.onChange, syncStatus$.get, syncStatus$.get);
}
