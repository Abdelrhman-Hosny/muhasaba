# Muhassaba v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline-first, Arabic/RTL Expo app for daily spiritual self-accountability — log the five daily prayers and track custom habits, synced to Supabase with Google sign-in.

**Architecture:** Expo (managed) + Expo Router for navigation. Legend-State v3 holds local-first observable state persisted to MMKV and synced to Supabase via its Supabase sync plugin. Supabase provides Postgres + Google OAuth + Row-Level Security. Pure domain logic (prayer status transitions, habit completion, history aggregation) is isolated and unit-tested; UI reads/writes go through the Legend-State stores so everything works offline.

**Tech Stack:** Expo SDK (latest), Expo Router, TypeScript, `@legendapp/state` v3 + `@legendapp/state/sync-plugins/supabase`, `react-native-mmkv`, `@supabase/supabase-js`, `expo-auth-session` + `expo-web-browser`, Jest + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-06-08-muhassaba-design.md`

---

## File Structure

```
muhassaba/
  app/                          # Expo Router routes
    _layout.tsx                 # root: RTL setup, fonts, auth gate, providers
    sign-in.tsx                 # Google sign-in screen
    (tabs)/
      _layout.tsx               # bottom tabs (RTL)
      index.tsx                 # اليوم (Today)
      history.tsx               # السجل (History)
      account.tsx               # الحساب (Account)
    habits/
      manage.tsx                # add/edit/reorder/archive habits (pushed)
  src/
    domain/
      prayers.ts                # prayer constants + status cycle logic
      habits.ts                 # habit completion logic
      history.ts                # per-day aggregation
      dates.ts                  # local-date helpers
    state/
      supabase.ts               # supabase client
      stores.ts                 # legend-state observables + supabase sync config
      auth.ts                   # auth observable + google sign-in/out
    ui/
      theme.ts                  # colors, spacing, Arabic font family
      components/               # shared RTL components
    i18n/
      ar.ts                     # all Arabic strings
  supabase/
    migrations/
      0001_init.sql             # tables, enums, RLS, updated_at triggers
  __tests__/                    # jest tests mirror src/
  app.json
  package.json
  tsconfig.json
  jest.config.js
  babel.config.js
