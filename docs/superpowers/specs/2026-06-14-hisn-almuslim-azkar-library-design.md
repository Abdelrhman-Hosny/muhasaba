# حصن المسلم — General Azkar Library

**Date:** 2026-06-14
**Status:** Approved design, pending implementation plan

## Summary

Add a browse-only azkar/du'a reference library ("حصن المسلم") to the app,
seeded from the full `azkar.csv` (135 categories, 345 entries). It is reached
from the side drawer and is **fully decoupled from the daily scorecard** — users
read and optionally tap-to-count, but nothing is recorded to the day screen.

This is "option 1" (pure reference + ephemeral tally). The design intentionally
leaves room for a future "option 2" (let a category be added to the daily
scorecard) without rework, but option 2 is **out of scope** for this work.

## Goals

- Surface the entire `azkar.csv` collection as a browsable, searchable library.
- Keep it independent of the scorecard/deed system.
- Reuse existing card UI; reduce duplication while adding the feature.
- Make `azkar.csv` the real source of truth via a generator script.

## Non-Goals (YAGNI)

- No scorecard integration / deed auto-completion in the library.
- No persistence of library tally (counts are ephemeral, per sitting).
- No grouping of categories into curated sections — search + pinned favorites
  cover discoverability.
- No editing of azkar from the UI.

## User Flow

1. User opens the side drawer → taps **"حصن المسلم"**.
2. Lands on the category list:
   - A **"المفضلة"** (favorites) block pinned on top with the common categories.
   - A search box filtering the full list by name.
   - The full list of all categories below, in **book order** (CSV order).
3. Taps a category → reader screen showing that category's items as cards.
4. In the reader, tapping a card increments its count (ephemeral). A "تصفير الكل"
   button resets the sitting. Native back returns to the list.

## Architecture

### Routing (`src/app/azkar/`)

- `azkar/index.tsx` — category list (favorites + searchable flat list).
- `azkar/[index].tsx` — reader for one category; `index` route param is the
  category's stable position in `azkarCategories`.

Reached via a new drawer entry; no bottom-tab changes. Native stack back button
returns from reader → list → previous screen.

### Data & Generator

`azkar.csv` becomes the source of truth.

- **Generator script** `scripts/gen-azkar.mjs`:
  - Parses `azkar.csv` (columns: `category, zekr, description, count, reference,
    search`).
  - Maps CSV `zekr` → `dhikr`, coerces `count` to a number (default 1 when
    blank/invalid), preserves `description`/`reference` (may be empty strings).
  - Groups rows by `category`, **preserving first-seen CSV order** for both
    categories and items.
  - Emits `src/domain/azkarData.ts` with the "Do not edit manually" header.
  - Documented run command (e.g. `node scripts/gen-azkar.mjs`).

- **Generated data shape** (`src/domain/azkarData.ts`):
  ```ts
  export interface DhikrItem {
    dhikr: string;
    description: string;
    count: number;
    reference: string;
  }

  export interface AdhkarCategory {
    index: number;        // stable position; used as the route param
    title: string;        // category name, e.g. "أذكار النوم"
    search: string;       // normalized text for filtering (from CSV search col)
    items: DhikrItem[];
  }

  export const azkarCategories: AdhkarCategory[];

  // Backward-compat exports derived from azkarCategories, so the existing
  // scorecard AdhkarModal flow keeps working unchanged:
  export const morningAdhkar: DhikrItem[];   // "أذكار الصباح"
  export const eveningAdhkar: DhikrItem[];   // "أذكار المساء"
  ```
  - `search` per category = the category title plus the concatenated `search`
    fields of its items (so the filter matches diacritic-free text).
  - `morningAdhkar`/`eveningAdhkar` are looked up by exact title and re-exported
    so `AdhkarModal` imports do not change.

### UI Component Reuse

The card-list currently lives inside `AdhkarModal`. Extract a shared
presentational component:

