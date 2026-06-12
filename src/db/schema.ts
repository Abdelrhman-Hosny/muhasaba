import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Global catalog for system-defined defaults (e.g., standard prayers, Quran, Adhkar)
 */
export const deedDefinitions = sqliteTable('deed_definitions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'boolean' | 'measured'
  defaultSchedule: text('default_schedule').notNull(), // 'daily' | 'weekdays' | etc.
  payload: text('payload'), // JSON string containing additional info
});

/**
 * Scorecard sections (e.g., "الصلوات المفروضة", "السنن الرواتب", "القرآن الكريم", "الأذكار")
 */
export const sections = sqliteTable('sections', {
  id: text('id').primaryKey(),
  userId: text('user_id'), // null for local-only, filled on sign-in
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull(),
  deletedAt: text('deleted_at'), // YYYY-MM-DD (business soft delete)
  updatedAt: integer('updated_at').notNull(), // epoch ms for sync
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false), // sync deletion flag
  dirty: integer('dirty', { mode: 'boolean' }).notNull().default(true), // local-only sync flag
});

/**
 * Dhikr Counters (Dhikr Mutlaq)
 */
export const dhikrs = sqliteTable('dhikrs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull(),
  target: integer('target'), // Independent counter target
  createdAt: text('created_at').notNull(), // YYYY-MM-DD
  deletedAt: text('deleted_at'), // YYYY-MM-DD
  updatedAt: integer('updated_at').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
  dirty: integer('dirty', { mode: 'boolean' }).notNull().default(true),
});

/**
 * Deeds / Tasks tracked by the user on their scorecard
 */
export const deeds = sqliteTable('deeds', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  definitionId: text('definition_id').references(() => deedDefinitions.id),
  sectionId: text('section_id').notNull().references(() => sections.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'boolean' | 'measured'
  schedule: text('schedule').notNull(), // 'daily' | 'weekdays' | 'weekly_anytime'
  createdAt: text('created_at').notNull(), // YYYY-MM-DD
  sortOrder: integer('sort_order').notNull(),
  deletedAt: text('deleted_at'), // YYYY-MM-DD
  linkedDhikrId: text('linked_dhikr_id').references(() => dhikrs.id, { onDelete: 'set null' }), // Option B Link
  target: integer('target'), // Target count (e.g. 100 for auto-completion)
  updatedAt: integer('updated_at').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
  dirty: integer('dirty', { mode: 'boolean' }).notNull().default(true),
});

/**
 * Deed completion logs (replaces prayer_logs and habit_logs)
 */
export const deedLogs = sqliteTable(
  'deed_logs',
  {
    id: text('id').primaryKey(), // Composite: 'date:deed_id'
    userId: text('user_id'),
    deedId: text('deed_id').notNull().references(() => deeds.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // YYYY-MM-DD
    status: text('status').notNull(), // 'not_yet' | 'done'
    value: integer('value'), // for measured deeds
    note: text('note'), // Retained from V1 habits log
    updatedAt: integer('updated_at').notNull(),
    deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
    dirty: integer('dirty', { mode: 'boolean' }).notNull().default(true),
  },
  (t) => ({
    byUserDateDeed: uniqueIndex('deed_logs_user_date_deed_unique').on(t.userId, t.date, t.deedId),
  })
);

/**
 * Dhikr count logs (Daily tallies for free/mutlaq dhikr counters)
 */
export const dhikrLogs = sqliteTable(
  'dhikr_logs',
  {
    id: text('id').primaryKey(), // Composite: 'date:dhikr_id'
    userId: text('user_id'),
    dhikrId: text('dhikr_id').notNull().references(() => dhikrs.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // YYYY-MM-DD
    count: integer('count').notNull().default(0),
    updatedAt: integer('updated_at').notNull(),
    deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
    dirty: integer('dirty', { mode: 'boolean' }).notNull().default(true),
  },
  (t) => ({
    byUserDateDhikr: uniqueIndex('dhikr_logs_user_date_dhikr_unique').on(t.userId, t.date, t.dhikrId),
  })
);

export type DeedDefinitionRow = typeof deedDefinitions.$inferSelect;
export type SectionRow = typeof sections.$inferSelect;
export type DhikrRow = typeof dhikrs.$inferSelect;
export type DeedRow = typeof deeds.$inferSelect;
export type DeedLogRow = typeof deedLogs.$inferSelect;
export type DhikrLogRow = typeof dhikrLogs.$inferSelect;
