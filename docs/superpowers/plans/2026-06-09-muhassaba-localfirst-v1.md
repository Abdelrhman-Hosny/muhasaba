# Muhassaba Local-First v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Muhassaba as a single-screen, local-first prayer tracker on SQLite + Drizzle, fully usable offline forever, with optional Google sign-in that turns on a hand-written Supabase sync (push / pull / last-write-wins).

**Architecture:** SQLite (expo-sqlite) is the on-device source of truth; Drizzle ORM owns all local queries and provides `useLiveQuery` reactivity. Screens touch the DB only through a thin `prayerStore` boundary. supabase-js is used solely as a join-free sync transport (and for Google auth + RLS). Sync reconciles lazily (launch / foreground / after-write) and never blocks the UI.

**Tech Stack:** Expo SDK 56, Expo Router, expo-sqlite, drizzle-orm `drizzle-orm/expo-sqlite` + drizzle-kit, @supabase/supabase-js, expo-auth-session/expo-web-browser (Google OAuth), react-native-mmkv (session + sync cursor), Jest + RN Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-09-muhassaba-localfirst-design.md`

**Scope note (web):** v1 targets iOS/Android. `expo-sqlite` opens at module scope and does not run under web static SSR; do not run `expo start --web` in v1. Web support is deferred (Open Question).

---

## File Structure

**Created:**
- `metro.config.js` — let Metro bundle `.sql` migration files
- `drizzle.config.ts` — drizzle-kit config (dialect sqlite, driver expo)
- `src/config.ts` — app constants (`EDITABLE_DAYS_BACK`)
- `src/db/schema.ts` — Drizzle schema: `prayer_logs`
- `src/db/client.ts` — opens SQLite, builds the Drizzle `db` instance
- `drizzle/` — generated migrations (committed)
- `src/state/prayerStore.ts` — data-access boundary (`setStatus`, `useDay`)
- `src/sync/mapping.ts` — pure local↔remote row mapping + LWW comparator
- `src/sync/sync.ts` — push / pull / merge / claim-on-sign-in / triggers
- `src/app/account.tsx` — optional sign-in/out + sync status (stack screen)
- `__tests__/domain/window.test.ts`, `__tests__/sync/mapping.test.ts`

**Modified:**
- `package.json` — add drizzle deps, remove Legend-State
- `babel.config.js` — add `inline-import` plugin for `.sql`
- `src/domain/dates.ts` — add editable-window helpers
- `src/state/auth.ts` — sign-out no longer wipes data; trigger claim+sync on sign-in
- `src/state/supabase.ts` — unchanged (kept as-is)
- `src/app/_layout.tsx` — remove auth gate; add RTL + fonts + migration gate + sync bootstrap
- `src/app/index.tsx` — becomes the Prayers screen
- `src/i18n/ar.ts` — trim to v1 strings + add sync/window copy

**Deleted (dormant code):**
- `src/state/stores.ts`, `src/state/useObs.ts`
- `src/app/(tabs)/` (entire dir), `src/app/sign-in.tsx`, `src/app/habits/` (entire dir)
- `src/ui/components/HabitRow.tsx`
- `src/domain/habits.ts`, `src/domain/history.ts`
- `__tests__/state/stores.test.ts`, `__tests__/domain/habits.test.ts`, `__tests__/domain/history.test.ts`
- `@legendapp/state` dependency

---

## Task 1: Remove dormant code and Legend-State

**Files:**
- Delete: `src/state/stores.ts`, `src/state/useObs.ts`, `src/ui/components/HabitRow.tsx`, `src/domain/habits.ts`, `src/domain/history.ts`
- Delete: `src/app/(tabs)/`, `src/app/sign-in.tsx`, `src/app/habits/`
- Delete: `__tests__/state/stores.test.ts`, `__tests__/domain/habits.test.ts`, `__tests__/domain/history.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Delete the dormant files and dirs**

```bash
git rm -r src/app/\(tabs\) src/app/habits
git rm src/app/sign-in.tsx
git rm src/state/stores.ts src/state/useObs.ts
git rm src/ui/components/HabitRow.tsx
git rm src/domain/habits.ts src/domain/history.ts
git rm __tests__/state/stores.test.ts __tests__/domain/habits.test.ts __tests__/domain/history.test.ts
```

