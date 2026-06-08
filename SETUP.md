# Muhassaba — Setup & Handoff

Offline-first, Arabic (RTL) Expo app for daily spiritual self-accountability:
log the five daily prayers and track custom habits, synced to Supabase with
Google sign-in.

- **Spec:** `docs/superpowers/specs/2026-06-08-muhassaba-design.md`
- **Plan:** `docs/superpowers/plans/2026-06-08-muhassaba-v1.md`

## Stack

- Expo + Expo Router (routes live under `src/app/`)
- Legend-State **v3 (beta)** — observable state, MMKV persistence, Supabase sync plugin
- `react-native-mmkv` v4 (local persistence)
- `@supabase/supabase-js` — Postgres + Auth (Google OAuth) + RLS
- TypeScript, Jest + React Native Testing Library

## Run it

```bash
npm install
npm test          # 15 tests, all green
npx tsc --noEmit  # clean
npx expo start    # launch the app
```

> First Android launch: RTL is forced via `I18nManager.forceRTL(true)`, which
> takes effect only after a process restart on Android. The app may render LTR
> once on a fresh install, then correctly RTL after a restart. (A future
> enhancement could call `expo-updates` `reloadAsync()` on Android to automate
> this.)

## Wiring Supabase (required before sync/auth work) — deferred during build

The app currently ships with **placeholder** env values, so sign-in/sync are
inert until you complete these steps:

1. **Create a Supabase project**, then apply the schema:
   - Run `supabase/migrations/0001_init.sql` in the Supabase SQL editor (or via
     the Supabase CLI). It creates `habits`, `habit_logs`, `prayer_logs` with
     enums, `updated_at` triggers, soft-delete (`deleted`) columns, and RLS
     policies scoping every row to `auth.uid()`.
2. **Enable Google OAuth:** Supabase dashboard → Authentication → Providers →
   Google. Add a Google OAuth Web client ID/secret. Add the app redirect scheme
   `muhassaba://` to the allowed redirect URLs.
3. **Set env:** copy `.env.example` → `.env` and fill in:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   ```
   `.env` is gitignored — never commit it.
4. **Verify the offline round-trip:** sign in (online) → enable airplane mode →
   log prayers/habits (updates are instant, local-first) → reconnect → confirm
   rows appear in Supabase for your `user_id` → sign out/in to confirm reload.

## Project layout

```
src/
  app/                      # Expo Router routes
    _layout.tsx             # RTL + fonts + auth init + reactive auth guard
    index.tsx               # initial redirect (sign-in vs tabs)
    sign-in.tsx             # Google sign-in
    (tabs)/
      _layout.tsx           # bottom tabs (RTL)
      index.tsx             # اليوم (Today): prayers + habits
      history.tsx           # السجل (History): per-day summary
      account.tsx           # الحساب (Account): profile + sign out
    habits/manage.tsx       # add / archive habits
  domain/                   # pure, unit-tested logic
    dates.ts prayers.ts habits.ts history.ts
  state/
    supabase.ts             # client (MMKV-backed session)
    auth.ts                 # user$ observable, Google sign-in/out
    stores.ts               # Legend-State synced observables + id helpers
  ui/
    theme.ts                # colors, spacing, font
    components/             # PrayerRow, HabitRow
  i18n/ar.ts                # all Arabic strings
supabase/migrations/0001_init.sql
__tests__/                  # mirrors src/
```

## Known deferred items (v1 shortcuts vs. spec)

These were intentionally scoped out of the first build; pick up as follow-ups:

- **History day detail** — the History screen shows a per-day summary row only;
  the spec mentions tapping a day for a full per-prayer/per-habit breakdown.
- **Habit edit & reorder** — the manage screen supports add + archive; editing
  (rename / change type) and drag-to-reorder are not yet implemented.
- **Count-habit decrement** — count habits only increment on tap; no decrement
  to correct an over-tap.
- **Realtime sync** — Legend-State `realtime: true` is not enabled, so changes
  from other devices arrive on next fetch/startup, not instantly.

## Roadmap (from the spec, not in v1)

- Free-tally **dhikr counter** (+1/+5/+10/+25/+50/+100).
- Structured **adhkar collections** (الصباح، المساء، النوم، بعد الصلاة) with an
  open-reader / mark-as-done interaction. A fourth **الأذكار** tab is reserved
  for these.

## Notes

- **Legend-State is on the v3 beta line** (`3.0.0-beta.47`). It's the version
  whose Supabase sync + MMKV-v4 plugins this app depends on. Pin/upgrade
  deliberately.
- The Jest setup uses a `projects` config: a `domain` project (node env, pure
  logic) and an `app` project (jest-expo, for component tests) — a workaround
  for jest@30 / jest-expo@56 interop.
