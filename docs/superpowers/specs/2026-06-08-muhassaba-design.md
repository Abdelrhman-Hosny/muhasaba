# Muhassaba (محاسبة) — Design Spec

**Date:** 2026-06-08
**Status:** Approved design, pending spec review

## 1. Overview

Muhassaba is a mobile app for **daily spiritual self-accountability** (محاسبة النفس).
It helps a user log their five daily prayers and track custom acts of worship
(habits), then review their record over time.

The app is **Arabic-only with a right-to-left (RTL) layout**, **offline-first**
(fully usable without a connection), and **cloud-synced** so a user's data
follows them across devices.

### v1 scope (build now)

- Log the **five daily prayers** with a status (on time / late / missed / not yet).
- Track **custom habits** (acts of worship), either boolean (done/not done) or
  count-toward-a-target.
- **History** view of past days.
- **Account**: Google sign-in/out and profile.

### Out of scope for v1 — see [Roadmap](#9-roadmap-future-work)

- Free-tally **dhikr counter** (+1/+5/+10/+25/+50/+100).
- Structured **adhkar collections** (الصباح، المساء، النوم، بعد الصلاة) with an
  open-reader and mark-as-done interaction.
- Reflection/journaling, longer-term goals, statistics/insights, prayer-time
  calculation, and reminders/notifications.

## 2. Stack & Architecture

- **Expo** (managed workflow, latest SDK) with **Expo Router** for file-based
  navigation.
- **Legend-State v3** as the local-first state layer: observables persisted
  locally via **MMKV**, synced to **Supabase** through the official Legend-State
  Supabase sync plugin.
- **Supabase**: Postgres + Auth (Google OAuth) + Row-Level Security (RLS).
- **Offline-first:** all reads/writes hit the local store instantly; the sync
  plugin pushes/pulls deltas whenever connectivity returns. The app is fully
  usable offline after the first sign-in (session token cached locally).
- **Arabic-only, RTL:** `I18nManager.forceRTL(true)`, a bundled Arabic font
  (e.g. IBM Plex Sans Arabic or Cairo), all copy in Arabic.
- **Testing:** Jest + React Native Testing Library.

### Why offline-first with Legend-State

Logging is a moment-to-moment activity that often happens with poor or no
connectivity (e.g. right after prayer). The data is small, single-user, and
per-day, so conflicts are rare. Legend-State + its Supabase plugin gives local
persistence and automatic sync with minimal infrastructure, which fits this
scale better than a managed sync engine (PowerSync) or hand-rolled sync
(WatermelonDB).

## 3. Data Model (Supabase)

Every table carries the columns the Legend-State Supabase sync plugin needs for
delta sync and soft deletes:

| Column       | Type        | Notes                                   |
|--------------|-------------|-----------------------------------------|
| `id`         | uuid (PK)   | client-generated                        |
| `user_id`    | uuid        | FK to `auth.users`; RLS key             |
| `created_at` | timestamptz | default now()                           |
| `updated_at` | timestamptz | bumped on every write                   |
| `deleted`    | boolean     | soft-delete flag, default false         |

**Row-Level Security:** every table has policies restricting select/insert/
update to rows where `user_id = auth.uid()`.

### Tables

**`habits`** — user-defined acts of worship.

| Column       | Type    | Notes                                   |
|--------------|---------|-----------------------------------------|
| `name`       | text    | Arabic display name                     |
| `icon`       | text    | icon key/name                           |
| `type`       | enum    | `boolean` \| `count`                    |
| `target`     | int     | required when `type = count` (else null)|
| `sort_order` | int     | display order                           |
| `active`     | boolean | archived habits set `active = false`    |

**`habit_logs`** — one row per habit per day.

| Column     | Type | Notes                                          |
|------------|------|------------------------------------------------|
| `habit_id` | uuid | FK → `habits.id`                               |
| `date`     | date | local calendar date                            |
| `value`    | int  | `0/1` for boolean habits; count for `count`    |
| `note`     | text | optional                                       |

Unique constraint on `(user_id, habit_id, date)`.

**`prayer_logs`** — one row per prayer per day. The five prayers are fixed and
defined in code (not a table); only their *logs* are stored.

| Column   | Type | Notes                                              |
|----------|------|----------------------------------------------------|
| `date`   | date | local calendar date                                |
| `prayer` | enum | `fajr` \| `dhuhr` \| `asr` \| `maghrib` \| `isha`  |
| `status` | enum | `on_time` \| `late` \| `missed` \| `not_yet`       |

