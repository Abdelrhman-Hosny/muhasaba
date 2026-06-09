# Muhassaba (محاسبة) — Local-First Redesign (v1)

**Date:** 2026-06-09
**Status:** Approved design, pending spec review
**Supersedes:** `2026-06-08-muhassaba-design.md` (auth-first, multi-feature design)

## 1. Overview

Muhassaba is a mobile app for **daily spiritual self-accountability** (محاسبة
النفس). This v1 is deliberately narrow: a **single screen** for logging the
**five daily prayers**.

The defining property is **local-first**: the device is the source of truth, the
app is fully usable **offline forever from first launch**, and **no sign-in is
required**. Signing in (optional) turns on cloud backup/sync so a user's record
follows them across devices.

The app is **Arabic-only, right-to-left (RTL)**.

### What changed from the previous design

The prior design (`2026-06-08-...`) was **auth-first** (sign-in gated the whole
app, sign-out wiped local data) and shipped prayers **+ habits + history +
account** across three tabs. This redesign inverts that:

- Sign-in is **optional**, not a gate. The app works with no account, forever.
- Sign-out **keeps** local data (no wipe).
- Scope is cut to **one screen: the five prayers**. Habits/history/dhikr move to
  the roadmap (§10).
- The local store moves from Legend-State+MMKV to **SQLite (expo-sqlite) +
  Drizzle ORM**, chosen because the app will grow into multiple related tables.
- Sync moves from the Legend-State Supabase plugin to a **small, hand-written
  sync layer** we own end-to-end.

## 2. Scope

### Build now (v1)

- A single screen showing the **five daily prayers** for a selected day.
- Set/cycle each prayer's **status**: on time / late / missed / not yet.
- Edit prayers for **today and the previous `EDITABLE_DAYS_BACK` days**
  (code constant, default **7**, not user-editable).
- **Local-first** persistence: every read/write hits the local SQLite DB
  instantly; the app is fully usable offline with no account.
- **Optional Google sign-in** (Supabase OAuth) that enables cloud sync/backup.
- **Custom sync** (push/pull/last-write-wins merge), reconciled lazily.

### Out of scope (see Roadmap, §10)

- Custom habits, history/calendar view, dhikr counter, adhkar collections,
  reflections, statistics, prayer-time calculation, reminders/notifications.
- Real-time sync. Sync is periodic; being a minute or two behind is acceptable.

### Removed from the current repo

Strip the codebase to one screen. **Delete:** the habits, history,
account-as-tab, and habit-management screens; the Legend-State stores and sync
wiring; the auth-gating root layout. **Keep:** RTL setup, the bundled Arabic
font, the theme, the i18n strings, `domain/prayers.ts`, and `domain/dates.ts`.

## 3. Stack & Architecture

- **Expo** (managed workflow, SDK 56) with **Expo Router** for navigation.
- **expo-sqlite** — on-device relational database; the **source of truth**.
- **Drizzle ORM** — typed schema, migrations, and queries; `useLiveQuery` for UI
  reactivity (re-render on DB change).
- **@supabase/supabase-js** — Postgres + Auth (Google OAuth) + Row-Level Security
  (RLS); used **only** as a sync/backup backend, never on the read path.
- **Custom sync layer** (~150 lines, owned by us): push, pull, last-write-wins
  merge, claim-on-sign-in.
- **Arabic-only, RTL:** `I18nManager.forceRTL(true)`, bundled Arabic font (Cairo),
  all copy in Arabic.
- **Testing:** Jest + React Native Testing Library.

### The three layers (local-first model)

```
UI (five-prayers screen)
  │  read/write via prayerStore — synchronous, never waits on network
LOCAL STORE (SQLite, source of truth)
  │  background reconcile — only if signed in + online
SUPABASE (Postgres + Auth + RLS) — backup / cross-device copy
```

The phone is authoritative. Supabase is a backup that happens to be shared across
a user's devices. If the user never signs in, the bottom layer simply does not
exist and nothing breaks.

### Why SQLite + Drizzle (over Legend-State)

The app **will** grow into multiple related tables (habits, logs, dhikr,
collections). SQLite gives real relational queries, joins, and indexes that scale
to that; Drizzle adds type-safety and `useLiveQuery` reactivity. The Legend-State
Supabase *sync plugin* was rejected because it is beta, hides the sync mechanics,
and assumes an authenticated `user_id` from the start — which fights the
offline-then-optionally-sign-in flow. We write the sync ourselves so we
understand and control it.

### Data-access boundary

Screens **never** touch the database directly. All reads/writes go through a thin
`prayerStore` module:

- `getDay(date)` — returns the five prayer statuses for a date (reactive via
  `useLiveQuery`; a missing row reads as `not_yet`).
- `setStatus(date, prayer, status)` — upsert the status, bump `updated_at`, set
  `dirty = true`.

This keeps the UI decoupled from the storage engine and isolates all SQL in one
place.

## 4. Data Model

### Local table: `prayer_logs`

