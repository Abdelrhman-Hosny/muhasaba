# Reset Progress — Design

Date: 2026-06-15

## Goal

Let the user reset their progress from the existing **الحساب** screen
(`src/app/account.tsx`). The reset must work fully offline and, for signed-in
users, propagate to Supabase so wiped data is not resurrected on the next sync
pull (including across devices).

## Scope (chosen at reset time)

A single entry point offers the user three reset scopes:

1. **حذف السجل فقط** (Logs only) — clear all completion history & dhikr counts;
   keep the user's deeds / sections / counters intact.
2. **حذف السجل والعبادات** (Logs + deeds) — the above, plus remove all deeds,
   sections, and dhikr counters, leaving an empty scorecard.
3. **إعادة ضبط المصنع** (Factory reset) — wipe everything, then restore the
   default starter scorecard (as if freshly installed).

## UI / UX

- Add a destructive "إعادة تعيين التقدم" section to the bottom of
  `src/app/account.tsx`, visually separated with destructive (red) styling.
  Available whether the user is signed in or out.
- Tap → **scope chooser** (Alert / ActionSheet) listing the three options.
- After a scope is chosen → **final confirmation Alert** naming the chosen
  option, with the destructive action and a cancel. Cancel-safe at both steps.
- On success, show a brief success Alert/toast. The screen's live data updates
  automatically via the existing `useLiveQuery` hooks.

## Data model context

All user tables carry sync columns: `deleted` (boolean), `dirty` (boolean),
`updatedAt` (epoch ms). Tables involved:

- `deedLogs`, `dhikrLogs` — progress / history.
- `deeds`, `sections`, `dhikrs` — scorecard structure.
- `deedDefinitions` — global catalog (NOT user data; never touched by reset).

Soft delete = set `deleted=true, dirty=true, updatedAt=now`. The sync layer
(`runSync`) pushes dirty rows; pulls use last-write-wins by `updatedAt`, so a
tombstone with a later `updatedAt` wins over the server's live row.

In-modal adhkar progress also lives in the `muhassaba-adhkar-progress` MMKV
store (keys `progress:date:type:index`) and must be cleared on every reset.

## Core logic — new module `src/state/resetStore.ts`

- `resetLogsOnly()`
  - Tombstone all `deedLogs` + `dhikrLogs`.
  - Clear the `muhassaba-adhkar-progress` MMKV store (remove all keys).
- `resetLogsAndDeeds()`
  - Everything in `resetLogsOnly()`, plus tombstone all `deeds`, `sections`,
    `dhikrs`.
- `factoryReset()`
  - Tombstone all user rows (logs, deeds, sections, dhikrs).
  - Re-seed defaults via `seedDefaultUserData({ freshIds: true })`.
  - Clear `muhassaba-adhkar-progress`.

Each function runs its writes in a single SQLite transaction, then calls
`scheduleSync()`. Fully offline: writes land locally and the UI updates
immediately; sync happens opportunistically when online.

### Factory reset — fresh ids (key correctness decision)

The default seed uses deterministic ids (`deed_fajr`, `sec_morning`, …). If we
tombstoned those rows and then re-inserted rows with the same ids, we'd hit a
primary-key collision locally. Instead, factory reset re-seeds defaults with
**freshly generated ids** (like user-created deeds already do). Result:

- Old default + custom rows are tombstoned → propagate as soft-deletes.
- New default rows are fresh inserts (`dirty=true`) → push as new rows.
- No PK collisions; sync stays consistent across devices.

## Seed refactor — `src/db/seed.ts`

Extract the default sections / dhikrs / deeds insert block (currently the
empty-DB branch, ~lines 323-378) into an exported function:

```
seedDefaultUserData(options?: { freshIds?: boolean }): Promise<void>
```

- `seedDatabase()` calls it with deterministic ids (unchanged behavior).
- `factoryReset()` calls it with `freshIds: true`.
- `deedDefinitions` are not part of this helper and remain untouched by reset.

When `freshIds: true`, generate new unique ids for sections / dhikrs / deeds and
remap `sectionId` / `linkedDhikrId` references to the new ids.

## i18n — `src/i18n/ar.ts`

Add Arabic strings: the button label, the three scope option labels, the
confirmation titles/bodies (one per scope), and the success message.

## Testing

Unit-test the three reset functions against a seeded (in-memory) DB:

- `resetLogsOnly`: all logs tombstoned with `dirty=true`; deeds/sections/dhikrs
  untouched; MMKV adhkar progress cleared.
- `resetLogsAndDeeds`: logs + deeds + sections + dhikrs all tombstoned.
- `factoryReset`: all old rows tombstoned; new default rows exist with fresh
  ids and `dirty=true`; `deedDefinitions` unchanged; MMKV cleared.

## Out of scope

- No server-side bulk delete endpoint; deletions propagate via existing sync.
- No change to auth / sign-out behavior.
- No new general settings tab; reset lives on the existing الحساب screen.
