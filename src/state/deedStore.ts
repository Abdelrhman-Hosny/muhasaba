import { and, eq, inArray, lte, or, isNull, gt } from 'drizzle-orm';
import { useMemo } from 'react';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '@/db/client';
import { deeds, deedLogs, sections, dhikrs, dhikrLogs, SectionRow, DeedRow, DeedLogRow, DhikrRow, DhikrLogRow } from '@/db/schema';
import { user$ } from '@/state/auth';
import { scheduleSync } from '@/state/sync';

export const localLogId = (date: string, refId: string) => `${date}:${refId}`;

/**
 * Toggles a boolean deed status, or sets a measured deed's progress value.
 * Marked as dirty and triggers a debounced sync.
 */
export async function setDeedLog(
  date: string,
  deedId: string,
  status: 'done' | 'not_yet',
  value: number | null = null,
  note: string | null = null
): Promise<void> {
  const now = Date.now();
  const userId = user$.get()?.id ?? null;
  const logId = localLogId(date, deedId);

  await db
    .insert(deedLogs)
    .values({
      id: logId,
      userId,
      deedId,
      date,
      status,
      value,
      note,
      updatedAt: now,
      deleted: false,
      dirty: true,
    })
    .onConflictDoUpdate({
      target: [deedLogs.userId, deedLogs.date, deedLogs.deedId],
      set: { status, value, note, updatedAt: now, deleted: false, dirty: true },
    });

  scheduleSync();
}

/**
 * Increments or logs a count for a Dhikr counter (Dhikr Mutlaq).
 * If the counter is linked to a scorecard deed, handles auto-completion of that deed.
 */
export async function incrementDhikrCount(
  date: string,
  dhikrId: string,
  amount: number
): Promise<void> {
  const now = Date.now();
  const userId = user$.get()?.id ?? null;
  const logId = localLogId(date, dhikrId);

  // 1. Get existing log
  const existing = await db
    .select()
    .from(dhikrLogs)
    .where(eq(dhikrLogs.id, logId))
    .limit(1);

  const currentCount = existing[0]?.count ?? 0;
  const newCount = Math.max(0, currentCount + amount);

  // 2. Upsert dhikr log
  await db
    .insert(dhikrLogs)
    .values({
      id: logId,
      userId,
      dhikrId,
      date,
      count: newCount,
      updatedAt: now,
      deleted: false,
      dirty: true,
    })
    .onConflictDoUpdate({
      target: [dhikrLogs.userId, dhikrLogs.date, dhikrLogs.dhikrId],
      set: { count: newCount, updatedAt: now, deleted: false, dirty: true },
    });

  // 3. Auto-complete linked deeds if count exceeds or meets target
  const linkedDeeds = await db
    .select()
    .from(deeds)
    .where(and(eq(deeds.linkedDhikrId, dhikrId), eq(deeds.deleted, false)));

  for (const deed of linkedDeeds) {
    if (deed.target) {
      const isDone = newCount >= deed.target;
      await setDeedLog(date, deed.id, isDone ? 'done' : 'not_yet', isDone ? deed.target : null);
    }
  }

  scheduleSync();
}

export interface ScorecardItem {
  deed: DeedRow;
  log: DeedLogRow | null;
}

export interface ScorecardSection {
  section: SectionRow;
  items: ScorecardItem[];
}

/**
 * Reactive: returns the user's scorecard grouped by sections for a specific date,
 * filtering out deeds not yet created or already deleted on this date.
 */
export function useScorecard(date: string): ScorecardSection[] {
  // Query all active sections
  const { data: rawSections } = useLiveQuery(
    db
      .select()
      .from(sections)
      .where(and(eq(sections.deleted, false), or(isNull(sections.deletedAt), gt(sections.deletedAt, date)))),
    [date]
  );

  // Query all active deeds for the date
  const { data: rawDeeds } = useLiveQuery(
    db
      .select()
      .from(deeds)
      .where(
        and(
          eq(deeds.deleted, false),
          lte(deeds.createdAt, date),
          or(isNull(deeds.deletedAt), gt(deeds.deletedAt, date))
        )
      ),
    [date]
  );

  // Query deed logs for the date
  const { data: rawLogs } = useLiveQuery(
    db
      .select()
      .from(deedLogs)
      .where(and(eq(deedLogs.date, date), eq(deedLogs.deleted, false))),
    [date]
  );

  return useMemo(() => {
    if (!rawSections || !rawDeeds) return [];

    // Map logs by deedId
    const logMap = new Map<string, DeedLogRow>();
    for (const log of rawLogs ?? []) {
      logMap.set(log.deedId, log);
    }

    // Map deeds by sectionId
    const deedMap = new Map<string, ScorecardItem[]>();
    for (const deed of rawDeeds) {
      const log = logMap.get(deed.id) ?? null;
      if (!deedMap.has(deed.sectionId)) {
        deedMap.set(deed.sectionId, []);
      }
      deedMap.get(deed.sectionId)!.push({ deed, log });
    }

    // Build ordered sections
    const result: ScorecardSection[] = [];
    const sortedSections = [...rawSections].sort((a, b) => a.sortOrder - b.sortOrder);
    
    for (const sec of sortedSections) {
      const items = deedMap.get(sec.id) ?? [];
      if (items.length > 0) {
        items.sort((a, b) => a.deed.sortOrder - b.deed.sortOrder);
        result.push({ section: sec, items });
      }
    }

    return result;
  }, [rawSections, rawDeeds, rawLogs]);
}

