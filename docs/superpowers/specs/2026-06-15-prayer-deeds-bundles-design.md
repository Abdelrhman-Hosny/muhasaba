# Prayer-Deeds via Bundles — Design

**Date:** 2026-06-15
**Status:** Approved (pending spec review)

## Problem

Some deeds tied to the five daily prayers need to be tracked **once per prayer**
(e.g. صلاة الجماعة, إدراك تكبيرة الإحرام, الصف الأول) while others tied to prayer are
tracked **once per day** (e.g. الأذكار عقب الصلوات). Both "happen 5×/day" conceptually,
but they differ in how many checkable states the user wants.

The current model gives each `deed` exactly one `sectionId` (`notNull`) and keys
`deed_logs` uniquely by `(userId, date, deedId)` — i.e. **one deed = one checkbox per day**.
There is no first-class way to say "this item applies to several prayers, each tracked
independently."

## Key realisation

With **per-prayer sections** (the chosen organisation), tracking an item 5× means it
appears once under each of the 5 prayer sections, and **each instance needs its own
independent completion state** (you may catch جماعة at الفجر but miss it at العصر).
So there must be 5 logs/day regardless of model — there is no way to collapse that.

Therefore the multiplicity belongs at **authoring time** (one template → many deed rows),
**not** in storage as a many-to-many. This preserves the clean one-log-per-deed invariant
and everything built on it (sync `dirty`/`deleted`, the unique index, dhikr
auto-completion).

## Chosen approach: create-time expansion + bundle tag

Rejected alternatives:
- **Many-to-many `deeds ↔ sections`**: breaks the `(userId, date, deedId)` unique index,
  the sync flow, and dhikr auto-completion; largest migration; no benefit over separate
  rows since each prayer needs an independent state anyway.
- **Single measured deed, `target = 5`**: loses per-prayer granularity and cannot live
  "in each prayer section."

## Sections

No new sections. The existing time-of-day sections already map onto prayers:

| Section id        | Name (current)      | Prayer        |
| ----------------- | ------------------- | ------------- |
| `sec_morning`     | الصبح               | الفجر         |
| `sec_dhuhr`       | الظهر               | الظهر         |
| `sec_asr`         | العصر               | العصر         |
| `sec_maghrib`     | المغرب              | المغرب        |
| `sec_isha_night`  | العشاء والليل       | العشاء        |
| `sec_quran`       | أعمال على مدار اليوم | (throughout)  |

## Data model

One additive column. **No changes to `deed_logs`, sync, or auto-completion.**

```
deeds.bundleId  TEXT  NULL   -- groups deed rows that were created together
                              -- as "the same item across several sections".
                              -- NULL = ordinary standalone deed.
```

- A bundle is an opaque generated id (e.g. `bundle_<uuid>`) shared by all members.
- `bundleId` is local-first like the rest of `deeds`: it travels with the row and
  participates in the existing `dirty`/`updatedAt` sync, requiring no new sync logic.

Migration: a new Drizzle migration adds the column; the column is nullable so existing
rows are unaffected.

## Authoring (`DeedFormModal`)

- The single-section `ChipSelector` becomes a **multi-select** ("applies to" — pick any
  subset of sections). Default for a new deed: the first section only.
- On **create**:
  - 1 section selected → create 1 deed, `bundleId = null` (unchanged behaviour).
  - N>1 sections selected → generate one `bundleId`, create N deed rows (one per selected
    section), each with that `bundleId`, the same name/type/target/schedule, and a
    per-section `sortOrder`.
- `linkedDhikrId` / `target` apply uniformly to every member (measured bundles are
  allowed but expected to be rare; no special handling needed).

## Editing & deleting a bundled deed

When a deed has a non-null `bundleId`, editing or deleting prompts the user:
**"this prayer only"** vs **"all prayers in the group"**.

- **Edit → this only**: update just this row (name/schedule/type/target). If the user
  changes its section to one already covered by the bundle, that is allowed (duplicates
  are the user's choice); no uniqueness constraint added.
- **Edit → all**: apply the changed fields to every member of the bundle. Section is **not**
  propagated (each member keeps its own section); name/type/target/schedule/linkedDhikr are.
- **Delete → this only**: soft-delete this row (existing `deleted`/`deletedAt` flow). The
  bundle may shrink to a single remaining member; that is fine (it stays tagged).
- **Delete → all**: soft-delete every member of the bundle.

A standalone deed (`bundleId = null`) shows no prompt — edit/delete behave as today.

## Seeding

Add an **incremental migration** in `seed.ts` (matching the existing `count > 0` block
pattern) that introduces the genuinely-per-prayer default deeds as bundles. Candidates
(authoritative list to be finalised against `examples/عبادة 3.pdf` during implementation):

- صلاة الجماعة (all 5 prayer sections)
- إدراك تكبيرة الإحرام مع الجماعة (all 5)
- الصف الأول (all 5)

Items that remain once-daily (e.g. الأذكار عقب الصلوات المفروضة) are **not** bundled.
The migration must be idempotent (guard by checking for an existing member deed id /
bundle, like the current split-migration logic) so re-runs don't duplicate.

## Out of scope (YAGNI)

- Many-to-many sections / shared logs.
- Reordering bundles as a unit.
- Bundling across non-prayer sections beyond what the multi-select naturally allows.
- Group-deed (Sheikh) propagation interactions — bundles are per-user rows and ride the
  existing clone flow unchanged.

## Testing

- **Unit (schedule/expansion logic)**: creating with N sections yields N rows sharing one
  `bundleId`; N=1 yields `bundleId = null`.
- **DeedFormModal**: multi-select renders; save calls `onSave` with the selected section set.
- **Edit/delete prompt**: "this only" affects one row; "all" affects every bundle member;
  standalone deed shows no prompt.
- **Logs unaffected**: each bundled member produces its own independent `deed_log`; the
  unique index and dhikr auto-completion behave exactly as before.
- **Seed idempotency**: running the incremental migration twice does not duplicate deeds.
```