Unique constraint on `(user_id, date, prayer)`. A prayer with no row is treated
as `not_yet`.

## 4. Screens & Navigation

Bottom tab navigation, RTL-aware. **v1 ships three tabs** (اليوم، السجل، الحساب); a fourth **الأذكار** tab is reserved for the roadmap features in §9.

1. **اليوم (Today)** — the home screen.
   - Today's five prayers as a quick-tap row; tapping a prayer cycles/sets its
     status. Updates are instant (local-first) and optimistic.
   - Today's active habits below: boolean habits toggle with a tap; count habits
     show progress toward target with increment controls.
   - An "edit/manage" affordance opens **habit management** (add / edit / reorder
     / archive) as a pushed screen — not a separate tab.

2. **السجل (History)** — per-day review.
   - Calendar or list of past days showing prayer statuses and habits completed.
   - Tap a day to see its full detail.

3. **الحساب (Account)** — Google sign-in/out, profile, app info.

> Note: the **الأذكار (Dhikr)** tab is reserved for the roadmap features in
> §9 and is not built in v1. It is added when its features land.

## 5. Auth Flow

- Google sign-in via Supabase OAuth using `expo-auth-session` /
  `expo-web-browser`.
- First launch → sign-in screen. After sign-in, the session is cached locally so
  subsequent launches work **offline**.
- Sign-out clears local (MMKV) data.

## 6. Sync & Conflict Behavior

- Writes are local-first; Legend-State queues them and syncs when online.
- Per-table sync is filtered by `user_id`; RLS enforces the same server-side.
- **Conflict resolution:** last-write-wins on `updated_at`. Conflicts are rare
  (a single user editing their own daily records).
- Deletes are **soft** via the `deleted` flag.

## 7. Error Handling

- Network errors during sync are non-blocking: the UI keeps working from the
  local store; sync retries on reconnect.
- Auth errors (failed Google sign-in) surface an Arabic error message with a
  retry action.
- Validation: count habits require a positive `target`; habit names are
  non-empty.

## 8. Testing Strategy

- **Unit (Jest):** prayer status transitions, habit completion/streak logic,
  and local↔Supabase sync mapping (pure functions).
- **Component (RN Testing Library):** Today screen interactions — tap a prayer →
  optimistic status change; toggle/increment a habit.
- **Manual:** offline → log prayers/habits → reconnect → verify sync round-trip;
  multi-device sync; RTL layout correctness.

## 9. Roadmap (future work)

Documented now so the architecture leaves room for them; **not implemented in v1.**

### 9.1 Dhikr counter (free tally)

A dedicated section/tab for unbounded dhikr counting. Each dhikr shows today's
running total; tapping it reveals quick-add chips **+1, +5, +10, +25, +50,
+100** that accumulate the count. Daily count only (resets at midnight).

- Built-in dhikr (سبحان الله، الحمد لله، الله أكبر، استغفار، صلاة على النبي…)
  **seeded as rows per user** on first sign-in so they share one foreign key
  with logs; built-ins can be hidden/archived but not deleted. Users can add
  custom dhikr.
- Proposed tables: `dhikr` (definitions: `name`, `is_builtin`, `sort_order`,
  `active`) and `dhikr_logs` (`dhikr_id`, `date`, `count`).

### 9.2 Adhkar collections (structured routines)

Curated routines like **أذكار الصباح، أذكار المساء، أذكار النوم، أذكار بعد
الصلاة** (in the spirit of حصن المسلم / Fortress of the Muslim). Each collection
is a set of specific supplications, each with its Arabic text and a repetition
count.

- Tapping a collection offers two actions:
  - **افتح (Open)** → a reader that steps through each dhikr, tapping to count
    down its repetitions, with progress until the collection completes.
  - **تم (Mark as done)** → quick-complete the whole collection without reading.
- أذكار بعد الصلاة is completable up to 5×/day (once per obligatory prayer);
  others are once-daily.
- **Content accuracy is critical.** Texts must come from a trusted source
  (e.g. حصن المسلم open dataset) and be reviewed before release; the exact
  source/format is to be decided when this feature is scheduled.
- These features land under the reserved **الأذكار** tab.

## 10. Open Questions / Deferred Decisions

- Exact Arabic font choice (IBM Plex Sans Arabic vs Cairo vs other).
- History view presentation: calendar grid vs scrollable day list.
- Whether to surface streaks/stats in v1 History (currently: simple per-day view).
