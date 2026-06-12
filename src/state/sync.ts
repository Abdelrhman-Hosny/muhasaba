import { db } from '@/db/client';
import { prayerLogs } from '@/db/schema';
import { supabase } from './supabase';
import { user$ } from './auth';
import { syncStatus$ } from './syncStatus';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { createMMKV } from 'react-native-mmkv';
import { Prayer } from '@/domain/prayers';
import { localRowId } from './prayerStore';

// We only run client-side, so createMMKV is safe here.
let storage: ReturnType<typeof createMMKV> | null = null;
const getStorage = () => {
  if (typeof window === 'undefined') return null;
  if (!storage) storage = createMMKV({ id: 'muhassaba-sync' });
  return storage;
};

const LAST_PULL_KEY = 'last_pull_ts';

export async function claimLocalRows(userId: string) {
  await db
    .update(prayerLogs)
    .set({ userId, dirty: true, updatedAt: Date.now() })
    .where(isNull(prayerLogs.userId));
}

async function pushDirty(userId: string) {
  const dirtyRows = await db
    .select()
    .from(prayerLogs)
    .where(and(eq(prayerLogs.dirty, true), eq(prayerLogs.userId, userId)));

  if (dirtyRows.length === 0) return;

  const payload = dirtyRows.map((r) => ({
    user_id: r.userId!,
    date: r.date,
    prayer: r.prayer,
    status: r.status === 'done' ? 'on_time' : r.status,
    updated_at: new Date(r.updatedAt).toISOString(),
    deleted: r.deleted,
  }));

  const { error } = await supabase.from('prayer_logs').upsert(payload, {
    onConflict: 'user_id, date, prayer',
  });

  if (error) throw error;

  // Clear dirty flag
  await db
    .update(prayerLogs)
    .set({ dirty: false })
    .where(inArray(prayerLogs.id, dirtyRows.map(r => r.id)));
}

async function pullRemote(userId: string) {
  const s = getStorage();
  const lastPull = s?.getNumber(LAST_PULL_KEY) ?? 0;
  const lastPullIso = new Date(lastPull).toISOString();

  const { data, error } = await supabase
    .from('prayer_logs')
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', lastPullIso);

  if (error) throw error;
  if (!data || data.length === 0) {
    s?.set(LAST_PULL_KEY, Date.now());
    return;
  }

  let maxTs = lastPull;

  await db.transaction(async (tx) => {
    for (const remote of data) {
      const remoteTs = new Date(remote.updated_at).getTime();
      maxTs = Math.max(maxTs, remoteTs);

      const localId = localRowId(remote.date, remote.prayer as Prayer);
      const existing = await tx.select().from(prayerLogs).where(eq(prayerLogs.id, localId));
      const local = existing[0];

      if (!local) {
        await tx.insert(prayerLogs).values({
          id: localId,
          userId: remote.user_id,
          date: remote.date,
          prayer: remote.prayer,
          status: remote.status,
          updatedAt: remoteTs,
          deleted: remote.deleted,
          dirty: false,
        });
      } else if (remoteTs > local.updatedAt) {
        await tx.update(prayerLogs).set({
          status: remote.status,
          updatedAt: remoteTs,
          deleted: remote.deleted,
          dirty: false,
        }).where(eq(prayerLogs.id, localId));
      }
    }
  });

  s?.set(LAST_PULL_KEY, maxTs);
}

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;

export async function runSync() {
  const user = user$.get();
  if (!user) {
    syncStatus$.set('localOnly');
    return;
  }

  if (isSyncing) return;
  isSyncing = true;
  syncStatus$.set('syncing');

  try {
    await pushDirty(user.id);
    await pullRemote(user.id);
    syncStatus$.set('synced');
  } catch (err) {
    console.error('Sync error:', err);
    syncStatus$.set('offline');
  } finally {
    isSyncing = false;
  }
}

export function scheduleSync(delayMs = 2000) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    runSync();
  }, delayMs);
}

user$.onChange(() => {
  const u = user$.get();
  if (u) {
    claimLocalRows(u.id).then(() => runSync());
  } else {
    syncStatus$.set('localOnly');
  }
});