- [ ] **Step 2: Remove the Legend-State dependency**

```bash
npm uninstall @legendapp/state
```

- [ ] **Step 3: Verify nothing else imports the removed modules**

Run: `grep -rn "@legendapp/state\|state/stores\|state/useObs\|domain/habits\|domain/history\|HabitRow\|(tabs)" src __tests__`
Expected: only matches inside files we will rewrite in later tasks (`src/app/_layout.tsx`, `src/app/index.tsx`, `src/state/auth.ts`, `src/i18n/ar.ts`). If anything else matches, it must be handled. (These four are rewritten in Tasks 9–13; leaving them temporarily broken is expected until then.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove dormant habits/history/tabs code and Legend-State"
```

---

## Task 2: Install Drizzle + configure Metro and Babel

**Files:**
- Modify: `package.json` (via installs)
- Create: `metro.config.js`
- Modify: `babel.config.js`
- Create: `drizzle.config.ts`

- [ ] **Step 1: Install dependencies**

```bash
npx expo install expo-sqlite
npm i drizzle-orm
npm i -D drizzle-kit babel-plugin-inline-import
```

- [ ] **Step 2: Create `metro.config.js`**

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');

module.exports = config;
```

- [ ] **Step 3: Add the inline-import plugin to `babel.config.js`**

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
```

- [ ] **Step 4: Create `drizzle.config.ts`**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
});
```

- [ ] **Step 5: Verify the app still boots (type/lint only — DB tasks come next)**

Run: `npm run lint`
Expected: no errors from the config files. (Router screens may still reference removed modules until Tasks 9–13; that is expected.)

- [ ] **Step 6: Commit**

```bash
git add metro.config.js babel.config.js drizzle.config.ts package.json package-lock.json
git commit -m "build: add expo-sqlite + drizzle, configure metro/babel for .sql"
```

---

## Task 3: Define the Drizzle schema

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/config.ts`

- [ ] **Step 1: Create `src/config.ts`**

```typescript
/** How many days back from today the user may still edit. Code-only, not user-editable. */
export const EDITABLE_DAYS_BACK = 7;

/** SQLite database file name. */
export const DB_NAME = 'muhassaba.db';
```

- [ ] **Step 2: Create `src/db/schema.ts`**

```typescript
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
```

- [ ] **Step 3: Type-check the schema**

Run: `npx tsc --noEmit`
Expected: no errors referencing `src/db/schema.ts` or `src/config.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts src/config.ts
git commit -m "feat: add prayer_logs Drizzle schema and app config"
```

---

## Task 4: Generate the initial migration

**Files:**
- Create: `drizzle/` (generated)

- [ ] **Step 1: Generate the migration**

Run: `npx drizzle-kit generate`
Expected: creates `drizzle/0000_*.sql` and `drizzle/migrations.js` plus `drizzle/meta/`.

- [ ] **Step 2: Inspect the generated SQL**

Run: `cat drizzle/0000_*.sql`
Expected: a `CREATE TABLE prayer_logs (...)` with all columns and `CREATE UNIQUE INDEX prayer_logs_date_prayer_unique`.

- [ ] **Step 3: Commit the migration**

```bash
git add drizzle
git commit -m "feat: generate initial prayer_logs migration"
```

---

## Task 5: Open the database and build the Drizzle client

**Files:**
- Create: `src/db/client.ts`

- [ ] **Step 1: Create `src/db/client.ts`**

```typescript
import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';
import { DB_NAME } from '@/config';

// `enableChangeListener: true` is REQUIRED for Drizzle's useLiveQuery to react to writes.
const expoDb = openDatabaseSync(DB_NAME, { enableChangeListener: true });

export const db = drizzle(expoDb, { schema });
export { schema };
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `src/db/client.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/db/client.ts
git commit -m "feat: open SQLite with change listener and build Drizzle client"
```

---

## Task 6: Editable-window date helpers (TDD)

**Files:**
- Modify: `src/domain/dates.ts`
- Test: `__tests__/domain/window.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/domain/window.test.ts
import { isEditableDate, editableDates } from '@/domain/dates';

describe('editable window', () => {
  const today = '2026-06-09';

  test('today is editable', () => {
    expect(isEditableDate('2026-06-09', today, 7)).toBe(true);
  });

  test('a date within the window is editable', () => {
    expect(isEditableDate('2026-06-03', today, 7)).toBe(true); // 6 days back
  });

  test('the oldest allowed day is editable', () => {
    expect(isEditableDate('2026-06-02', today, 7)).toBe(true); // exactly 7 days back
  });

  test('a date older than the window is not editable', () => {
    expect(isEditableDate('2026-06-01', today, 7)).toBe(false); // 8 days back
  });

  test('a future date is not editable', () => {
    expect(isEditableDate('2026-06-10', today, 7)).toBe(false);
  });

  test('editableDates lists today first, oldest last, length daysBack+1', () => {
    const days = editableDates(today, 7);
    expect(days).toHaveLength(8);
    expect(days[0]).toBe('2026-06-09');
    expect(days[7]).toBe('2026-06-02');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- window`
Expected: FAIL — `isEditableDate`/`editableDates` are not exported.

- [ ] **Step 3: Implement the helpers in `src/domain/dates.ts`**

Append to the existing file (keep `toLocalDateKey`/`todayKey`):

```typescript
/** Parse a YYYY-MM-DD key into a local Date at midnight. */
function fromLocalDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole-day difference (a - b) ignoring time. */
function dayDiff(a: string, b: string): number {
  const ms = fromLocalDateKey(a).getTime() - fromLocalDateKey(b).getTime();
  return Math.round(ms / 86_400_000);
}

/** A date is editable if it is today or up to `daysBack` days before today (no future). */
export function isEditableDate(date: string, today: string, daysBack: number): boolean {
  const diff = dayDiff(today, date); // positive = in the past
  return diff >= 0 && diff <= daysBack;
}

/** Editable dates, today first → oldest last. Length is daysBack + 1. */
export function editableDates(today: string, daysBack: number): string[] {
  const base = fromLocalDateKey(today);
  const out: string[] = [];
  for (let i = 0; i <= daysBack; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(toLocalDateKey(d));
  }
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- window`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/dates.ts __tests__/domain/window.test.ts
git commit -m "feat: editable-window date helpers"
```

---

## Task 7: Row mapping + last-write-wins comparator (TDD)

**Files:**
- Create: `src/sync/mapping.ts`
- Test: `__tests__/sync/mapping.test.ts`

This is the pure heart of sync: convert between the local row shape and the Supabase wire shape, and decide who wins a conflict. No Drizzle/Supabase imports here, so it is unit-testable in the node project.

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/sync/mapping.test.ts
import { toRemote, fromRemote, incomingWins, RemoteRow } from '@/sync/mapping';
import type { PrayerLogRow } from '@/db/schema';

const local: PrayerLogRow = {
  id: '2026-06-09:fajr',
  userId: 'user-1',
  date: '2026-06-09',
  prayer: 'fajr',
  status: 'on_time',
  updatedAt: 1_700_000_000_000,
  deleted: false,
  dirty: true,
};

describe('toRemote', () => {
  test('drops dirty and converts updatedAt to ISO', () => {
    const r = toRemote(local);
    expect(r).toEqual({
      id: '2026-06-09:fajr',
      user_id: 'user-1',
      date: '2026-06-09',
      prayer: 'fajr',
      status: 'on_time',
      updated_at: new Date(1_700_000_000_000).toISOString(),
      deleted: false,
    });
    expect('dirty' in (r as object)).toBe(false);
  });
});

describe('fromRemote', () => {
  test('parses ISO updated_at to epoch ms and marks clean', () => {
    const remote: RemoteRow = {
      id: '2026-06-09:asr',
      user_id: 'user-1',
      date: '2026-06-09',
      prayer: 'asr',
      status: 'late',
      updated_at: new Date(1_700_000_000_000).toISOString(),
      deleted: false,
    };
    expect(fromRemote(remote)).toEqual({
      id: '2026-06-09:asr',
      userId: 'user-1',
      date: '2026-06-09',
      prayer: 'asr',
      status: 'late',
      updatedAt: 1_700_000_000_000,
      deleted: false,
      dirty: false,
    });
  });
});

describe('incomingWins', () => {
  test('incoming wins when newer', () => {
    expect(incomingWins({ updatedAt: 100 }, { updatedAt: 200 })).toBe(true);
  });
  test('existing wins when newer or equal', () => {
    expect(incomingWins({ updatedAt: 200 }, { updatedAt: 100 })).toBe(false);
    expect(incomingWins({ updatedAt: 200 }, { updatedAt: 200 })).toBe(false);
  });
  test('incoming wins when there is no existing row', () => {
    expect(incomingWins(undefined, { updatedAt: 1 })).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- mapping`
Expected: FAIL — `src/sync/mapping` does not exist.

- [ ] **Step 3: Implement `src/sync/mapping.ts`**

```typescript
import type { PrayerLogRow } from '@/db/schema';

/** The Supabase wire shape — no `dirty`, timestamptz as ISO string. */
export interface RemoteRow {
  id: string;
  user_id: string;
  date: string;
  prayer: string;
  status: string;
  updated_at: string; // ISO
  deleted: boolean;
}

/** Local → wire. Drops `dirty`; converts epoch ms → ISO. */
export function toRemote(row: PrayerLogRow): RemoteRow {
  return {
    id: row.id,
    user_id: row.userId as string,
    date: row.date,
    prayer: row.prayer,
    status: row.status,
    updated_at: new Date(row.updatedAt).toISOString(),
    deleted: row.deleted,
  };
}

/** Wire → local. Parses ISO → epoch ms; marks the row clean (just synced). */
export function fromRemote(row: RemoteRow): PrayerLogRow {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    prayer: row.prayer,
    status: row.status,
    updatedAt: Date.parse(row.updated_at),
    deleted: row.deleted,
    dirty: false,
  };
}

/** Last-write-wins: incoming overwrites existing only if strictly newer (or no existing). */
export function incomingWins(
  existing: { updatedAt: number } | undefined,
  incoming: { updatedAt: number },
): boolean {
  if (!existing) return true;
  return incoming.updatedAt > existing.updatedAt;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- mapping`
Expected: PASS.

- [ ] **Step 5: Add the node-project test path**

The `domain` jest project only matches `__tests__/domain/`. Add a sibling project so `__tests__/sync/` runs in node. Modify `jest.config.js` — duplicate the `domain` project block, renamed for sync:

```javascript
    {
      displayName: 'sync',
      testMatch: ['<rootDir>/__tests__/sync/**/*.test.ts'],
      testEnvironment: 'node',
      transform: {
        '\\.[jt]sx?$': 'babel-jest',
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
```

Also add `'<rootDir>/__tests__/sync/'` to the `app` project's `testPathIgnorePatterns` so it is not double-run there.

- [ ] **Step 6: Run the full suite to confirm projects are wired**

Run: `npm test`
Expected: PASS across domain, sync, and app projects.

- [ ] **Step 7: Commit**

```bash
git add src/sync/mapping.ts __tests__/sync/mapping.test.ts jest.config.js
git commit -m "feat: pure row mapping and last-write-wins comparator"
```

---

## Task 8: prayerStore — the data-access boundary

**Files:**
- Create: `src/state/prayerStore.ts`

`setStatus` writes locally (instant, always dirty). `useDay` is a reactive read via `useLiveQuery`. The local row id is `${date}:${prayer}` (device-unique; survives the claim, since claim only fills `userId`).

- [ ] **Step 1: Create `src/state/prayerStore.ts`**

```typescript
import { and, eq } from 'drizzle-orm';
import { useMemo } from 'react';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '@/db/client';
import { prayerLogs } from '@/db/schema';
import { PRAYERS, Prayer, PrayerStatus } from '@/domain/prayers';
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
      day[row.prayer as Prayer] = row.status as PrayerStatus;
    }
    return day;
  }, [data]);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `src/state/prayerStore.ts`. (`user$` still exists in `auth.ts`; it is modified, not removed, in Task 11.)

- [ ] **Step 3: Commit**

```bash
git add src/state/prayerStore.ts
git commit -m "feat: prayerStore boundary (setStatus + reactive useDay)"
```

---

## Task 9: Prayers screen (single screen)

**Files:**
- Modify: `src/app/index.tsx`
- Modify: `src/i18n/ar.ts`
- Reuse: `src/ui/components/PrayerRow.tsx` (unchanged)

- [ ] **Step 1: Trim `src/i18n/ar.ts` to v1 strings**

```typescript
export const ar = {
  appName: 'محاسبة',
  prayers: { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' },
  prayerStatus: { not_yet: 'لم تُصلَّ', on_time: 'في وقتها', late: 'متأخرة', missed: 'فائتة' },
  account: {
    title: 'الحساب',
    signInGoogle: 'تسجيل الدخول عبر جوجل',
    signOut: 'تسجيل الخروج',
    signInPrompt: 'سجّل الدخول لحفظ بياناتك ومزامنتها',
  },
  sync: { synced: 'متزامن', syncing: 'جارٍ المزامنة…', offline: 'دون اتصال', localOnly: 'محلي فقط' },
  days: { today: 'اليوم', yesterday: 'أمس' },
};
```

- [ ] **Step 2: Replace `src/app/index.tsx` with the Prayers screen**

```tsx
import { useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PRAYERS, Prayer, PrayerStatus } from '@/domain/prayers';
import { editableDates, todayKey } from '@/domain/dates';
import { EDITABLE_DAYS_BACK } from '@/config';
import { useDay, setStatus } from '@/state/prayerStore';
import { PrayerRow } from '@/ui/components/PrayerRow';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

function dayLabel(date: string, today: string): string {
  if (date === today) return ar.days.today;
  const days = editableDates(today, EDITABLE_DAYS_BACK);
  if (date === days[1]) return ar.days.yesterday;
  return date.slice(5); // MM-DD
}

export default function Prayers() {
  const today = todayKey();
  const dates = editableDates(today, EDITABLE_DAYS_BACK); // today → oldest
  const [selected, setSelected] = useState(today);
  const day = useDay(selected);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
        <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 24 }}>{ar.appName}</Text>
        <Link href="/account" asChild>
          <Pressable hitSlop={8}><Ionicons name="person-circle-outline" size={28} color={theme.colors.muted} /></Pressable>
        </Link>
      </View>

      {/* Day strip: today (right) → oldest (left), RTL */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row-reverse', paddingHorizontal: 16, gap: 8 }}
        style={{ maxHeight: 56 }}>
        {dates.map((d) => {
          const active = d === selected;
          return (
            <Pressable key={d} onPress={() => setSelected(d)}
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
                backgroundColor: active ? theme.colors.primary : theme.colors.surface }}>
              <Text style={{ fontFamily: theme.font, color: active ? '#fff' : theme.colors.muted }}>
                {dayLabel(d, today)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {PRAYERS.map((p: Prayer) => (
          <PrayerRow key={p} prayer={p} status={day[p]}
            onChange={(s: PrayerStatus) => setStatus(selected, p, s)} />
        ))}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `src/app/index.tsx` or `src/i18n/ar.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/app/index.tsx src/i18n/ar.ts
git commit -m "feat: single Prayers screen with 7-day strip"
```

---

## Task 10: Sync layer — push, pull, merge

**Files:**
- Create: `src/sync/sync.ts`

Uses MMKV for the `last_pulled_at` cursor (small, persistent). Push upserts dirty rows; pull fetches changed remote rows and applies LWW.

- [ ] **Step 1: Create `src/sync/sync.ts`**

```typescript
import { createMMKV } from 'react-native-mmkv';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { prayerLogs } from '@/db/schema';
import { supabase } from '@/state/supabase';
import { user$ } from '@/state/auth';
import { toRemote, fromRemote, incomingWins, RemoteRow } from './mapping';

const TABLE = 'prayer_logs';
const meta = createMMKV({ id: 'muhassaba-sync' });
const cursorKey = (userId: string) => `pulled_at:${userId}`;

let running = false;

/** Push every dirty row to Supabase, then clear its dirty flag. */
async function push(userId: string): Promise<void> {
  const dirty = await db.select().from(prayerLogs).where(eq(prayerLogs.dirty, true));
  if (dirty.length === 0) return;
  const payload = dirty.map((r) => toRemote({ ...r, userId }));
  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: 'user_id,date,prayer' });
  if (error) throw error;
  for (const r of dirty) {
    await db.update(prayerLogs).set({ dirty: false }).where(eq(prayerLogs.id, r.id));
  }
}

/** Pull rows changed since the cursor and merge with last-write-wins. */
async function pull(userId: string): Promise<void> {
  const since = meta.getString(cursorKey(userId)) ?? '1970-01-01T00:00:00.000Z';
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', since)
    .order('updated_at', { ascending: true });
  if (error) throw error;

  let newest = since;
  for (const remote of (data ?? []) as RemoteRow[]) {
    const incoming = fromRemote(remote);
    const [existing] = await db
      .select()
      .from(prayerLogs)
      .where(eq(prayerLogs.id, incoming.id))
      .limit(1);
    if (incomingWins(existing, incoming)) {
      await db
        .insert(prayerLogs)
        .values(incoming)
        .onConflictDoUpdate({ target: prayerLogs.id, set: incoming });
    }
    if (remote.updated_at > newest) newest = remote.updated_at;
  }
  meta.set(cursorKey(userId), newest);
}

/** Reconcile now if signed in. Safe to call often; self-deduplicates and swallows network errors. */
export async function syncNow(): Promise<void> {
  const userId = user$.get()?.id;
  if (!userId || running) return;
  running = true;
  try {
    await push(userId);
    await pull(userId);
  } catch {
    // Non-blocking: dirty rows stay queued and retry on the next trigger.
  } finally {
    running = false;
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `src/sync/sync.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/sync/sync.ts
git commit -m "feat: sync push/pull with last-write-wins merge"
```

---

## Task 11: Claim-on-sign-in + sign-out keeps data

**Files:**
- Modify: `src/state/auth.ts`
- Modify: `src/sync/sync.ts`

- [ ] **Step 1: Add `claimLocalRows` to `src/sync/sync.ts`**

Append:

```typescript
import { isNull } from 'drizzle-orm';

/** On sign-in, attach all unclaimed local rows to the user, mark them dirty, then sync. */
export async function claimAndSync(userId: string): Promise<void> {
  await db
    .update(prayerLogs)
    .set({ userId, dirty: true })
    .where(isNull(prayerLogs.userId));
  await syncNow();
}
```

> Note: add `isNull` to the existing `drizzle-orm` import in this file rather than a second import line.

- [ ] **Step 2: Update `src/state/auth.ts` — trigger claim on sign-in, stop wiping on sign-out**

Replace the `onAuthStateChange` handler body and `signOut`:

```typescript
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      user$.set(null);
      return;
    }
    if (session) {
      const appUser = toAppUser(session);
      user$.set(appUser);
      if (event === 'SIGNED_IN' && appUser) {
        // Claim local rows for this user and sync. Fire-and-forget; non-blocking.
        import('@/sync/sync').then((m) => m.claimAndSync(appUser.id)).catch(() => {});
      }
    }
  });
```

And replace `signOut` so it no longer clears local data:

```typescript
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  user$.set(null);
  // Local prayer data is intentionally kept; sign-out only stops syncing.
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`clearStores` import is gone, matching the deleted `stores.ts`.)

- [ ] **Step 4: Commit**

```bash
git add src/state/auth.ts src/sync/sync.ts
git commit -m "feat: claim local rows on sign-in; sign-out keeps local data"
```

---

## Task 12: Sync triggers (launch + foreground + after-write)

**Files:**
- Create: `src/sync/triggers.ts`
- Modify: `src/state/prayerStore.ts`

- [ ] **Step 1: Create `src/sync/triggers.ts`**

```typescript
import { AppState, AppStateStatus } from 'react-native';
import { syncNow } from './sync';

let debounce: ReturnType<typeof setTimeout> | null = null;

/** Sync a few seconds after a write settles (coalesces bursts of taps). */
export function scheduleSync(): void {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => {
    debounce = null;
    void syncNow();
  }, 3000);
}

/** Register launch + foreground sync. Call once after migrations succeed. Returns a cleanup fn. */
export function setupSyncTriggers(): () => void {
  void syncNow(); // launch
  const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') void syncNow();
  });
  return () => sub.remove();
}
```

- [ ] **Step 2: Call `scheduleSync` after a write in `src/state/prayerStore.ts`**

Add the import and one line at the end of `setStatus` (after the `await db…onConflictDoUpdate(...)`):

```typescript
import { scheduleSync } from '@/sync/triggers';
// …inside setStatus, after the upsert await:
  scheduleSync();
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/sync/triggers.ts src/state/prayerStore.ts
git commit -m "feat: sync triggers on launch, foreground, and after writes"
```

---

## Task 13: Root layout — RTL, fonts, migration gate, sync bootstrap

**Files:**
- Modify: `src/app/_layout.tsx`

Removes the auth gate entirely (no sign-in wall). Runs Drizzle migrations before rendering, then registers sync triggers.

- [ ] **Step 1: Replace `src/app/_layout.tsx`**

```tsx
import { useEffect } from 'react';
import { I18nManager, View, Text, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts, Cairo_400Regular } from '@expo-google-fonts/cairo';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from '@/db/client';
import migrations from '../../drizzle/migrations';
import { initAuth } from '@/state/auth';
import { setupSyncTriggers } from '@/sync/triggers';
import { theme } from '@/ui/theme';

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      {children}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Cairo: Cairo_400Regular });
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (!success) return;
    initAuth(); // optional: loads any cached session; never blocks
    const cleanup = setupSyncTriggers();
    return cleanup;
  }, [success]);

  if (error) return <Centered><Text style={{ color: theme.colors.text, fontFamily: theme.font }}>{String(error.message)}</Text></Centered>;
  if (!success || !fontsLoaded) return <Centered><ActivityIndicator color={theme.colors.primary} /></Centered>;

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`migrations` default import resolves once Task 4 generated `drizzle/migrations.js`.)

- [ ] **Step 3: Commit**

```bash
git add src/app/_layout.tsx
git commit -m "feat: local-first root layout — migrations gate, no auth wall, sync bootstrap"
```

---

## Task 14: Account screen (optional sign-in/out + sync status)

**Files:**
- Create: `src/app/account.tsx`

- [ ] **Step 1: Create `src/app/account.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { user$, signInWithGoogle, signOut } from '@/state/auth';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

// Minimal local subscription to the user observable (no Legend-State hook helpers).
function useUser() {
  return useSyncExternalStore(
    (cb) => user$.onChange(cb),
    () => user$.peek(),
    () => user$.peek(),
  );
}

export default function Account() {
  const user = useUser();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSignIn() {
    setBusy(true);
    try { await signInWithGoogle(); } catch {} finally { setBusy(false); }
  }
  async function onSignOut() {
    setBusy(true);
    try { await signOut(); } finally { setBusy(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, padding: 16 }}>
      <Stack.Screen options={{ headerShown: true, title: ar.account.title, headerBackTitle: '' }} />
      {busy && <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />}

      {user ? (
        <>
          <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 18, textAlign: 'right' }}>
            {user.name ?? user.email}
          </Text>
          <Text style={{ color: theme.colors.muted, fontFamily: theme.font, textAlign: 'right', marginTop: 4 }}>
            {ar.sync.synced}
          </Text>
          <Pressable onPress={onSignOut} style={{ marginTop: 24, padding: 14, borderRadius: 12, backgroundColor: theme.colors.surface }}>
            <Text style={{ color: theme.colors.missed, fontFamily: theme.font, textAlign: 'center' }}>{ar.account.signOut}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={{ color: theme.colors.muted, fontFamily: theme.font, textAlign: 'right' }}>{ar.account.signInPrompt}</Text>
          <Text style={{ color: theme.colors.muted, fontFamily: theme.font, textAlign: 'right', marginTop: 4 }}>{ar.sync.localOnly}</Text>
          <Pressable onPress={onSignIn} style={{ marginTop: 24, padding: 14, borderRadius: 12, backgroundColor: theme.colors.primary }}>
            <Text style={{ color: '#fff', fontFamily: theme.font, textAlign: 'center' }}>{ar.account.signInGoogle}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`useRouter` import is unused if you don't navigate; remove it if the linter flags it.)

- [ ] **Step 3: Commit**

```bash
git add src/app/account.tsx
git commit -m "feat: optional account screen (Google sign-in/out + status)"
```

---

## Task 15: Supabase table + RLS (server-side, run once)

**Files:**
- Create: `supabase/prayer_logs.sql` (reference SQL; run in the Supabase SQL editor)

This is run by a human in the Supabase dashboard, not by the app. The app only reads/writes via supabase-js with the anon key + the user's JWT.

- [ ] **Step 1: Create `supabase/prayer_logs.sql`**

```sql
create table if not exists public.prayer_logs (
  id text primary key,
  user_id uuid not null references auth.users (id),
  date date not null,
  prayer text not null check (prayer in ('fajr','dhuhr','asr','maghrib','isha')),
  status text not null check (status in ('on_time','late','missed','not_yet')),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  unique (user_id, date, prayer)
);

alter table public.prayer_logs enable row level security;

create policy "own rows - select" on public.prayer_logs
  for select using (auth.uid() = user_id);
create policy "own rows - insert" on public.prayer_logs
  for insert with check (auth.uid() = user_id);
create policy "own rows - update" on public.prayer_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: Apply it**

Run the SQL in the Supabase project's SQL editor. Confirm Google is enabled under Authentication → Providers, and that `muhassaba://` (and the Supabase callback URL) are in the allowed redirect URLs.

- [ ] **Step 3: Commit the reference SQL**

```bash
git add supabase/prayer_logs.sql
git commit -m "docs: Supabase prayer_logs table + RLS reference SQL"
```

---

## Task 16: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Lint and type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 2: Run all unit tests**

Run: `npm test`
Expected: PASS across `domain`, `sync`, and `app` projects (window + mapping + PrayerRow + auth).

- [ ] **Step 3: Manual — offline-first (device/simulator, signed out)**

Run: `npm run ios` (or `npm run android`). Verify:
- App opens straight to the Prayers screen (no sign-in wall).
- Tapping a prayer cycles its status and persists across an app restart (kill + reopen).
- The day strip shows today → 7 days back; older days are not present.

- [ ] **Step 4: Manual — sync round-trip**

- Sign in via the account screen with Google.
- Confirm local rows appear in Supabase (`select * from prayer_logs`).
- Edit a prayer on a second device/sign-in; return to the first and foreground it; confirm the newest edit wins.
- Sign out; confirm local data is still present and editable offline.

- [ ] **Step 5: Final commit (if any docs/notes changed)**

```bash
git add -A
git commit -m "chore: v1 local-first verification pass" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- One-screen / five prayers → Tasks 3, 8, 9. ✓
- Edit today + N days back (code constant) → Task 3 (`EDITABLE_DAYS_BACK`), Task 6 (window), Task 9 (strip). ✓
- Local-first, offline forever, no sign-in gate → Tasks 5, 8, 13. ✓
- Optional Google sign-in → Tasks 11, 14. ✓
- Sign-out keeps local data → Task 11. ✓
- SQLite + Drizzle, Drizzle owns queries → Tasks 2–5, 8. ✓
- supabase-js as join-free sync transport → Tasks 10–11. ✓
- Push / pull / LWW / claim-on-sign-in → Tasks 7, 10, 11. ✓
- Lazy triggers (launch/foreground/after-write), no real-time → Task 12. ✓
- RLS → Task 15. ✓
- Testing (unit pure fns + component + manual) → Tasks 6, 7, 16. ✓
- Remove dormant code → Task 1. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code; config snippets are exact. ✓

**Type consistency:** `PrayerLogRow` (Task 3) is consumed by `mapping.ts` (Task 7) and `prayerStore.ts` (Task 8); `RemoteRow` defined in Task 7 used in Task 10; `syncNow`/`claimAndSync`/`scheduleSync`/`setupSyncTriggers` names match across Tasks 10–13; `useDay`/`setStatus`/`localRowId` consistent between Tasks 8 and 9/12. ✓

**Open items carried from spec (non-blocking):** day-strip vs stepper (chose strip), inline sync status (minimal, in account screen for v1), full-pull vs cursor (chose cursor in Task 10), web support (deferred).