```

---

## Task 1: Scaffold the Expo app

**Files:**
- Create: project skeleton via Expo CLI (in `/Users/abdelrahmanhosny/coding/muhassaba`)
- Modify: `package.json`, `app.json`, `tsconfig.json`

- [ ] **Step 1: Scaffold into the existing directory**

The directory already contains `docs/`, `.git/`, and `.gitignore`. Scaffold a fresh Expo Router + TypeScript app into a temp dir, then move the app files in (so we keep the existing git history and docs).

```bash
cd /Users/abdelrahmanhosny/coding
npx create-expo-app@latest _muhassaba_tmp --template default
# move everything except node_modules into the real project, without clobbering docs/.git
rsync -a --exclude node_modules --exclude .git --exclude docs/ _muhassaba_tmp/ muhassaba/
rm -rf _muhassaba_tmp
cd muhassaba
npm install
```

- [ ] **Step 2: Reset to a blank app**

The default template ships an example. Remove it and create a minimal root layout.

```bash
cd /Users/abdelrahmanhosny/coding/muhassaba
rm -rf app/(tabs) app/+not-found.tsx components constants hooks scripts assets/images/react-logo* 2>/dev/null || true
rm -rf app/* 2>/dev/null || true
```

Create `app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Create `app/index.tsx`:

```tsx
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>محاسبة</Text>
    </View>
  );
}
```

- [ ] **Step 3: Verify the app boots**

Run: `npx expo start` (or `npm run web` for a quick check)
Expected: app launches and shows "محاسبة" with no red error screen. Stop the server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold blank Expo Router app"
```

---

## Task 2: Install dependencies and configure tooling

**Files:**
- Modify: `package.json`, `babel.config.js`
- Create: `jest.config.js`, `jest.setup.js`

- [ ] **Step 1: Install runtime + dev dependencies**

```bash
cd /Users/abdelrahmanhosny/coding/muhassaba
npx expo install react-native-mmkv expo-auth-session expo-web-browser expo-crypto expo-font @expo/vector-icons
npm install @legendapp/state @supabase/supabase-js
npm install -D jest jest-expo @testing-library/react-native @types/jest
```

- [ ] **Step 2: Configure Jest**

Create `jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@legendapp/.*|@supabase/.*))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

Create `jest.setup.js`:

```js
// MMKV requires a native module; mock it for unit tests.
jest.mock('react-native-mmkv', () => {
  const store = new Map();
  return {
    MMKV: class {
      set(k, v) { store.set(k, v); }
      getString(k) { return store.get(k); }
      delete(k) { store.delete(k); }
      clearAll() { store.clear(); }
    },
  };
});
```

- [ ] **Step 3: Add path alias to `tsconfig.json`**

Ensure `compilerOptions.paths` contains:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

- [ ] **Step 4: Add test script to `package.json`**

Add to `"scripts"`: `"test": "jest"`.

- [ ] **Step 5: Verify Jest runs**

Run: `npm test -- --passWithNoTests`
Expected: PASS (no tests yet, exits 0).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: add dependencies and Jest config"
```

---

## Task 3: Date helpers (TDD)

**Files:**
- Create: `src/domain/dates.ts`
- Test: `__tests__/domain/dates.test.ts`

- [ ] **Step 1: Write the failing test**

`__tests__/domain/dates.test.ts`:

```ts
import { toLocalDateKey, todayKey } from '@/domain/dates';

describe('dates', () => {
  it('formats a Date as a local YYYY-MM-DD key', () => {
    // 2026-06-08 09:00 local time
    const d = new Date(2026, 5, 8, 9, 0, 0);
    expect(toLocalDateKey(d)).toBe('2026-06-08');
  });

  it('pads single-digit month and day', () => {
    const d = new Date(2026, 0, 3, 0, 0, 0);
    expect(toLocalDateKey(d)).toBe('2026-01-03');
  });

  it('todayKey returns a valid key shape', () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- dates`
Expected: FAIL — cannot find module `@/domain/dates`.

- [ ] **Step 3: Write minimal implementation**

`src/domain/dates.ts`:

```ts
/** Format a Date as a local-timezone YYYY-MM-DD key. */
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today's local date key. */
export function todayKey(): string {
  return toLocalDateKey(new Date());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- dates`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/dates.ts __tests__/domain/dates.test.ts
git commit -m "feat: add local-date helpers"
```

---

## Task 4: Prayer domain logic (TDD)

**Files:**
- Create: `src/domain/prayers.ts`
- Test: `__tests__/domain/prayers.test.ts`

- [ ] **Step 1: Write the failing test**

`__tests__/domain/prayers.test.ts`:

```ts
import { PRAYERS, PRAYER_STATUSES, cyclePrayerStatus } from '@/domain/prayers';

describe('prayers', () => {
  it('defines the five prayers in order', () => {
    expect(PRAYERS).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
  });

  it('defines the four statuses', () => {
    expect(PRAYER_STATUSES).toEqual(['not_yet', 'on_time', 'late', 'missed']);
  });

  it('cycles status forward and wraps around', () => {
    expect(cyclePrayerStatus('not_yet')).toBe('on_time');
    expect(cyclePrayerStatus('on_time')).toBe('late');
    expect(cyclePrayerStatus('late')).toBe('missed');
    expect(cyclePrayerStatus('missed')).toBe('not_yet');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- prayers`
Expected: FAIL — cannot find module `@/domain/prayers`.

- [ ] **Step 3: Write minimal implementation**

`src/domain/prayers.ts`:

```ts
export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type Prayer = (typeof PRAYERS)[number];

export const PRAYER_STATUSES = ['not_yet', 'on_time', 'late', 'missed'] as const;
export type PrayerStatus = (typeof PRAYER_STATUSES)[number];

/** Tapping a prayer advances its status, wrapping back to not_yet. */
export function cyclePrayerStatus(status: PrayerStatus): PrayerStatus {
  const i = PRAYER_STATUSES.indexOf(status);
  return PRAYER_STATUSES[(i + 1) % PRAYER_STATUSES.length];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- prayers`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/prayers.ts __tests__/domain/prayers.test.ts
git commit -m "feat: add prayer status logic"
```

---

## Task 5: Habit domain logic (TDD)

**Files:**
- Create: `src/domain/habits.ts`
- Test: `__tests__/domain/habits.test.ts`

- [ ] **Step 1: Write the failing test**

`__tests__/domain/habits.test.ts`:

```ts
import { Habit, isHabitComplete, nextBooleanValue } from '@/domain/habits';

const boolHabit: Habit = { id: '1', name: 'قراءة القرآن', icon: 'book', type: 'boolean', target: null, sort_order: 0, active: true };
const countHabit: Habit = { id: '2', name: 'صلاة الضحى', icon: 'sun', type: 'count', target: 2, sort_order: 1, active: true };

describe('habits', () => {
  it('boolean habit is complete when value >= 1', () => {
    expect(isHabitComplete(boolHabit, 0)).toBe(false);
    expect(isHabitComplete(boolHabit, 1)).toBe(true);
  });

  it('count habit is complete when value reaches target', () => {
    expect(isHabitComplete(countHabit, 1)).toBe(false);
    expect(isHabitComplete(countHabit, 2)).toBe(true);
    expect(isHabitComplete(countHabit, 3)).toBe(true);
  });

  it('toggles a boolean value', () => {
    expect(nextBooleanValue(0)).toBe(1);
    expect(nextBooleanValue(1)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- habits`
Expected: FAIL — cannot find module `@/domain/habits`.

- [ ] **Step 3: Write minimal implementation**

`src/domain/habits.ts`:

```ts
export type HabitType = 'boolean' | 'count';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  type: HabitType;
  target: number | null;
  sort_order: number;
  active: boolean;
}

/** Is today's habit value enough to count as complete? */
export function isHabitComplete(habit: Habit, value: number): boolean {
  if (habit.type === 'boolean') return value >= 1;
  return value >= (habit.target ?? 1);
}

/** Toggle a boolean habit's stored value. */
export function nextBooleanValue(value: number): number {
  return value >= 1 ? 0 : 1;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- habits`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/habits.ts __tests__/domain/habits.test.ts
git commit -m "feat: add habit completion logic"
```

---

## Task 6: History aggregation (TDD)

**Files:**
- Create: `src/domain/history.ts`
- Test: `__tests__/domain/history.test.ts`

- [ ] **Step 1: Write the failing test**

`__tests__/domain/history.test.ts`:

```ts
import { summarizeDay } from '@/domain/history';
import { Habit } from '@/domain/habits';

const habits: Habit[] = [
  { id: 'h1', name: 'قرآن', icon: 'book', type: 'boolean', target: null, sort_order: 0, active: true },
  { id: 'h2', name: 'ضحى', icon: 'sun', type: 'count', target: 2, sort_order: 1, active: true },
];

describe('summarizeDay', () => {
  it('counts prayers prayed (on_time or late) and habits complete', () => {
    const summary = summarizeDay({
      date: '2026-06-08',
      prayerStatuses: { fajr: 'on_time', dhuhr: 'late', asr: 'missed', maghrib: 'not_yet', isha: 'on_time' },
      habitValues: { h1: 1, h2: 1 },
      habits,
    });
    expect(summary.prayersPrayed).toBe(3); // on_time + late + on_time
    expect(summary.prayersTotal).toBe(5);
    expect(summary.habitsComplete).toBe(1); // h1 complete, h2 (1/2) not
    expect(summary.habitsTotal).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- history`
Expected: FAIL — cannot find module `@/domain/history`.

- [ ] **Step 3: Write minimal implementation**

`src/domain/history.ts`:

```ts
import { Habit, isHabitComplete } from './habits';
import { Prayer, PrayerStatus, PRAYERS } from './prayers';

export interface DaySummaryInput {
  date: string;
  prayerStatuses: Record<Prayer, PrayerStatus>;
  habitValues: Record<string, number>;
  habits: Habit[];
}

export interface DaySummary {
  date: string;
  prayersPrayed: number;
  prayersTotal: number;
  habitsComplete: number;
  habitsTotal: number;
}

const PRAYED: PrayerStatus[] = ['on_time', 'late'];

export function summarizeDay(input: DaySummaryInput): DaySummary {
  const prayersPrayed = PRAYERS.filter((p) =>
    PRAYED.includes(input.prayerStatuses[p] ?? 'not_yet'),
  ).length;

  const activeHabits = input.habits.filter((h) => h.active);
  const habitsComplete = activeHabits.filter((h) =>
    isHabitComplete(h, input.habitValues[h.id] ?? 0),
  ).length;

  return {
    date: input.date,
    prayersPrayed,
    prayersTotal: PRAYERS.length,
    habitsComplete,
    habitsTotal: activeHabits.length,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- history`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/domain/history.ts __tests__/domain/history.test.ts
git commit -m "feat: add per-day history aggregation"
```

---

## Task 7: Supabase schema migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`

> Apply this against the user's Supabase project. During execution, use the Supabase MCP tools available in the session (search ToolSearch for the Supabase SQL/apply-migration tool) to run this SQL, OR run it via the Supabase SQL editor. Capture the project URL and anon key for Task 8.

- [ ] **Step 1: Write the migration SQL**

`supabase/migrations/0001_init.sql`:

```sql
-- Enums
create type prayer_name as enum ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha');
create type prayer_status as enum ('not_yet', 'on_time', 'late', 'missed');
create type habit_type as enum ('boolean', 'count');

-- updated_at trigger function
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- habits
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'star',
  type habit_type not null default 'boolean',
  target int,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);
create trigger habits_updated_at before update on habits
  for each row execute function set_updated_at();

-- habit_logs
create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  date date not null,
  value int not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  unique (user_id, habit_id, date)
);
create trigger habit_logs_updated_at before update on habit_logs
  for each row execute function set_updated_at();

-- prayer_logs
create table prayer_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  prayer prayer_name not null,
  status prayer_status not null default 'not_yet',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  unique (user_id, date, prayer)
);
create trigger prayer_logs_updated_at before update on prayer_logs
  for each row execute function set_updated_at();

-- Row-Level Security
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table prayer_logs enable row level security;

create policy "own habits" on habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own habit_logs" on habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own prayer_logs" on prayer_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP apply-migration/SQL tool (or the SQL editor) to run `0001_init.sql`. Confirm the three tables exist and RLS is enabled.

- [ ] **Step 3: Configure Google OAuth in Supabase**

In the Supabase dashboard → Authentication → Providers → Google: enable it and add a Google OAuth client (Web) ID/secret. Add the app's redirect scheme (`muhassaba://`) to allowed redirect URLs. (This is a manual dashboard step; note credentials for Task 9.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat: add Supabase schema migration"
```

---

## Task 8: Supabase client + env config

**Files:**
- Create: `src/state/supabase.ts`, `.env`, `app.config.ts` (or extend `app.json` extra)
- Modify: `.gitignore` (ensure `.env` ignored)

- [ ] **Step 1: Add env + ensure ignored**

Create `.env` (fill in real values from Task 7):

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

Confirm `.gitignore` contains `.env` (add it if missing).

- [ ] **Step 2: Create the Supabase client with MMKV-backed session storage**

`src/state/supabase.ts`:

```ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'muhassaba-auth' });

const mmkvAuthStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: mmkvAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
```

- [ ] **Step 3: Install the URL polyfill**

```bash
npx expo install react-native-url-polyfill
```

- [ ] **Step 4: Verify it imports without crashing**

Run: `npm test -- --passWithNoTests` (compilation sanity).
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/supabase.ts app.json .gitignore
git commit -m "feat: add Supabase client"
```

---

## Task 9: Auth — Google sign-in + session observable

**Files:**
- Create: `src/state/auth.ts`
- Test: `__tests__/state/auth.test.ts`

- [ ] **Step 1: Write the failing test (session observable)**

`__tests__/state/auth.test.ts`:

```ts
jest.mock('@/state/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

import { user$, initAuth } from '@/state/auth';

describe('auth', () => {
  it('starts with no user', () => {
    expect(user$.get()).toBeNull();
  });

  it('initAuth subscribes to auth changes', async () => {
    const { supabase } = require('@/state/supabase');
    await initAuth();
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- auth`
Expected: FAIL — cannot find module `@/state/auth`.

- [ ] **Step 3: Write the implementation**

`src/state/auth.ts`:

```ts
import { observable } from '@legendapp/state';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export interface AppUser {
  id: string;
  email: string | null;
  name: string | null;
}

export const user$ = observable<AppUser | null>(null);

function toAppUser(session: any): AppUser | null {
  const u = session?.user;
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? null,
    name: u.user_metadata?.full_name ?? null,
  };
}

/** Load any persisted session and subscribe to changes. Call once at startup. */
export async function initAuth(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  user$.set(toAppUser(data.session));
  supabase.auth.onAuthStateChange((_event, session) => {
    user$.set(toAppUser(session));
  });
}

/** Launch Google OAuth via an external browser, then set the session. */
export async function signInWithGoogle(): Promise<void> {
  const redirectTo = AuthSession.makeRedirectUri({ scheme: 'muhassaba' });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo);
  if (result.type !== 'success' || !result.url) return;

  const url = new URL(result.url);
  const params = new URLSearchParams(url.hash.replace(/^#/, ''));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) {
    await supabase.auth.setSession({ access_token, refresh_token });
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  user$.set(null);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- auth`
Expected: PASS (2 tests).

- [ ] **Step 5: Add `scheme` to `app.json`**

Ensure `app.json` `expo.scheme` is `"muhassaba"`.

- [ ] **Step 6: Commit**

```bash
git add src/state/auth.ts __tests__/state/auth.test.ts app.json
git commit -m "feat: add Google auth and session observable"
```

---

## Task 10: Legend-State stores + Supabase sync

**Files:**
- Create: `src/state/stores.ts`
- Test: `__tests__/state/stores.test.ts`

- [ ] **Step 1: Write the failing test (helpers)**

`__tests__/state/stores.test.ts`:

```ts
import { prayerLogId, habitLogId } from '@/state/stores';

describe('store id helpers', () => {
  it('builds a deterministic prayer log id', () => {
    expect(prayerLogId('u1', '2026-06-08', 'fajr')).toBe('u1:2026-06-08:fajr');
  });
  it('builds a deterministic habit log id', () => {
    expect(habitLogId('u1', '2026-06-08', 'h1')).toBe('u1:2026-06-08:h1');
  });
});
```

> These deterministic local keys let the Today screen upsert a single log per (user, day, prayer/habit) without first reading the server.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- stores`
Expected: FAIL — cannot find module `@/state/stores`.

- [ ] **Step 3: Write the stores + sync config**

`src/state/stores.ts`:

```ts
import { observable } from '@legendapp/state';
import { syncedSupabase } from '@legendapp/state/sync-plugins/supabase';
import { observablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv';
import { configureSynced } from '@legendapp/state/sync';
import { supabase } from './supabase';
import { user$ } from './auth';

export const prayerLogId = (userId: string, date: string, prayer: string) =>
  `${userId}:${date}:${prayer}`;
export const habitLogId = (userId: string, date: string, habitId: string) =>
  `${userId}:${date}:${habitId}`;

// Shared sync config: persist locally with MMKV, soft-delete via `deleted`,
// last-write-wins via `updated_at`, filter to the signed-in user.
const customSynced = configureSynced(syncedSupabase, {
  supabase,
  persist: { plugin: observablePersistMMKV },
  changesSince: 'last-sync',
  fieldCreatedAt: 'created_at',
  fieldUpdatedAt: 'updated_at',
  fieldDeleted: 'deleted',
});

function userId() {
  return user$.get()?.id ?? '';
}

export const habits$ = observable(
  customSynced({
    collection: 'habits',
    filter: (select) => select.eq('user_id', userId()),
    persist: { name: 'habits' },
  }),
);

export const habitLogs$ = observable(
  customSynced({
    collection: 'habit_logs',
    filter: (select) => select.eq('user_id', userId()),
    persist: { name: 'habit_logs' },
  }),
);

export const prayerLogs$ = observable(
  customSynced({
    collection: 'prayer_logs',
    filter: (select) => select.eq('user_id', userId()),
    persist: { name: 'prayer_logs' },
  }),
);
```

- [ ] **Step 4: Install the MMKV persist plugin peer (already covered) and run test**

Run: `npm test -- stores`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/stores.ts __tests__/state/stores.test.ts
git commit -m "feat: add Legend-State stores with Supabase sync"
```

---

## Task 11: Theme, i18n strings, and RTL bootstrap

**Files:**
- Create: `src/ui/theme.ts`, `src/i18n/ar.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Create Arabic strings**

`src/i18n/ar.ts`:

```ts
export const ar = {
  appName: 'محاسبة',
  tabs: { today: 'اليوم', history: 'السجل', account: 'الحساب' },
  prayers: { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' },
  prayerStatus: { not_yet: 'لم تُصلَّ', on_time: 'في وقتها', late: 'متأخرة', missed: 'فائتة' },
  habits: { title: 'العادات', add: 'إضافة عادة', name: 'الاسم', target: 'الهدف', save: 'حفظ', archive: 'أرشفة', manage: 'إدارة العادات' },
  account: { signInGoogle: 'تسجيل الدخول عبر جوجل', signOut: 'تسجيل الخروج', signInPrompt: 'سجّل الدخول لحفظ بياناتك ومزامنتها' },
  history: { title: 'السجل', prayed: 'الصلوات', habitsDone: 'العادات' },
};
```

- [ ] **Step 2: Create theme**

`src/ui/theme.ts`:

```ts
export const theme = {
  colors: {
    bg: '#0f1a14',
    surface: '#16241c',
    primary: '#2e8b57',
    text: '#eaf2ec',
    muted: '#9bb3a4',
    onTime: '#2e8b57',
    late: '#c9a227',
    missed: '#b04a4a',
    notYet: '#3a4a40',
  },
  spacing: (n: number) => n * 8,
  font: 'Cairo',
};
```

- [ ] **Step 3: RTL + font + auth init in the root layout**

Replace `app/_layout.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { I18nManager, View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { initAuth } from '@/state/auth';
import { theme } from '@/ui/theme';

// Force RTL once.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Cairo: require('../assets/fonts/Cairo-Regular.ttf'),
  });

  useEffect(() => {
    initAuth().finally(() => setReady(true));
  }, []);

  if (!ready || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 4: Add the Cairo font**

```bash
mkdir -p assets/fonts
# Download Cairo-Regular.ttf from Google Fonts into assets/fonts/Cairo-Regular.ttf
```
Download `Cairo-Regular.ttf` (Google Fonts, OFL) and place it at `assets/fonts/Cairo-Regular.ttf`.

- [ ] **Step 5: Verify boot**

Run: `npx expo start --web`
Expected: loading spinner then (currently empty Stack) no crash; layout is RTL. Stop server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add theme, Arabic strings, RTL bootstrap, Cairo font"
```

---

## Task 12: Auth gate + sign-in screen

**Files:**
- Create: `app/sign-in.tsx`
- Modify: `app/_layout.tsx` (redirect when signed out)

- [ ] **Step 1: Create the sign-in screen**

`app/sign-in.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { signInWithGoogle } from '@/state/auth';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

export default function SignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPress() {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError('تعذّر تسجيل الدخول، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: theme.colors.text, fontSize: 40, fontFamily: theme.font, marginBottom: 8 }}>{ar.appName}</Text>
      <Text style={{ color: theme.colors.muted, fontFamily: theme.font, marginBottom: 32, textAlign: 'center' }}>{ar.account.signInPrompt}</Text>
      <Pressable onPress={onPress} disabled={loading}
        style={{ backgroundColor: theme.colors.primary, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, minWidth: 220, alignItems: 'center' }}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontFamily: theme.font, fontSize: 16 }}>{ar.account.signInGoogle}</Text>}
      </Pressable>
      {error ? <Text style={{ color: theme.colors.missed, marginTop: 16, fontFamily: theme.font }}>{error}</Text> : null}
    </View>
  );
}
```

- [ ] **Step 2: Gate routes by auth in `app/_layout.tsx`**

Wrap the `Stack` so signed-out users are redirected to `/sign-in`. Add a reactive guard using Legend-State's `use$`:

Add imports and replace the returned `<Stack>`:

```tsx
import { Redirect } from 'expo-router';
import { use$ } from '@legendapp/state/react';
import { user$ } from '@/state/auth';
// ...inside RootLayout, after the loading guard:
const user = use$(user$);
return (
  <Stack screenOptions={{ headerShown: false }}>
    {!user && <Stack.Screen name="sign-in" />}
  </Stack>
);
```

Then in `app/index.tsx` redirect to tabs or sign-in:

```tsx
import { Redirect } from 'expo-router';
import { use$ } from '@legendapp/state/react';
import { user$ } from '@/state/auth';

export default function Index() {
  const user = use$(user$);
  return <Redirect href={user ? '/(tabs)' : '/sign-in'} />;
}
```

- [ ] **Step 3: Verify**

Run: `npx expo start --web`
Expected: with no session, app lands on the sign-in screen (RTL, Arabic). Stop server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add sign-in screen and auth gate"
```

---

## Task 13: Tabs layout

**Files:**
- Create: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Create the tabs layout**

`app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.surface },
        tabBarLabelStyle: { fontFamily: theme.font },
      }}>
      <Tabs.Screen name="index" options={{ title: ar.tabs.today, tabBarIcon: ({ color, size }) => <Ionicons name="today" color={color} size={size} /> }} />
      <Tabs.Screen name="history" options={{ title: ar.tabs.history, tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: ar.tabs.account, tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/_layout.tsx
git commit -m "feat: add bottom tabs layout"
```

---

## Task 14: Today screen — prayers + habits

**Files:**
- Create: `app/(tabs)/index.tsx`, `src/ui/components/PrayerRow.tsx`, `src/ui/components/HabitRow.tsx`
- Test: `__tests__/ui/PrayerRow.test.tsx`

- [ ] **Step 1: Write a failing component test**

`__tests__/ui/PrayerRow.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { PrayerRow } from '@/ui/components/PrayerRow';

describe('PrayerRow', () => {
  it('cycles status on press', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <PrayerRow prayer="fajr" status="not_yet" onChange={onChange} />,
    );
    fireEvent.press(getByText('الفجر'));
    expect(onChange).toHaveBeenCalledWith('on_time');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- PrayerRow`
Expected: FAIL — cannot find module `@/ui/components/PrayerRow`.

- [ ] **Step 3: Implement `PrayerRow`**

`src/ui/components/PrayerRow.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native';
import { Prayer, PrayerStatus, cyclePrayerStatus } from '@/domain/prayers';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

const STATUS_COLOR: Record<PrayerStatus, string> = {
  not_yet: theme.colors.notYet,
  on_time: theme.colors.onTime,
  late: theme.colors.late,
  missed: theme.colors.missed,
};

export function PrayerRow({ prayer, status, onChange }: {
  prayer: Prayer; status: PrayerStatus; onChange: (next: PrayerStatus) => void;
}) {
  return (
    <Pressable onPress={() => onChange(cyclePrayerStatus(status))}
      style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 8 }}>
      <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 18 }}>{ar.prayers[prayer]}</Text>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: STATUS_COLOR[status], marginLeft: 8 }} />
        <Text style={{ color: theme.colors.muted, fontFamily: theme.font }}>{ar.prayerStatus[status]}</Text>
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- PrayerRow`
Expected: PASS (1 test).

- [ ] **Step 5: Implement `HabitRow`**

`src/ui/components/HabitRow.tsx`:

```tsx
import { Pressable, Text, View } from 'react-native';
import { Habit, isHabitComplete, nextBooleanValue } from '@/domain/habits';
import { theme } from '@/ui/theme';
import { Ionicons } from '@expo/vector-icons';

export function HabitRow({ habit, value, onChange }: {
  habit: Habit; value: number; onChange: (next: number) => void;
}) {
  const done = isHabitComplete(habit, value);
  function onPress() {
    if (habit.type === 'boolean') onChange(nextBooleanValue(value));
    else onChange(value + 1);
  }
  return (
    <Pressable onPress={onPress}
      style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 8 }}>
      <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 18 }}>{habit.name}</Text>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
        {habit.type === 'count' ? (
          <Text style={{ color: theme.colors.muted, fontFamily: theme.font, marginLeft: 8 }}>{value}/{habit.target}</Text>
        ) : null}
        <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={24}
          color={done ? theme.colors.primary : theme.colors.muted} />
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 6: Implement the Today screen**

`app/(tabs)/index.tsx`:

```tsx
import { ScrollView, Text, View, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { use$ } from '@legendapp/state/react';
import { PRAYERS, Prayer, PrayerStatus } from '@/domain/prayers';
import { Habit } from '@/domain/habits';
import { todayKey } from '@/domain/dates';
import { user$ } from '@/state/auth';
import { habits$, habitLogs$, prayerLogs$, habitLogId, prayerLogId } from '@/state/stores';
import { PrayerRow } from '@/ui/components/PrayerRow';
import { HabitRow } from '@/ui/components/HabitRow';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

export default function Today() {
  const date = todayKey();
  const uid = use$(user$)?.id ?? '';
  const habits = Object.values(use$(habits$) ?? {}) as Habit[];
  const habitLogs = use$(habitLogs$) ?? {};
  const prayerLogs = use$(prayerLogs$) ?? {};

  function setPrayer(prayer: Prayer, status: PrayerStatus) {
    const id = prayerLogId(uid, date, prayer);
    prayerLogs$[id].set({ id, user_id: uid, date, prayer, status, deleted: false } as any);
  }
  function setHabit(habit: Habit, value: number) {
    const id = habitLogId(uid, date, habit.id);
    habitLogs$[id].set({ id, user_id: uid, habit_id: habit.id, date, value, deleted: false } as any);
  }

  const activeHabits = habits.filter((h) => h.active).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 24, marginBottom: 12, textAlign: 'right' }}>{ar.tabs.today}</Text>

      {PRAYERS.map((p) => {
        const log = (prayerLogs as any)[prayerLogId(uid, date, p)];
        return <PrayerRow key={p} prayer={p} status={(log?.status as PrayerStatus) ?? 'not_yet'} onChange={(s) => setPrayer(p, s)} />;
      })}

      <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
        <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 20 }}>{ar.habits.title}</Text>
        <Link href="/habits/manage" asChild>
          <Pressable><Text style={{ color: theme.colors.primary, fontFamily: theme.font }}>{ar.habits.manage}</Text></Pressable>
        </Link>
      </View>

      {activeHabits.map((h) => {
        const log = (habitLogs as any)[habitLogId(uid, date, h.id)];
        return <HabitRow key={h.id} habit={h} value={log?.value ?? 0} onChange={(v) => setHabit(h, v)} />;
      })}
    </ScrollView>
  );
}
```

- [ ] **Step 7: Run tests + manual check**

Run: `npm test`
Expected: all tests PASS.
Run: `npx expo start` and tap a prayer → status cycles and color changes; tap a habit → toggles/increments. Stop server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Today screen with prayers and habits"
```

