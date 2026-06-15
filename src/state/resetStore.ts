import { eq } from 'drizzle-orm';
import { createMMKV } from 'react-native-mmkv';
import { db } from '@/db/client';
import { deedLogs, dhikrLogs, deeds, sections, dhikrs } from '@/db/schema';
import { scheduleSync } from '@/state/sync';
import { seedDefaultUserData } from '@/db/seed';
import { todayKey } from '@/domain/dates';

/**
 * Reset progress. All three variants:
 *   - work fully offline (writes land in local SQLite immediately),
 *   - tombstone rows (deleted + dirty) rather than hard-deleting, so the next
 *     sync propagates the deletion to Supabase and the server won't resurrect
 *     the data on the next pull (last-write-wins by updatedAt),
 *   - clear the in-modal adhkar progress kept in MMKV.
 */

const adhkarStorage = createMMKV({ id: 'muhassaba-adhkar-progress' });

function clearAdhkarProgress(): void {
  for (const key of adhkarStorage.getAllKeys()) {
    adhkarStorage.remove(key);
  }
}

/** Deletes all deed logs and dhikr logs; keeps deeds/sections/counters. */
export async function resetLogsOnly(): Promise<void> {
  const now = Date.now();

  await db.transaction(async (tx) => {
    await tx.update(deedLogs).set({ deleted: true, dirty: true, updatedAt: now }).where(eq(deedLogs.deleted, false));
    await tx.update(dhikrLogs).set({ deleted: true, dirty: true, updatedAt: now }).where(eq(dhikrLogs.deleted, false));
  });

  clearAdhkarProgress();
  scheduleSync();
}

/** Deletes all logs AND removes all deeds, sections, and dhikr counters. */
export async function resetLogsAndDeeds(): Promise<void> {
  const now = Date.now();
  const today = todayKey();

  await db.transaction(async (tx) => {
    await tx.update(deedLogs).set({ deleted: true, dirty: true, updatedAt: now }).where(eq(deedLogs.deleted, false));
    await tx.update(dhikrLogs).set({ deleted: true, dirty: true, updatedAt: now }).where(eq(dhikrLogs.deleted, false));
    await tx.update(deeds).set({ deleted: true, deletedAt: today, dirty: true, updatedAt: now }).where(eq(deeds.deleted, false));
    await tx.update(sections).set({ deleted: true, deletedAt: today, dirty: true, updatedAt: now }).where(eq(sections.deleted, false));
    await tx.update(dhikrs).set({ deleted: true, deletedAt: today, dirty: true, updatedAt: now }).where(eq(dhikrs.deleted, false));
  });

  clearAdhkarProgress();
  scheduleSync();
}

/**
 * Wipes all logs and deeds, then re-seeds the default starter scorecard with
 * fresh ids (so the new rows don't collide with the tombstoned default rows).
 */
export async function factoryReset(): Promise<void> {
  const now = Date.now();
  const today = todayKey();

  await db.transaction(async (tx) => {
    await tx.update(deedLogs).set({ deleted: true, dirty: true, updatedAt: now }).where(eq(deedLogs.deleted, false));
    await tx.update(dhikrLogs).set({ deleted: true, dirty: true, updatedAt: now }).where(eq(dhikrLogs.deleted, false));
    await tx.update(deeds).set({ deleted: true, deletedAt: today, dirty: true, updatedAt: now }).where(eq(deeds.deleted, false));
    await tx.update(sections).set({ deleted: true, deletedAt: today, dirty: true, updatedAt: now }).where(eq(sections.deleted, false));
    await tx.update(dhikrs).set({ deleted: true, deletedAt: today, dirty: true, updatedAt: now }).where(eq(dhikrs.deleted, false));
  });

  await seedDefaultUserData({ freshIds: true });

  clearAdhkarProgress();
  scheduleSync();
}
