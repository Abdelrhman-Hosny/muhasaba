import { observable } from '@legendapp/state';
import { configureSynced } from '@legendapp/state/sync';
import { syncedSupabase } from '@legendapp/state/sync-plugins/supabase';
import { observablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv';
import { supabase } from './supabase';
import { user$ } from './auth';

// Deterministic composite-key helpers used as local row IDs.
export const prayerLogId = (userId: string, date: string, prayer: string) =>
  `${userId}:${date}:${prayer}`;
export const habitLogId = (userId: string, date: string, habitId: string) =>
  `${userId}:${date}:${habitId}`;

// Create a single shared MMKV plugin instance (v4-compatible: uses createMMKV internally).
const mmkvPlugin = observablePersistMMKV({ id: 'obsPersist' });

// Pre-configure syncedSupabase with project-wide defaults.
// `configureSynced` returns the same function with these options baked in.
const customSynced = configureSynced(syncedSupabase, {
  supabase: supabase as any,
  persist: { plugin: mmkvPlugin },
  changesSince: 'last-sync',
  fieldCreatedAt: 'created_at',
  fieldUpdatedAt: 'updated_at',
  fieldDeleted: 'deleted',
} as any);

function userId(): string {
  return user$.get()?.id ?? '';
}

// The three core stores. Each is keyed by the row's `id` field (Supabase default).
// `filter` narrows rows to the signed-in user; `persist.name` is the MMKV table name.

export const habits$ = observable(
  customSynced({
    collection: 'habits' as any,
    filter: (select: any) => select.eq('user_id', userId()),
    persist: { name: 'habits' },
  }),
);

export const habitLogs$ = observable(
  customSynced({
    collection: 'habit_logs' as any,
    filter: (select: any) => select.eq('user_id', userId()),
    persist: { name: 'habit_logs' },
  }),
);

export const prayerLogs$ = observable(
  customSynced({
    collection: 'prayer_logs' as any,
    filter: (select: any) => select.eq('user_id', userId()),
    persist: { name: 'prayer_logs' },
  }),
);

export function clearStores() {
  habits$.set({} as any);
  habitLogs$.set({} as any);
  prayerLogs$.set({} as any);
}
