# Muhassaba Local-First v1 Implementation Plan (Phased)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Muhassaba as a single-screen, local-first prayer tracker on SQLite + Drizzle, fully usable offline forever, with optional Google sign-in that turns on a hand-written Supabase sync (push / pull / last-write-wins).

**Architecture:** SQLite (expo-sqlite) is the on-device source of truth; Drizzle ORM owns all local queries and provides `useLiveQuery` reactivity. Screens touch the DB only through a thin `prayerStore` boundary. supabase-js is used solely as a join-free sync transport (and for Google auth + RLS). Sync reconciles lazily (launch / foreground / after-write) and never blocks the UI.

**Tech Stack:** Expo SDK 56, Expo Router, expo-sqlite, drizzle-orm `drizzle-orm/expo-sqlite` + drizzle-kit, @supabase/supabase-js, expo-auth-session/expo-web-browser (Google OAuth), react-native-mmkv (session + sync cursor), Jest + RN Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-09-muhassaba-localfirst-design.md`

**Scope note (web):** v1 targets iOS/Android. `expo-sqlite` opens at module scope and does not run under web static SSR; do not run `expo start --web` in v1. Web support is deferred (Open Question).

---

## Phases & Checkpoints

The plan is ordered so the app stays runnable and you can stop to manually test at three gates:

- **Phase 1 — Local-first core → CHECKPOINT 1:** app boots offline to the Prayers screen, tap to log, data survives restart. No Supabase, no sign-in.
- **Phase 2 — Optional auth → CHECKPOINT 2:** Google sign-in/out works; sign-out keeps local data. No sync yet.
- **Phase 3 — Sync → CHECKPOINT 3:** push/pull/last-write-wins round-trip, claim-on-sign-in, multi-device merge.

There is also **Checkpoint 0** (pure unit tests via `npm test`) reached partway through Phase 1 and again in Phase 3.

---
---

# PHASE 1 — Local-first core

End state: a fully working offline app. No network, no account.

## Task 1.1: Remove dormant code and Legend-State

**Files:**
- Delete: `src/state/stores.ts`, `src/state/useObs.ts`, `src/ui/components/HabitRow.tsx`, `src/domain/habits.ts`, `src/domain/history.ts`
- Delete: `src/app/(tabs)/`, `src/app/sign-in.tsx`, `src/app/habits/`
- Delete: `__tests__/state/stores.test.ts`, `__tests__/domain/habits.test.ts`, `__tests__/domain/history.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Delete the dormant files and dirs**

```bash
git rm -r "src/app/(tabs)" src/app/habits
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

- [ ] **Step 3: Verify remaining references are only in files rewritten later this phase**

Run: `grep -rn "@legendapp/state\|state/stores\|state/useObs\|domain/habits\|domain/history\|HabitRow\|(tabs)" src __tests__`
Expected: matches only in `src/app/_layout.tsx`, `src/app/index.tsx`, `src/state/auth.ts` (rewritten in Tasks 1.7–1.9). Anything else must be handled now.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove dormant habits/history/tabs code and Legend-State"
```

## Task 1.2: Install Drizzle + configure Metro and Babel

**Files:** `package.json` (installs), `metro.config.js` (create), `babel.config.js` (modify), `drizzle.config.ts` (create)

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

- [ ] **Step 5: Commit**

```bash
git add metro.config.js babel.config.js drizzle.config.ts package.json package-lock.json
git commit -m "build: add expo-sqlite + drizzle, configure metro/babel for .sql"
```

## Task 1.3: Define the Drizzle schema + config

**Files:** `src/config.ts` (create), `src/db/schema.ts` (create)

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

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `src/db/schema.ts` or `src/config.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts src/config.ts
git commit -m "feat: add prayer_logs Drizzle schema and app config"
```

## Task 1.4: Generate the initial migration

**Files:** `drizzle/` (generated)

- [ ] **Step 1: Generate**

Run: `npx drizzle-kit generate`
Expected: creates `drizzle/0000_*.sql`, `drizzle/migrations.js`, `drizzle/meta/`.