---

## Task 15: Habit management screen

**Files:**
- Create: `app/habits/manage.tsx`

- [ ] **Step 1: Implement the manage screen**

`app/habits/manage.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Switch } from 'react-native';
import { use$ } from '@legendapp/state/react';
import * as Crypto from 'expo-crypto';
import { Habit } from '@/domain/habits';
import { user$ } from '@/state/auth';
import { habits$ } from '@/state/stores';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

export default function ManageHabits() {
  const uid = use$(user$)?.id ?? '';
  const habits = Object.values(use$(habits$) ?? {}) as Habit[];
  const [name, setName] = useState('');
  const [isCount, setIsCount] = useState(false);
  const [target, setTarget] = useState('1');

  function addHabit() {
    if (!name.trim()) return;
    const id = Crypto.randomUUID();
    habits$[id].set({
      id, user_id: uid, name: name.trim(), icon: 'star',
      type: isCount ? 'count' : 'boolean',
      target: isCount ? Math.max(1, parseInt(target, 10) || 1) : null,
      sort_order: habits.length, active: true, deleted: false,
    } as any);
    setName(''); setIsCount(false); setTarget('1');
  }

  function archive(h: Habit) {
    habits$[h.id].active.set(false);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 24, marginBottom: 16, textAlign: 'right' }}>{ar.habits.manage}</Text>

      <View style={{ backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 24 }}>
        <TextInput value={name} onChangeText={setName} placeholder={ar.habits.name} placeholderTextColor={theme.colors.muted}
          style={{ color: theme.colors.text, fontFamily: theme.font, textAlign: 'right', fontSize: 16, marginBottom: 12 }} />
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ color: theme.colors.text, fontFamily: theme.font }}>{ar.habits.target}</Text>
          <Switch value={isCount} onValueChange={setIsCount} />
        </View>
        {isCount ? (
          <TextInput value={target} onChangeText={setTarget} keyboardType="number-pad"
            style={{ color: theme.colors.text, fontFamily: theme.font, textAlign: 'right', marginBottom: 12 }} />
        ) : null}
        <Pressable onPress={addHabit} style={{ backgroundColor: theme.colors.primary, padding: 12, borderRadius: 10, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontFamily: theme.font }}>{ar.habits.add}</Text>
        </Pressable>
      </View>

      {habits.filter((h) => h.active).sort((a, b) => a.sort_order - b.sort_order).map((h) => (
        <View key={h.id} style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 8 }}>
          <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 16 }}>{h.name}</Text>
          <Pressable onPress={() => archive(h)}><Text style={{ color: theme.colors.missed, fontFamily: theme.font }}>{ar.habits.archive}</Text></Pressable>
        </View>
      ))}
    </ScrollView>
  );
}
```

