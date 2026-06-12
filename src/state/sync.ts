import { db } from '@/db/client';
import { sections, dhikrs, deeds, deedLogs, dhikrLogs } from '@/db/schema';
import { supabase } from './supabase';
import { user$ } from './auth';
import { syncStatus$ } from './syncStatus';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { createMMKV } from 'react-native-mmkv';

// MMKV client-side persistence for tracking sync metadata
let storage: ReturnType<typeof createMMKV> | null = null;
const getStorage = () => {
  if (typeof window === 'undefined') return null;
  if (!storage) storage = createMMKV({ id: 'muhassaba-sync' });
  return storage;
};

interface SyncConfig<TLocal, TRemote> {
  localTable: any;
  remoteTableName: string;
  toRemote: (row: TLocal) => TRemote;
  toLocal: (remote: TRemote) => TLocal;
}

// 1. Sections Sync Configuration
const sectionsConfig: SyncConfig<any, any> = {
  localTable: sections,
  remoteTableName: 'sections',
  toRemote: (r) => ({
    id: r.id,
    user_id: r.userId,
    name: r.name,
    sort_order: r.sortOrder,
    deleted_at: r.deletedAt,
    updated_at: new Date(r.updatedAt).toISOString(),
    deleted: r.deleted,
  }),
  toLocal: (r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    sortOrder: r.sort_order,
    deletedAt: r.deleted_at,
    updatedAt: new Date(r.updated_at).getTime(),
    deleted: r.deleted,
  }),
};

// 2. Dhikrs Sync Configuration
const dhikrsConfig: SyncConfig<any, any> = {
  localTable: dhikrs,
  remoteTableName: 'dhikrs',
  toRemote: (r) => ({
    id: r.id,
    user_id: r.userId,
    name: r.name,
    sort_order: r.sortOrder,
    target: r.target,
    created_at: r.createdAt,
    deleted_at: r.deletedAt,
    updated_at: new Date(r.updatedAt).toISOString(),
    deleted: r.deleted,
  }),
  toLocal: (r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    sortOrder: r.sort_order,
    target: r.target,
    createdAt: r.created_at,
    deletedAt: r.deleted_at,
    updatedAt: new Date(r.updated_at).getTime(),
    deleted: r.deleted,
  }),
};

// 3. Deeds Sync Configuration
const deedsConfig: SyncConfig<any, any> = {
  localTable: deeds,
  remoteTableName: 'deeds',
  toRemote: (r) => ({
    id: r.id,
    user_id: r.userId,
    definition_id: r.definitionId,
    section_id: r.sectionId,
    name: r.name,
    type: r.type,
    schedule: r.schedule,
    created_at: r.createdAt,
    sort_order: r.sortOrder,
    deleted_at: r.deletedAt,
    linked_dhikr_id: r.linkedDhikrId,
    target: r.target,
    updated_at: new Date(r.updatedAt).toISOString(),
    deleted: r.deleted,
  }),
  toLocal: (r) => ({
    id: r.id,
    userId: r.user_id,
    definitionId: r.definition_id,
    sectionId: r.section_id,
    name: r.name,
    type: r.type,
    schedule: r.schedule,
    createdAt: r.created_at,
    sortOrder: r.sort_order,
    deletedAt: r.deleted_at,
    linkedDhikrId: r.linked_dhikr_id,
    target: r.target,
    updatedAt: new Date(r.updated_at).getTime(),
    deleted: r.deleted,
  }),
};

// 4. Deed Logs Sync Configuration
const deedLogsConfig: SyncConfig<any, any> = {
  localTable: deedLogs,
  remoteTableName: 'deed_logs',
  toRemote: (r) => ({
    id: r.id,
    user_id: r.userId,
    deed_id: r.deedId,
    date: r.date,
    status: r.status,
    value: r.value,
    note: r.note,
    updated_at: new Date(r.updatedAt).toISOString(),
    deleted: r.deleted,
  }),
  toLocal: (r) => ({
    id: r.id,
    userId: r.user_id,
    deedId: r.deed_id,
    date: r.date,
    status: r.status,
    value: r.value,
    note: r.note,
    updatedAt: new Date(r.updated_at).getTime(),
    deleted: r.deleted,
  }),
};

