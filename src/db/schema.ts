import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * One row per (date, prayer). A missing row means status `not_yet`.
 * `updatedAt` (epoch ms) is the last-write-wins referee. `dirty` is local-only
 * (unsynced) and is never sent to Supabase. `userId` is null until claimed on sign-in.
 */
export const prayerLogs = sqliteTable(
  'prayer_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id'),
    date: text('date').notNull(), // YYYY-MM-DD (local)
    prayer: text('prayer').notNull(), // fajr|dhuhr|asr|maghrib|isha
    status: text('status').notNull(), // on_time|late|missed|not_yet
    updatedAt: integer('updated_at').notNull(), // epoch ms
    deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
    dirty: integer('dirty', { mode: 'boolean' }).notNull().default(true),
  },
  (t) => ({
    byDatePrayer: uniqueIndex('prayer_logs_date_prayer_unique').on(t.date, t.prayer),
  }),
);

export type PrayerLogRow = typeof prayerLogs.$inferSelect;