- [ ] **Step 2: Manual check**

Run: `npx expo start` → open اليوم → tap إدارة العادات → add a boolean habit and a count habit; confirm they appear on Today. Stop server.

- [ ] **Step 3: Commit**

```bash
git add app/habits/manage.tsx
git commit -m "feat: add habit management screen"
```

---

## Task 16: History screen

**Files:**
- Create: `app/(tabs)/history.tsx`

- [ ] **Step 1: Implement the history screen**

`app/(tabs)/history.tsx`:

```tsx
import { ScrollView, Text, View } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { Habit } from '@/domain/habits';
import { Prayer, PrayerStatus, PRAYERS } from '@/domain/prayers';
import { summarizeDay } from '@/domain/history';
import { habits$, habitLogs$, prayerLogs$ } from '@/state/stores';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

export default function History() {
  const habits = Object.values(use$(habits$) ?? {}) as Habit[];
  const habitLogs = Object.values(use$(habitLogs$) ?? {}) as any[];
  const prayerLogs = Object.values(use$(prayerLogs$) ?? {}) as any[];

  // Collect all dates that have any log, newest first.
  const dates = Array.from(new Set([
    ...habitLogs.map((l) => l.date),
    ...prayerLogs.map((l) => l.date),
  ])).sort().reverse();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 24, marginBottom: 16, textAlign: 'right' }}>{ar.history.title}</Text>
      {dates.map((date) => {
        const prayerStatuses = {} as Record<Prayer, PrayerStatus>;
        PRAYERS.forEach((p) => {
          const log = prayerLogs.find((l) => l.date === date && l.prayer === p);
          prayerStatuses[p] = (log?.status as PrayerStatus) ?? 'not_yet';
        });
        const habitValues: Record<string, number> = {};
        habitLogs.filter((l) => l.date === date).forEach((l) => { habitValues[l.habit_id] = l.value; });
        const s = summarizeDay({ date, prayerStatuses, habitValues, habits });
        return (
          <View key={date} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between',
            backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 8 }}>
            <Text style={{ color: theme.colors.text, fontFamily: theme.font }}>{date}</Text>
            <Text style={{ color: theme.colors.muted, fontFamily: theme.font }}>
              {ar.history.prayed}: {s.prayersPrayed}/{s.prayersTotal}  ·  {ar.history.habitsDone}: {s.habitsComplete}/{s.habitsTotal}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
```