- [ ] **Step 2: Inspect**

Run: `cat drizzle/0000_*.sql`
Expected: `CREATE TABLE prayer_logs (...)` + `CREATE UNIQUE INDEX prayer_logs_date_prayer_unique`.

- [ ] **Step 3: Commit**

```bash
git add drizzle
git commit -m "feat: generate initial prayer_logs migration"
```

## Task 1.5: Open the database and build the Drizzle client

**Files:** `src/db/client.ts` (create)

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

## Task 1.6: Editable-window date helpers (TDD)

**Files:** `src/domain/dates.ts` (modify), `__tests__/domain/window.test.ts` (create)

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
    expect(isEditableDate('2026-06-03', today, 7)).toBe(true);
  });
  test('the oldest allowed day is editable', () => {
    expect(isEditableDate('2026-06-02', today, 7)).toBe(true);
  });
  test('a date older than the window is not editable', () => {
    expect(isEditableDate('2026-06-01', today, 7)).toBe(false);
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

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- window`
Expected: FAIL — helpers not exported.

- [ ] **Step 3: Implement in `src/domain/dates.ts`** (append; keep `toLocalDateKey`/`todayKey`)

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
  const diff = dayDiff(today, date);
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

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- window`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/dates.ts __tests__/domain/window.test.ts
git commit -m "feat: editable-window date helpers"
```

> **CHECKPOINT 0 (pure logic):** `npm test` should pass the `domain` project including the new window tests.

## Task 1.7: prayerStore — the data-access boundary

**Files:** `src/state/prayerStore.ts` (create)

Note: `setStatus` does NOT call sync here — sync is added in Phase 3 (Task 3.4).

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
Expected: no errors (`user$` still exported by `auth.ts`).

- [ ] **Step 3: Commit**

```bash
git add src/state/prayerStore.ts
git commit -m "feat: prayerStore boundary (setStatus + reactive useDay)"
```

## Task 1.8: Prayers screen (single screen)

**Files:** `src/i18n/ar.ts` (modify), `src/app/index.tsx` (modify). Reuses `src/ui/components/PrayerRow.tsx` unchanged.

- [ ] **Step 1: Trim `src/i18n/ar.ts`**

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

- [ ] **Step 2: Replace `src/app/index.tsx`**

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
Expected: no errors in `src/app/index.tsx` / `src/i18n/ar.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/app/index.tsx src/i18n/ar.ts
git commit -m "feat: single Prayers screen with 7-day strip"
```

## Task 1.9: Clean up auth.ts (sign-out keeps data)

**Files:** `src/state/auth.ts` (modify)

Removes the now-deleted `stores` reference so the module is clean. (The claim-on-sign-in trigger is added in Phase 3.)

- [ ] **Step 1: Replace `signOut` in `src/state/auth.ts`**

```typescript
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  user$.set(null);
  // Local prayer data is intentionally kept; sign-out only stops syncing.
}
```

(Delete the old body that imported and called `clearStores`.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (no reference to deleted `./stores`).

- [ ] **Step 3: Commit**

```bash
git add src/state/auth.ts
git commit -m "feat: sign-out keeps local data (drop stores wipe)"
```

## Task 1.10: Root layout — RTL, fonts, migration gate (no auth wall, no sync yet)

**Files:** `src/app/_layout.tsx` (modify)

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
  }, [success]);

  if (error) return <Centered><Text style={{ color: theme.colors.text, fontFamily: theme.font }}>{String(error.message)}</Text></Centered>;
  if (!success || !fontsLoaded) return <Centered><ActivityIndicator color={theme.colors.primary} /></Centered>;

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean. (`account` route is added in Phase 2; the `<Link href="/account">` is a typed-routes warning at most until then — acceptable, or temporarily comment the Link if typedRoutes errors.)

- [ ] **Step 3: Commit**

```bash
git add src/app/_layout.tsx
git commit -m "feat: local-first root layout — migration gate, no auth wall"
```

---

> ## ✅ CHECKPOINT 1 — Local-first app works offline
>
> Run on a device/simulator: `npm run ios` (or `npm run android`). Verify, with **no internet and no sign-in**:
> - App opens straight to the Prayers screen (no sign-in wall).
> - Tapping a prayer cycles its status (not yet → on time → late → missed → …).
> - The day strip shows today → 7 days back; tapping a day shows that day's statuses.
> - **Kill and reopen the app → your edits are still there** (SQLite persistence).
>
> Tapping the person icon will try to open `/account`, which does not exist until Phase 2 — ignore or skip for now.
>
> **Stop here and confirm before Phase 2.**

---
---

# PHASE 2 — Optional auth

End state: Google sign-in/out works; sign-out keeps data. No sync yet.

## Task 2.1: Account screen (optional sign-in/out + status)

**Files:** `src/app/account.tsx` (create)

- [ ] **Step 1: Create `src/app/account.tsx`**

```tsx
import { useState, useSyncExternalStore } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { user$, signInWithGoogle, signOut } from '@/state/auth';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

function useUser() {
  return useSyncExternalStore(
    (cb) => user$.onChange(cb),
    () => user$.peek(),
    () => user$.peek(),
  );
}

export default function Account() {
  const user = useUser();
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
      <Stack.Screen options={{ headerShown: true, title: ar.account.title }} />
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

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean; the `/account` route now resolves.

- [ ] **Step 3: Commit**

```bash
git add src/app/account.tsx
git commit -m "feat: optional account screen (Google sign-in/out + status)"
```

---

> ## ✅ CHECKPOINT 2 — Sign-in works, data kept
>
> On device: tap the person icon → Account. Verify:
> - Signing in with Google completes and returns to the app showing your name + "متزامن".
> - Signing out returns to the signed-out state.
> - **After sign-out, your prayer edits are still on the Prayers screen** (no wipe).
> - The app still works fully offline if you skip sign-in.
>
> Sync is NOT wired yet — nothing is expected in Supabase at this checkpoint.
>
> **Stop here and confirm before Phase 3.**

---
---

# PHASE 3 — Sync

End state: full push/pull/last-write-wins round-trip + claim-on-sign-in.

## Task 3.1: Row mapping + last-write-wins comparator (TDD)

**Files:** `src/sync/mapping.ts` (create), `__tests__/sync/mapping.test.ts` (create), `jest.config.js` (modify)

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

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- mapping`
Expected: FAIL — module missing.

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

- [ ] **Step 4: Add a `sync` node test project to `jest.config.js`**

Add this project block (sibling to `domain`):

```javascript
    {
      displayName: 'sync',
      testMatch: ['<rootDir>/__tests__/sync/**/*.test.ts'],
      testEnvironment: 'node',
      transform: { '\\.[jt]sx?$': 'babel-jest' },
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
    },
```

And add `'<rootDir>/__tests__/sync/'` to the `app` project's `testPathIgnorePatterns` array.

- [ ] **Step 5: Run to verify it passes**

Run: `npm test`
Expected: PASS across domain, sync, app.

- [ ] **Step 6: Commit**

```bash
git add src/sync/mapping.ts __tests__/sync/mapping.test.ts jest.config.js
git commit -m "feat: pure row mapping and last-write-wins comparator"
```

> **CHECKPOINT 0 (again):** `npm test` green including the new `sync` project.

## Task 3.2: Sync layer — push, pull, merge

**Files:** `src/sync/sync.ts` (create)

- [ ] **Step 1: Create `src/sync/sync.ts`**

```typescript
import { createMMKV } from 'react-native-mmkv';
import { eq, isNull } from 'drizzle-orm';
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
    const [existing] = await db.select().from(prayerLogs).where(eq(prayerLogs.id, incoming.id)).limit(1);
    if (incomingWins(existing, incoming)) {
      await db.insert(prayerLogs).values(incoming).onConflictDoUpdate({ target: prayerLogs.id, set: incoming });
    }
    if (remote.updated_at > newest) newest = remote.updated_at;
  }
  meta.set(cursorKey(userId), newest);
}

