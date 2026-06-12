# Database Schema Migration Verification & Safety Review

Before generating and applying migrations, we must verify that the schema is forward-compatible, handles all edge cases, and satisfies all requirements.

---

## 1. Table Specifications & Sync Strategy

We have 5 synced tables and 1 static template table.

### Dependency Tree (Topological Order):
1. **`deed_definitions`** (Static, no foreign keys)
2. **`sections`** (No foreign keys)
3. **`dhikrs`** (No foreign keys)
4. **`deeds`** (References `sections.id`, `deed_definitions.id`, `dhikrs.id`)
5. **`deed_logs`** (References `deeds.id`)
6. **`dhikr_logs`** (References `dhikrs.id`)

> [!IMPORTANT]
> **Sync Operation Ordering**:
> Due to foreign key constraints in Supabase, the sync engine **must** push and pull tables in their topological order to avoid database validation crashes:
> - **Push order**: `sections` & `dhikrs` $\rightarrow$ `deeds` $\rightarrow$ `deed_logs` & `dhikr_logs`.
> - **Pull order**: `sections` & `dhikrs` $\rightarrow$ `deeds` $\rightarrow$ `deed_logs` & `dhikr_logs`.

---

## 2. Validation of Core Features & Future-Proofing

### A. Tracking Custom Notes (Preserving V1 features)
- In the original `habit_logs` table, there was a `note text` field.
- **Decision**: We will add a nullable `note` text field to `deed_logs` to ensure users can log details (e.g., "read Sura Al-Baqarah", "went to gym with Ahmed") for their scorecard habits.

### B. Independent Targets for Dhikr Counters
- A user might want a target for their Dhikr (e.g., "1000x Istighfar today") but *not* have it show up as a scorecard item.
- **Decision**: Add a nullable `target` integer directly to the `dhikrs` table. This allows the counters tab to render progress arcs independently of the scorecard checklist.

### C. Timezone & Date Boundaries
- All log tables use `date text` in `YYYY-MM-DD` format.
- **Composite Primary Keys**:
  - `deed_logs.id` = `${date}:${deed_id}`
  - `dhikr_logs.id` = `${date}:${dhikr_id}`
- **Verification**: Since `deed_id` and `dhikr_id` are unique UUIDs generated per-user on the client device, the composite keys are globally unique. Even during multi-device synchronization, different users' logs will never collide.

### D. Historic Preservation (Soft Deletes)
- **`deleted_at` (business logic)**: A YYYY-MM-DD string. When a user deletes a deed/section, we set `deleted_at = 'YYYY-MM-DD'`.
  - **Query logic**: To render the scorecard for day `D`, we select deeds where `created_at <= D` and (`deleted_at is null` OR `deleted_at > D`). This ensures historical records are retained.
- **`deleted` (sync logic)**: A boolean. If set to `true`, the sync engine knows to sync the deletion to the remote database.

---

## 3. Final Code Specifications

### Local Schema (SQLite Drizzle):
```typescript
// src/db/schema.ts
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const deedDefinitions = sqliteTable('deed_definitions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'boolean' | 'measured'
  defaultSchedule: text('default_schedule').notNull(), // 'daily'
  payload: text('payload'),
});

export const sections = sqliteTable('sections', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull(),
  deletedAt: text('deleted_at'),
  updatedAt: integer('updated_at').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
  dirty: integer('dirty', { mode: 'boolean' }).notNull().default(true),
});

export const dhikrs = sqliteTable('dhikrs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull(),
  target: integer('target'), // Independent counter target
  createdAt: text('created_at').notNull(),
  deletedAt: text('deleted_at'),
  updatedAt: integer('updated_at').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
  dirty: integer('dirty', { mode: 'boolean' }).notNull().default(true),
});

export const deeds = sqliteTable('deeds', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  definitionId: text('definition_id').references(() => deedDefinitions.id),
  sectionId: text('section_id').notNull().references(() => sections.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  schedule: text('schedule').notNull(),
  createdAt: text('created_at').notNull(),
  sortOrder: integer('sort_order').notNull(),
  deletedAt: text('deleted_at'),
  linkedDhikrId: text('linked_dhikr_id').references(() => dhikrs.id, { onDelete: 'set null' }),
  target: integer('target'), // Scorecard deed target
  updatedAt: integer('updated_at').notNull(),
  deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
  dirty: integer('dirty', { mode: 'boolean' }).notNull().default(true),
});

export const deedLogs = sqliteTable(
  'deed_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id'),
    deedId: text('deed_id').notNull().references(() => deeds.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    status: text('status').notNull(),
    value: integer('value'),
    note: text('note'), // Retained from V1 habits log
    updatedAt: integer('updated_at').notNull(),
    deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
    dirty: integer('dirty', { mode: 'boolean' }).notNull().default(true),
  },
  (t) => ({
    byUserDateDeed: uniqueIndex('deed_logs_user_date_deed_unique').on(t.userId, t.date, t.deedId),
  })
);

export const dhikrLogs = sqliteTable(
  'dhikr_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id'),
    dhikrId: text('dhikr_id').notNull().references(() => dhikrs.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    count: integer('count').notNull().default(0),
    updatedAt: integer('updated_at').notNull(),
    deleted: integer('deleted', { mode: 'boolean' }).notNull().default(false),
    dirty: integer('dirty', { mode: 'boolean' }).notNull().default(true),
  },
  (t) => ({
    byUserDateDhikr: uniqueIndex('dhikr_logs_user_date_dhikr_unique').on(t.userId, t.date, t.dhikrId),
  })
);
```

### Remote Schema (Supabase Postgres):
```sql
-- supabase/migrations/0002_deeds_model.sql
drop table if exists prayer_logs cascade;
drop table if exists habit_logs cascade;
drop table if exists habits cascade;

create table deed_definitions (
  id text primary key,
  name text not null,
  type text not null,
  default_schedule text not null,
  payload text
);

create table sections (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  deleted_at text,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table dhikrs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  target int,
  created_at text not null,
  deleted_at text,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table deeds (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  definition_id text references deed_definitions(id) on delete set null,
  section_id text not null references sections(id) on delete cascade,
  name text not null,
  type text not null,
  schedule text not null,
  created_at text not null,
  sort_order int not null default 0,
  deleted_at text,
  linked_dhikr_id text references dhikrs(id) on delete set null,
  target int,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table deed_logs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  deed_id text not null references deeds(id) on delete cascade,
  date text not null,
  status text not null default 'not_yet',
  value int,
  note text,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  unique (user_id, date, deed_id)
);

create table dhikr_logs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  dhikr_id text not null references dhikrs(id) on delete cascade,
  date text not null,
  count int not null default 0,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  unique (user_id, date, dhikr_id)
);
```