| Column       | Type        | Notes                                            |
|--------------|-------------|--------------------------------------------------|
| `id`         | uuid (PK)   | client-generated, so offline rows have a stable id |
| `user_id`    | uuid, null  | **null until claimed on sign-in**                |
| `date`       | date        | local calendar date                              |
| `prayer`     | enum        | `fajr` \| `dhuhr` \| `asr` \| `maghrib` \| `isha` |
| `status`     | enum        | `on_time` \| `late` \| `missed` \| `not_yet`     |
| `updated_at` | timestamptz | the referee for last-write-wins                  |
| `deleted`    | boolean     | soft-delete flag (default false)                 |
| `dirty`      | boolean     | **local-only**, unsynced flag; not sent to Supabase |

- **Merge identity:** `(date, prayer)`. Unique within a user's data.
- **No row** for a `(date, prayer)` is treated as `not_yet`.
- The five prayers are fixed in code, not a table.

### Supabase table: `prayer_logs`

Mirror of the above **except** `dirty` (a purely local concept). Columns:
`id`, `user_id`, `date`, `prayer`, `status`, `updated_at`, `deleted`.

- Unique constraint on `(user_id, date, prayer)`.
- **RLS:** select/insert/update policies restrict rows to
  `user_id = auth.uid()`.

## 5. Screens & Navigation

A single primary screen (no tab bar required in v1; a minimal header/menu hosts
the optional sign-in).

1. **Prayers screen** — shows the selected day's five prayers as a tap row;
   tapping a prayer cycles/sets its status. Updates are instant and optimistic
   (local-first). A date control lets the user move within the editable window
   (today back to `EDITABLE_DAYS_BACK` days); dates outside the window are
   read-only or hidden.
2. **Sign-in affordance** — an optional, non-blocking entry point (e.g. header
   menu) to sign in with Google, showing sync status and a sign-out action.

## 6. Auth Flow

- **Optional.** First launch goes straight to the prayers screen — no gate.
- **Google sign-in** via Supabase OAuth using `expo-auth-session` /
  `expo-web-browser` (already wired in the repo).
- After sign-in, the session is cached locally so later launches sync offline-
  tolerantly.
- **Sign-out keeps local data** (does not wipe). It only stops syncing and clears
  the cached session; `user_id` on local rows is left as-is.

## 7. Sync & Conflict Behavior

No real-time. Sync **reconciles lazily** and never blocks the UI.

- **Triggers:** on app launch, on return-to-foreground, and a few seconds after a
  write settles. Runs only when signed-in **and** online.
- **Push:** upsert all `dirty` rows to Supabase (`onConflict (user_id, date,
  prayer)`); on success, clear their `dirty` flag.
- **Pull:** fetch rows changed since a persisted `last_pulled_at` cursor (at this
  data size a full pull is also acceptable); **last-write-wins merge** into local
  by `(date, prayer)`, comparing `updated_at`. Advance the cursor.
- **Claim-on-sign-in:** stamp all local rows with the new `user_id`, mark them
  `dirty`, then run a normal push+pull. The merge resolves any overlap with data
  already in the account from another device — **newest `updated_at` wins**.
- **Deletes** are soft via the `deleted` flag so sync can propagate removals.

### Conflict resolution

Last-write-wins on `updated_at`, applied symmetrically on push and pull.
Conflicts are rare (a single user editing their own per-day records) and the
newest edit always wins, which matches user expectation for personal tracking.

## 8. Error Handling

- **Sync/network errors** are non-blocking: the UI keeps working from SQLite;
  dirty rows simply remain queued and retry on the next trigger.
- **Auth errors** (failed Google sign-in) surface an Arabic message with retry;
  the app remains fully usable offline regardless.
- **Migrations:** Drizzle migrations run on startup before first render; a failed
  migration is surfaced rather than silently corrupting data.

## 9. Testing Strategy

- **Unit (Jest):** last-write-wins merge, claim-on-sign-in stamping, dirty-flag
  tracking, and editable-window gating — all pure functions.
- **Component (RN Testing Library):** tap a prayer → optimistic status change
  re-renders via `useLiveQuery`.
- **Manual:** offline edits → sign in → verify round-trip; two-device merge
  (newest wins); RTL layout correctness.

## 10. Roadmap (future work)

Deferred, but the relational foundation (SQLite + Drizzle) is chosen specifically
so these slot in as additional tables without re-architecting:

- **Custom habits** (boolean / count-to-target) and their per-day logs.
- **History** view (calendar grid or scrollable day list) with optional streaks.
- **Dhikr counter** (free daily tally with +1/+5/+10/+25/+50/+100 chips).
- **Adhkar collections** (أذكار الصباح/المساء/النوم/بعد الصلاة) with an
  open-reader and mark-as-done, from a trusted source (e.g. حصن المسلم).
- Reflections, statistics, prayer-time calculation, reminders/notifications.

## 11. Open Questions / Deferred Decisions

- Exact date-navigation UI within the 7-day editable window (stepper vs. small
  day strip).
- Whether to show sync status inline on the prayers screen or only in the sign-in
  menu.
- `last_pulled_at` cursor vs. full-pull — start with whichever is simpler; data
  size makes both viable.
