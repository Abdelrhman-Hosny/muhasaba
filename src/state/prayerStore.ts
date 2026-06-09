import { and, eq } from 'drizzle-orm';
import { useMemo } from 'react';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '@/db/client';
import { prayerLogs } from '@/db/schema';
import { PRAYERS, Prayer, PrayerStatus, normalizeStatus } from '@/domain/prayers';
import { user$ } from '@/state/auth';

export const localRowId = (date: string, prayer: Prayer) => `${date}:${prayer}`;

/** Upsert one prayer's status for a date. Always local-first and marked dirty. */
export async function setStatus(date: string, prayer: Prayer, status: PrayerStatus): Promise<void> {
  const now = Date.now();
  const userId = user$.get()?.id ?? null;
  await db
    .insert(prayerLogs)
    .values({
      id: localRowId(date, prayer),
      userId,
      date,
      prayer,
      status,
      updatedAt: now,
      deleted: false,
      dirty: true,
    })
    .onConflictDoUpdate({
      target: [prayerLogs.date, prayerLogs.prayer],
      set: { status, updatedAt: now, deleted: false, dirty: true },
    });
}

export type DayStatuses = Record<Prayer, PrayerStatus>;

const EMPTY_DAY = (): DayStatuses =>
  Object.fromEntries(PRAYERS.map((p) => [p, 'not_yet'])) as DayStatuses;

/** Reactive: the five prayer statuses for a date. Missing/deleted rows read as `not_yet`. */
export function useDay(date: string): DayStatuses {
  const { data } = useLiveQuery(
    db
      .select()
      .from(prayerLogs)
      .where(and(eq(prayerLogs.date, date), eq(prayerLogs.deleted, false))),
    [date],
  );

  return useMemo(() => {
    const day = EMPTY_DAY();
    for (const row of data ?? []) {
      day[row.prayer as Prayer] = normalizeStatus(row.status);
    }
    return day;
  }, [data]);
}