/** On sign-in, attach all unclaimed local rows to the user, mark them dirty, then sync. */
export async function claimAndSync(userId: string): Promise<void> {
  await db.update(prayerLogs).set({ userId, dirty: true }).where(isNull(prayerLogs.userId));
  await syncNow();
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
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/sync/sync.ts
git commit -m "feat: sync push/pull with last-write-wins merge + claimAndSync"
```

## Task 3.3: Trigger claim-on-sign-in from auth

**Files:** `src/state/auth.ts` (modify)

- [ ] **Step 1: Update the `onAuthStateChange` handler in `initAuth`**

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

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/state/auth.ts
git commit -m "feat: claim local rows and sync on sign-in"
```

## Task 3.4: Sync triggers (launch + foreground + after-write)

**Files:** `src/sync/triggers.ts` (create), `src/state/prayerStore.ts` (modify), `src/app/_layout.tsx` (modify)

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

Add the import and one line at the end of `setStatus` (after the upsert `await`):

```typescript
import { scheduleSync } from '@/sync/triggers';
// …inside setStatus, after the await db…onConflictDoUpdate(...):
  scheduleSync();
```

- [ ] **Step 3: Wire `setupSyncTriggers` into `src/app/_layout.tsx`**

Update the `useEffect` to register triggers and clean up:

```tsx
import { setupSyncTriggers } from '@/sync/triggers';
// …
  useEffect(() => {
    if (!success) return;
    initAuth();
    const cleanup = setupSyncTriggers();
    return cleanup;
  }, [success]);
```

- [ ] **Step 4: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/sync/triggers.ts src/state/prayerStore.ts src/app/_layout.tsx
git commit -m "feat: sync triggers on launch, foreground, and after writes"
```

## Task 3.5: Supabase table + RLS (server-side, run once)

**Files:** `supabase/prayer_logs.sql` (create; run in the Supabase SQL editor)

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

Run the SQL in the Supabase SQL editor. Confirm Google is enabled under Authentication → Providers, and `muhassaba://` + the Supabase callback URL are allowed redirect URLs.

- [ ] **Step 3: Commit**

```bash
git add supabase/prayer_logs.sql
git commit -m "docs: Supabase prayer_logs table + RLS reference SQL"
```

---

> ## ✅ CHECKPOINT 3 — Full sync round-trip
>
> - `npm test` green; `npx tsc --noEmit && npm run lint` clean.
> - Signed in: edit a prayer → within a few seconds it appears in Supabase (`select * from prayer_logs`).
> - Edit the same prayer from a second sign-in/device, then foreground the first → newest edit wins.
> - Make edits **offline while signed in**, reconnect/foreground → they push up.
> - Use the app offline with no account, then sign in → your offline rows are claimed (get a `user_id`) and pushed.
> - Sign out → local data remains and stays editable.

---

## Self-Review

**Spec coverage:** one screen/five prayers (1.3, 1.7, 1.8); editable window constant (1.3, 1.6, 1.8); local-first / offline / no gate (1.5, 1.7, 1.10); optional Google sign-in (2.1, 3.3); sign-out keeps data (1.9); SQLite+Drizzle owns queries (1.2–1.5, 1.7); supabase-js join-free transport (3.2); push/pull/LWW/claim (3.1, 3.2, 3.3); lazy triggers (3.4); RLS (3.5); testing (1.6, 3.1, checkpoints). ✓

**Placeholder scan:** none. ✓

**Type consistency:** `PrayerLogRow` (1.3) → mapping (3.1) + prayerStore (1.7); `RemoteRow` (3.1) → sync (3.2); `syncNow`/`claimAndSync`/`scheduleSync`/`setupSyncTriggers` consistent across 3.2–3.4; `useDay`/`setStatus`/`localRowId` consistent across 1.7/1.8/3.4. ✓

**Phasing integrity:** Phase 1 never imports `src/sync/*` (prayerStore's `scheduleSync` and the layout's `setupSyncTriggers` are added in Phase 3); `auth.ts` is clean after 1.9 (no deleted-`stores` reference) and the claim trigger is added in 3.3. Each phase ends in a runnable, type-clean app. ✓