// 5. Dhikr Logs Sync Configuration
const dhikrLogsConfig: SyncConfig<any, any> = {
  localTable: dhikrLogs,
  remoteTableName: 'dhikr_logs',
  toRemote: (r) => ({
    id: r.id,
    user_id: r.userId,
    dhikr_id: r.dhikrId,
    date: r.date,
    count: r.count,
    updated_at: new Date(r.updatedAt).toISOString(),
    deleted: r.deleted,
  }),
  toLocal: (r) => ({
    id: r.id,
    userId: r.user_id,
    dhikrId: r.dhikr_id,
    date: r.date,
    count: r.count,
    updatedAt: new Date(r.updated_at).getTime(),
    deleted: r.deleted,
  }),
};

async function claimTableRows(table: any, userId: string) {
  await db
    .update(table)
    .set({ userId, dirty: true, updatedAt: Date.now() })
    .where(isNull(table.userId));
}

export async function claimLocalRows(userId: string) {
  await claimTableRows(sections, userId);
  await claimTableRows(dhikrs, userId);
  await claimTableRows(deeds, userId);
  await claimTableRows(deedLogs, userId);
  await claimTableRows(dhikrLogs, userId);
}

async function pushTableDirty<TLocal, TRemote>(
  config: SyncConfig<TLocal, TRemote>,
  userId: string
) {
  const table = config.localTable;
  const dirtyRows = await db
    .select()
    .from(table)
    .where(and(eq(table.dirty, true), eq(table.userId, userId)));

  if (dirtyRows.length === 0) return;

  const payload = dirtyRows.map(config.toRemote);

  const { error } = await supabase
    .from(config.remoteTableName)
    .upsert(payload as any, { onConflict: 'id' });

  if (error) throw error;

  const ids = dirtyRows.map((r: any) => r.id);
  await db
    .update(table)
    .set({ dirty: false })
    .where(inArray(table.id, ids));
}

async function pullTableRemote<TLocal, TRemote>(
  config: SyncConfig<TLocal, TRemote>,
  userId: string
) {
  const s = getStorage();
  const pullKey = `last_pull_ts_${config.remoteTableName}`;
  const lastPull = s?.getNumber(pullKey) ?? 0;
  const lastPullIso = new Date(lastPull).toISOString();

  const { data, error } = await supabase
    .from(config.remoteTableName)
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', lastPullIso);

  if (error) throw error;
  if (!data || data.length === 0) {
    s?.set(pullKey, Date.now());
    return;
  }

  let maxTs = lastPull;

  await db.transaction(async (tx) => {
    for (const remote of data) {
      const remoteTs = new Date(remote.updated_at).getTime();
      maxTs = Math.max(maxTs, remoteTs);

      const localId = remote.id;
      const existing = await tx
        .select()
        .from(config.localTable)
        .where(eq(config.localTable.id, localId));
      const local = existing[0] as any;

      if (!local) {
        await tx.insert(config.localTable).values({
          ...config.toLocal(remote),
          dirty: false,
        });
      } else if (remoteTs > local.updatedAt) {
        await tx
          .update(config.localTable)
          .set({
            ...config.toLocal(remote),
            dirty: false,
          })
          .where(eq(config.localTable.id, localId));
      }
    }
  });

  s?.set(pullKey, maxTs);
}

async function pushDirty(userId: string) {
  // Topological order: Parents first
  await pushTableDirty(sectionsConfig, userId);
  await pushTableDirty(dhikrsConfig, userId);
  // Deeds references sections and dhikrs
  await pushTableDirty(deedsConfig, userId);
  // Logs reference deeds and dhikrs
  await pushTableDirty(deedLogsConfig, userId);
  await pushTableDirty(dhikrLogsConfig, userId);
}

async function pullRemote(userId: string) {
  // Topological order: Parents first
  await pullTableRemote(sectionsConfig, userId);
  await pullTableRemote(dhikrsConfig, userId);
  // Deeds references sections and dhikrs
  await pullTableRemote(deedsConfig, userId);
  // Logs reference deeds and dhikrs
  await pullTableRemote(deedLogsConfig, userId);
  await pullTableRemote(dhikrLogsConfig, userId);
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