- [ ] **Step 2: Manual check**

Run: `npx expo start` → log some prayers/habits today → open السجل → today's row shows correct counts. Stop server.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/history.tsx
git commit -m "feat: add history screen"
```

---

## Task 17: Account screen

**Files:**
- Create: `app/(tabs)/account.tsx`

- [ ] **Step 1: Implement the account screen**

`app/(tabs)/account.tsx`:

```tsx
import { View, Text, Pressable } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { user$, signOut } from '@/state/auth';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

export default function Account() {
  const user = use$(user$);
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, padding: 24 }}>
      <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 24, marginBottom: 24, textAlign: 'right' }}>{ar.tabs.account}</Text>
      <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 18, textAlign: 'right' }}>{user?.name ?? ''}</Text>
      <Text style={{ color: theme.colors.muted, fontFamily: theme.font, marginBottom: 32, textAlign: 'right' }}>{user?.email ?? ''}</Text>
      <Pressable onPress={signOut} style={{ backgroundColor: theme.colors.missed, padding: 14, borderRadius: 12, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontFamily: theme.font }}>{ar.account.signOut}</Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 2: Manual check**

Run: `npx expo start` → الحساب shows name/email; tap تسجيل الخروج → returns to sign-in. Stop server.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/account.tsx
git commit -m "feat: add account screen"
```

---

## Task 18: End-to-end verification + final commit

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all unit + component tests PASS.

- [ ] **Step 2: Manual offline round-trip**

1. Sign in with Google (online).
2. Turn on airplane mode.
3. Log prayers and toggle habits → updates appear instantly.
4. Turn connectivity back on → confirm rows appear in Supabase tables (`prayer_logs`, `habit_logs`) for your `user_id`.
5. Sign out and back in on the same device → data reloads from sync.

- [ ] **Step 3: Verify RTL**

Confirm all screens render right-to-left with Arabic labels and the tab bar order reads correctly.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: muhassaba v1 complete"
```

---

## Notes for the implementer

- **Legend-State API:** This plan targets Legend-State v3. If the installed minor version differs, the sync-plugin import paths or `configureSynced` options may shift slightly — check `node_modules/@legendapp/state` docs and adjust import paths only; keep the store shape and field mappings (`created_at`/`updated_at`/`deleted`) identical.
- **Secrets:** never commit `.env`. The Supabase anon key is public-safe but still kept out of git by convention here.
- **Roadmap (not in this plan):** dhikr counter and adhkar collections (see spec §9). The `(tabs)` layout has room for a fourth الأذكار tab when those land.
```
