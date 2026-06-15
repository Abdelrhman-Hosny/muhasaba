# Reorder deeds within a prayer section

**Date:** 2026-06-15
**Screen:** تخصيص الجدول والعبادات (settings → "الجدول والعبادات" tab)

## Goal

Let users drag-and-drop to reorder deeds **within a prayer section** (الصبح, الظهر, …)
on the settings screen, persisting the new order across sessions. A visible drag handle
on each card indicates the card is draggable.

## Scope

- In scope: reorder deeds inside the same section; persist to existing `sortOrder` column.
- Out of scope: moving a deed across sections (no `sectionId` changes); reordering
  sections themselves; reordering on the dhikrs tab.

## Current state (grounding)

- Screen: `src/app/settings.tsx` — outer `ScrollView` (lines ~301–315) switches between
  `<DeedsSettingsTab>` and `<DhikrsSettingsTab>`; floating "إضافة عبادة جديدة" bar below.
- Deeds tab: `src/features/settings/components/DeedsSettingsTab.tsx` — maps
  `scorecardStructure` (array of `{ section, deeds }`); each deed is a card with name,
  badges, optional linked-dhikr badge, and a `cardActions` row holding edit (pencil) and
  delete (trash) `Pressable`s.
- Data: `deeds` table has `sortOrder` (`src/db/schema.ts`). `useScorecardStructure()` in
  `src/state/deedStore.ts` (lines ~656–688) live-queries sections + deeds and sorts deeds
  within each section by `sortOrder` ascending. `sortOrder` is currently assigned only at
  insert time (append-to-end); there is **no** reorder function.
- Deeds carry `dirty` + `updatedAt`; mutations call `scheduleSync()`.
- Libraries already installed: `react-native-reanimated` 4.3.1,
  `react-native-gesture-handler` ~2.31.1, `react-native-worklets` 0.8.3. No reorder lib yet.

## Approach

### Dependency

Add `react-native-reorderable-list` (built on the already-installed reanimated +
gesture-handler). Chosen over hand-rolling for smooth drag, auto-scroll, and a handle API.

**Verify against Expo SDK 56 / reanimated 4 docs before coding** (per AGENTS.md). Confirm:
the installed version exports `NestedReorderableList`, `ScrollViewContainer`, and
`useReorderableDrag`, and is compatible with reanimated 4.

### Nested-list architecture

The deeds tab is a single outer scroll view containing several per-section deed lists, so a
normal scrollable reorderable list cannot be nested directly. Use the library's nested API:

- In `settings.tsx`, when the **deeds tab** is active, render the deeds content inside the
  library's `ScrollViewContainer` instead of the plain `ScrollView`. The **dhikrs tab**
  keeps the existing plain `ScrollView` unchanged.
- In `DeedsSettingsTab.tsx`, render each section's deeds as a `NestedReorderableList`
  (`scrollEnabled={false}`). Because each section is its own list, dragging is naturally
  confined to that section — satisfying "within section only" with no extra clamping.

### Store function

Add to `src/state/deedStore.ts`:

```ts
/**
 * Rewrites sortOrder for the given deeds to match array order (0..n-1).
 * Marks each row dirty and schedules sync. Caller passes the full ordered
 * list of deed ids for a single section.
 */
export async function reorderDeeds(orderedDeedIds: string[]): Promise<void>
```

Implementation: one transaction; for each id at index `i`, `update deeds set sortOrder=i,
updatedAt=now, dirty=true where id=?`. Then `scheduleSync()`. No-op if length < 2.

### UI changes (`DeedsSettingsTab.tsx`)

- Add a **drag handle** icon (`reorder-three-outline`) to the `cardActions` row, leading the
  edit/trash icons. The handle calls the library's `useReorderableDrag` hook to start the
  drag; the rest of the card and the outer scroll are unaffected.
- Render each section's deeds via `NestedReorderableList` with `renderItem` producing the
  existing deed card. Each draggable card component calls `useReorderableDrag` for its handle.
- `onReorder={({ from, to }) => …}` per section: reorder the section's deed-id array and call
  `reorderDeeds(newOrderedIds)`. Keep per-section local optimistic state seeded from props so
  the drag is smooth; the live query reconciles after the DB write.
- Empty sections render the existing empty card (no list). Section header unchanged.

### Edge cases

- **Bundled deeds** (same deed across prayers via shared `bundleId`): each member has its own
  per-section `sortOrder`, so reordering one section does not affect bundle siblings. No
  special handling.
- Sections with 0–1 deeds: handle shows but drag is a no-op (`reorderDeeds` early-returns).
- RTL: handle placement follows the existing `rtlRow` / `cardActions` layout.

## Testing

- `reorderDeeds` (store unit test): given an ordered id list, `sortOrder` becomes 0..n-1 in
  that order; affected rows are marked `dirty`; `scheduleSync` is invoked; <2 ids is a no-op.
- `DeedsSettingsTab` (component test): a drag handle renders per deed card; invoking a
  section's `onReorder` calls `reorderDeeds` with the correctly reordered id list.

## Out of scope / non-goals

- Cross-section moves, section reordering, reorder on the dhikrs tab, persisting an explicit
  "manual vs auto" sort mode.