export interface DhikrTallyItem {
  dhikr: DhikrRow;
  log: DhikrLogRow | null;
}

/**
 * Reactive: returns the user's active dhikr counters and their counts for a specific date.
 */
export function useDhikrs(date: string): DhikrTallyItem[] {
  const { data: rawDhikrs } = useLiveQuery(
    db
      .select()
      .from(dhikrs)
      .where(and(eq(dhikrs.deleted, false), or(isNull(dhikrs.deletedAt), gt(dhikrs.deletedAt, date)))),
    [date]
  );

  const { data: rawLogs } = useLiveQuery(
    db
      .select()
      .from(dhikrLogs)
      .where(and(eq(dhikrLogs.date, date), eq(dhikrLogs.deleted, false))),
    [date]
  );

  return useMemo(() => {
    if (!rawDhikrs) return [];

    const logMap = new Map<string, DhikrLogRow>();
    for (const log of rawLogs ?? []) {
      logMap.set(log.dhikrId, log);
    }

    const items = rawDhikrs.map((dhikr) => ({
      dhikr,
      log: logMap.get(dhikr.id) ?? null,
    }));

    return items.sort((a, b) => a.dhikr.sortOrder - b.dhikr.sortOrder);
  }, [rawDhikrs, rawLogs]);
}

/**
 * Reactive: done-score percentage per day for a range of dates (for date-strip displays).
 * Calculates actual percentage based on:
 * sum(deed_score) / count(active_deeds) * 100
 * where:
 *   - boolean: status = 'done' is 1.0, 'not_yet' is 0.0
 *   - measured: min(1.0, value / target)
 */
export function useDatesPercentages(dates: string[]): Record<string, number> {
  const { data: rawDeeds } = useLiveQuery(
    db
      .select()
      .from(deeds)
      .where(eq(deeds.deleted, false))
  );

  const { data: rawLogs } = useLiveQuery(
    db
      .select()
      .from(deedLogs)
      .where(and(inArray(deedLogs.date, dates), eq(deedLogs.deleted, false))),
    [dates.join(',')]
  );

  return useMemo(() => {
    const percentages: Record<string, number> = {};
    if (!rawDeeds) return percentages;

    // Index logs by date -> deedId
    const logIndex: Record<string, Record<string, DeedLogRow>> = {};
    for (const d of dates) logIndex[d] = {};
    for (const log of rawLogs ?? []) {
      if (logIndex[log.date]) {
        logIndex[log.date][log.deedId] = log;
      }
    }

    for (const d of dates) {
      // Find active deeds on this date
      const activeDeeds = rawDeeds.filter((deed) => {
        const createdOk = deed.createdAt <= d;
        const notDeletedYet = !deed.deletedAt || deed.deletedAt > d;
        return createdOk && notDeletedYet;
      });

      if (activeDeeds.length === 0) {
        percentages[d] = 0;
        continue;
      }

      let scoreSum = 0;
      const dayLogs = logIndex[d];

      for (const deed of activeDeeds) {
        const log = dayLogs[deed.id];
        if (!log) continue;

        if (deed.type === 'boolean') {
          if (log.status === 'done') {
            scoreSum += 1.0;
          }
        } else if (deed.type === 'measured' && deed.target) {
          const val = log.value ?? 0;
          scoreSum += Math.min(1.0, val / deed.target);
        }
      }

      percentages[d] = Math.round((scoreSum / activeDeeds.length) * 100);
    }

    return percentages;
  }, [rawDeeds, rawLogs, dates]);
}