- **`AdhkarList`** (`src/features/adhkar/components/AdhkarList.tsx`):
  - Props: the `DhikrItem[]`, a `counts: number[]`, `onIncrement(index, next)`,
    `onResetItem(index)`, and the progress summary inputs.
  - Renders the progress summary header + the `DhikrCard` ScrollView.
  - Purely presentational — no MMKV, no deed logic, no date logic.

- `AdhkarModal` is refactored to render `AdhkarList`, keeping its existing
  date-keyed MMKV persistence and deed auto-completion **unchanged** (behavior
  identical; only the card-list rendering is delegated).

- New **library reader** (`azkar/[index].tsx`) renders `AdhkarList` with:
  - `counts` held in local `useState` (ephemeral; reset on unmount/open).
  - A "تصفير الكل" reset button.
  - **No** "إتمام العبادة وتسجيلها" button (nothing is recorded).

`DhikrCard` is reused as-is.

### Drawer Integration

- New menu item in `src/ui/components/Drawer.tsx`, placed **above** Settings,
  labeled **"حصن المسلم"**, routing to `/azkar` (same close-then-push pattern as
  the existing items).
- New i18n string in `src/i18n/ar.ts` under `drawer` (e.g. `drawer.azkar`).

### Favorites (pinned)

Pinned categories shown in a "المفضلة" block atop the list, matched by exact
title:

- أذكار الصباح
- أذكار المساء
- أذكار النوم
- الأذكار بعد السلام من الصلاة
- أذكار الاستيقاظ من النوم

A small constant array of titles in the list screen; each resolves to its
category in `azkarCategories`. Missing titles are silently skipped (defensive).

## Data Flow

```
azkar.csv ──(gen-azkar.mjs)──► src/domain/azkarData.ts
                                   │
            ┌──────────────────────┼───────────────────────┐
            ▼                      ▼                        ▼
   azkarCategories         morningAdhkar/eveningAdhkar   (search field)
            │                      │
   azkar/index.tsx          AdhkarModal (scorecard)
   azkar/[index].tsx ─────► AdhkarList ◄──── AdhkarModal
            │                      │
        DhikrCard (shared, unchanged)
```

## Error / Edge Handling

- **Blank `count`** → default to `1`.
- **Empty `description`/`reference`** → kept as `""` (DhikrCard already hides
  empty boxes).
- **Multiline `zekr`** (quoted CSV fields with newlines) → preserved verbatim;
  generator must use a real CSV parser, not naive split.
- **Invalid `[index]` route param** (out of range / non-numeric) → reader shows
  a graceful empty/back state rather than crashing.
- **Missing favorite title** → skipped without error.

## RTL

All new screens follow the existing `I18nManager.isRTL` conditional patterns
used across `index.tsx`, `counters.tsx`, and `Drawer.tsx` (header layout, text
alignment, row direction).

## Testing

- **Generator:** a small unit test (or assertion script) that the generated
  `azkarCategories` has the expected category count and that morning/evening
  derive correctly, and that counts coerce to numbers.
- **Library reader:** Jest/RTL test — renders a category's cards, tapping a card
  increments its count, "تصفير الكل" resets, and no scorecard write occurs.
- **AdhkarModal regression:** existing `DeedRow`/adhkar tests stay green after
  the `AdhkarList` extraction (behavior unchanged).
- Confirm `npx tsc --noEmit` clean and full Jest suite green.

## Files

| Action | File |
|---|---|
| Created | `scripts/gen-azkar.mjs` |
| Created | `src/app/azkar/index.tsx` |
| Created | `src/app/azkar/[index].tsx` |
| Created | `src/features/adhkar/components/AdhkarList.tsx` |
| Created | `__tests__/ui/azkarLibrary.test.tsx` |
| Regenerated | `src/domain/azkarData.ts` |
| Modified | `src/features/adhkar/components/AdhkarModal.tsx` |
| Modified | `src/ui/components/Drawer.tsx` |
| Modified | `src/i18n/ar.ts` |

## Future (out of scope)

- Option 2: "add this category to my daily deeds" (would reuse the existing
  date-keyed MMKV persistence path, not the ephemeral one).
- Favorites that the user can customize.
- Curated category grouping if search proves insufficient.
</content>
</invoke>
