import { and, eq, inArray, lte, or, isNull, gt, sql, asc } from 'drizzle-orm';
import { useMemo } from 'react';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '@/db/client';
import { deeds, deedLogs, sections, dhikrs, dhikrLogs, deedDefinitions, SectionRow, DeedRow, DeedLogRow, DhikrRow, DhikrLogRow, DeedDefinitionRow } from '@/db/schema';
import { user$ } from '@/state/auth';
import { scheduleSync } from '@/state/sync';
import { todayKey, weekdayIndex } from '@/domain/dates';
import * as Crypto from 'expo-crypto';

export const localLogId = (date: string, refId: string) => `${date}:${refId}`;

/**
 * Toggles a boolean deed status, or sets a measured deed's progress value.
 * Marked as dirty and triggers a debounced sync.
 */
export async function setDeedLog(
  date: string,
  deedId: string,
  status: 'done' | 'not_yet' | 'not_done',
  value: number | null = null,
  note: string | null = null
): Promise<void> {
  const now = Date.now();
  const userId = user$.get()?.id ?? null;
  const logId = localLogId(date, deedId);

  // 1. Fetch the deed definition to see if it is linked to a dhikr counter
  const deedData = await db
    .select()
    .from(deeds)
    .where(eq(deeds.id, deedId))
    .limit(1);

  const deed = deedData[0];

  // 2. Determine final log value
  let finalValue = value;
  if (deed && deed.type === 'measured' && value === null) {
    finalValue = status === 'done' ? (deed.target ?? 0) : 0;
  }

  // 3. Upsert deed log
  await db
    .insert(deedLogs)
    .values({
      id: logId,
      userId,
      deedId,
      date,
      status,
      value: finalValue,
      note,
      updatedAt: now,
      deleted: false,
      dirty: true,
    })
    .onConflictDoUpdate({
      target: deedLogs.id,
      set: { status, value: finalValue, note, updatedAt: now, deleted: false, dirty: true },
    });

  // 4. Perform Two-Way Sync to update linked Dhikr log
  if (deed && deed.linkedDhikrId) {
    const dhikrLogId = localLogId(date, deed.linkedDhikrId);
    let dhikrCount = 0;
    if (deed.type === 'boolean') {
      dhikrCount = status === 'done' ? (deed.target ?? 100) : 0;
    } else {
      dhikrCount = finalValue ?? 0;
    }

    await db
      .insert(dhikrLogs)
      .values({
        id: dhikrLogId,
        userId,
        dhikrId: deed.linkedDhikrId,
        date,
        count: dhikrCount,
        updatedAt: now,
        deleted: false,
        dirty: true,
      })
      .onConflictDoUpdate({
        target: dhikrLogs.id,
        set: { count: dhikrCount, updatedAt: now, deleted: false, dirty: true },
      });
  }

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
      target: dhikrLogs.id,
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
      const val = deed.type === 'measured' ? newCount : (isDone ? deed.target : null);
      await setDeedLog(date, deed.id, isDone ? 'done' : 'not_yet', val);
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
 * Helper to determine if a deed should be tracked on a specific YYYY-MM-DD date.
 */
export function isDeedActiveOnDay(schedule: string, date: string): boolean {
  if (!schedule || schedule === 'daily') return true;
  if (schedule === 'weekly_anytime') return true;
  if (schedule === 'weekdays') {
    const day = weekdayIndex(date);
    return day >= 1 && day <= 5; // Monday to Friday
  }
  const activeDays = schedule.split(',');
  const day = weekdayIndex(date).toString();
  return activeDays.includes(day);
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
      if (!isDeedActiveOnDay(deed.schedule, date)) {
        continue;
      }
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
        const activeToday = isDeedActiveOnDay(deed.schedule, d);
        return createdOk && notDeletedYet && activeToday;
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

/**
 * Creates a new custom Dhikr counter locally, marked as dirty.
 */

export async function addDhikrCounter(name: string, targetVal: number | null = null): Promise<string> {
  const now = Date.now();
  const userId = user$.get()?.id ?? null;
  const today = todayKey();
  const id = Crypto.randomUUID();

  // Get next sort order
  const existing = await db
    .select({ count: sql`count(*)` })
    .from(dhikrs)
    .where(eq(dhikrs.deleted, false));
  const nextSort = (existing[0] as any)?.count ?? 0;

  await db.insert(dhikrs).values({
    id,
    userId,
    name,
    sortOrder: nextSort,
    target: targetVal,
    createdAt: today,
    updatedAt: now,
    deleted: false,
    dirty: true,
  });

  scheduleSync();
  return id;
}

/**
 * Updates an existing Dhikr counter locally, marked as dirty.
 */
export async function updateDhikrCounter(id: string, name: string, targetVal: number | null): Promise<void> {
  const now = Date.now();

  await db
    .update(dhikrs)
    .set({
      name,
      target: targetVal,
      updatedAt: now,
      dirty: true,
    })
    .where(eq(dhikrs.id, id));

  scheduleSync();
}

export async function deleteDhikrCounter(id: string): Promise<void> {
  const now = Date.now();
  const today = todayKey();

  await db
    .update(dhikrs)
    .set({
      deleted: true,
      deletedAt: today,
      updatedAt: now,
      dirty: true,
    })
    .where(eq(dhikrs.id, id));

  // Also soft delete its deeds if any scorecard item is linked to it
  await db
    .update(deeds)
    .set({
      deleted: true,
      deletedAt: today,
      updatedAt: now,
      dirty: true,
    })
    .where(eq(deeds.linkedDhikrId, id));

  scheduleSync();
}

/**
 * Creates a new custom deed locally, marked as dirty.
 */
export async function addDeed(
  name: string,
  sectionId: string,
  type: 'boolean' | 'measured',
  schedule: string,
  target: number | null = null,
  linkedDhikrId: string | null = null,
  definitionId: string | null = null
): Promise<void> {
  const now = Date.now();
  const userId = user$.get()?.id ?? null;
  const today = todayKey();

  // Get next sort order for this section
  const existing = await db
    .select({ count: sql`count(*)` })
    .from(deeds)
    .where(and(eq(deeds.sectionId, sectionId), eq(deeds.deleted, false)));
  const nextSort = (existing[0] as any)?.count ?? 0;

  await db.insert(deeds).values({
    id: Crypto.randomUUID(),
    userId,
    definitionId,
    sectionId,
    name,
    type,
    schedule,
    createdAt: today,
    sortOrder: nextSort,
    linkedDhikrId,
    target,
    updatedAt: now,
    deleted: false,
    dirty: true,
  });

  scheduleSync();
}

/**
 * Updates an existing deed locally, marked as dirty.
 */
export async function updateDeed(
  id: string,
  fields: {
    name?: string;
    sectionId?: string;
    type?: 'boolean' | 'measured';
    schedule?: string;
    target?: number | null;
    linkedDhikrId?: string | null;
    definitionId?: string | null;
  }
): Promise<void> {
  const now = Date.now();

  await db
    .update(deeds)
    .set({
      ...fields,
      updatedAt: now,
      dirty: true,
    })
    .where(eq(deeds.id, id));

  scheduleSync();
}

/**
 * Soft-deletes a deed locally, marked as dirty.
 */
export async function deleteDeed(id: string): Promise<void> {
  const now = Date.now();
  const today = todayKey();

  await db
    .update(deeds)
    .set({
      deleted: true,
      deletedAt: today,
      updatedAt: now,
      dirty: true,
    })
    .where(eq(deeds.id, id));

  scheduleSync();
}

/**
 * Reactive: Returns all active sections in the database.
 */
export function useSections(): SectionRow[] {
  const { data } = useLiveQuery(
    db
      .select()
      .from(sections)
      .where(eq(sections.deleted, false))
  );

  return useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [data]);
}

export interface ScorecardStructureSection {
  section: SectionRow;
  deeds: DeedRow[];
}

/**
 * Reactive: Returns all active sections grouped with their active deeds.
 */
export function useScorecardStructure(): ScorecardStructureSection[] {
  const { data: rawSections } = useLiveQuery(
    db
      .select()
      .from(sections)
      .where(eq(sections.deleted, false))
  );

  const { data: rawDeeds } = useLiveQuery(
    db
      .select()
      .from(deeds)
      .where(eq(deeds.deleted, false))
  );

  return useMemo(() => {
    if (!rawSections || !rawDeeds) return [];

    const deedsMap = new Map<string, DeedRow[]>();
    for (const deed of rawDeeds) {
      if (!deedsMap.has(deed.sectionId)) {
        deedsMap.set(deed.sectionId, []);
      }
      deedsMap.get(deed.sectionId)!.push(deed);
    }

    const sortedSecs = [...rawSections].sort((a, b) => a.sortOrder - b.sortOrder);
    return sortedSecs.map((sec) => {
      const items = deedsMap.get(sec.id) ?? [];
      items.sort((a, b) => a.sortOrder - b.sortOrder);
      return { section: sec, deeds: items };
    });
  }, [rawSections, rawDeeds]);
}

/**
 * Reactive: Returns all deed definitions (presets/suggestions).
 */
export function useDeedDefinitions(): DeedDefinitionRow[] {
  const { data } = useLiveQuery(
    db
      .select()
      .from(deedDefinitions)
  );

  return useMemo(() => {
    return data ?? [];
  }, [data]);
}

/**
 * Reactive: Returns the date string of the oldest logged deed or active dhikr count in the database.
 */
export function useOldestLogDate(): string | null {
  const { data: deedLogData } = useLiveQuery(
    db
      .select({ date: deedLogs.date })
      .from(deedLogs)
      .where(
        and(
          eq(deedLogs.deleted, false),
          or(
            inArray(deedLogs.status, ['done', 'not_done']),
            gt(deedLogs.value, 0)
          )
        )
      )
      .orderBy(asc(deedLogs.date))
      .limit(1)
  );

  const { data: dhikrLogData } = useLiveQuery(
    db
      .select({ date: dhikrLogs.date })
      .from(dhikrLogs)
      .where(
        and(
          eq(dhikrLogs.deleted, false),
          gt(dhikrLogs.count, 0)
        )
      )
      .orderBy(asc(dhikrLogs.date))
      .limit(1)
  );

  return useMemo(() => {
    const oldestDeedDate = deedLogData?.[0]?.date ?? null;
    const oldestDhikrDate = dhikrLogData?.[0]?.date ?? null;
    if (!oldestDeedDate) return oldestDhikrDate;
    if (!oldestDhikrDate) return oldestDeedDate;
    return oldestDeedDate < oldestDhikrDate ? oldestDeedDate : oldestDhikrDate;
  }, [deedLogData, dhikrLogData]);
}

