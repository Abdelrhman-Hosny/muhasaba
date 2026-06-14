# Refactor: Restructure files & extract repeated code

## Context

The app (Muhassaba — Arabic Islamic daily-accountability app; Expo SDK 56, Expo Router, SQLite+Drizzle, Supabase sync, RTL-first) works well, but the file layout no longer represents the app and blocks future extensibility:

- **Two monoliths**: `settings.tsx` (1,169 lines — two tab UIs + two form modals + a 370-line `createStyles`) and `DeedRow.tsx` (820 lines — embeds three distinct components: `CustomSlider`, `DhikrCard`, full Adhkar modal).
- **Pervasive duplication**: the RTL `flexDirection` ternary appears 30+ times; the progress-bar markup is copy-pasted 5×; the screen-header block 3×; the modal Save/Cancel pair 3×; `toArabicNumeral` is defined twice; pure domain logic lives inside UI files.
- **Inconsistent styling**: `index.tsx` and `counters.tsx` use fully inline styles while every other file uses the `createStyles(theme)` pattern; hardcoded colors leak through.

**Goal**: pure refactor — **no behavior changes** — that introduces a feature-first structure, extracts shared primitives, dedupes logic, and keeps the existing Jest suite green. Outcome: each feature owns its components, cross-cutting UI lives in one place, and new features slot in cleanly.

## Target structure (feature-first)

```
src/
├── app/                       # Expo Router entry points — paths UNCHANGED (tests depend on these)
│   ├── settings.tsx           # → thin shell
│   └── (tabs)/{index,counters}.tsx   # → thin shells
├── features/
│   ├── day/components/        # DateStrip.tsx
│   ├── counters/components/   # CounterList.tsx, KeypadPanel.tsx, AddCounterModal.tsx
│   ├── settings/components/   # DeedsSettingsTab, DhikrsSettingsTab, DeedFormModal, DhikrFormModal
│   └── adhkar/components/     # AdhkarModal.tsx, DhikrCard.tsx
├── shared/
│   ├── components/            # ProgressBar, ScreenHeader, ModalActions, ThemedTextInput,
│   │                          #   ChipSelector, DayBubblePicker, CustomSlider
│   └── hooks/                 # useActiveDefinitionIds.ts
├── ui/{components/{DeedRow,Drawer}.tsx, theme.ts}   # DeedRow becomes leaner
├── domain/{azkarData,dates,prayers}.ts + schedule.ts (NEW)
├── i18n/{ar,format}.ts        # toArabicNumeral lives ONLY here
├── state/{...deedStore} + scoring.ts (NEW)
└── db/{client,schema,seed}.ts
```

Entry-point paths in `app/` never move — `jest.config.js` maps `@/* → src/*` and tests import the screen entry points, so they keep working as long as testID'd children stay rendered in-tree.

## Shared components to create (`src/shared/components/`)

- **ProgressBar** `{ value, total, height?, animated? }` — replaces 5 inline bars; reads `useTheme()` internally. `animated` variant wraps `Animated.View` for `DhikrCard`.
- **ScreenHeader** `{ title, leftAction?, rightAction? }` — replaces 3 header blocks; uses `rtlRow`.
- **ModalActions** `{ onSave, onCancel, saveLabel?, cancelLabel?, testIDSave?, testIDCancel? }` — replaces 3 Save/Cancel pairs.
- **ThemedTextInput** — wraps `TextInput` with the standard `input` style; passes through `placeholderTextColor`, `testID`, `keyboardType`.
- **ChipSelector** `{ items, selectedId, onSelect, allowNone? }` — section + linked-dhikr chips in `DeedFormModal`.
- **DayBubblePicker** `{ selectedDays, onToggle }` — extracted from the schedule day-bubbles in `DeedFormModal`.
- **CustomSlider** — verbatim move of the private `CustomSlider` from `DeedRow.tsx` (same signature, named export).

## Shared hooks & utils

- `src/shared/hooks/useActiveDefinitionIds.ts` — extract the identical `useMemo` from `library.tsx` (~L35) and `settings.tsx` (~L153); takes `scorecardStructure`.
- `src/state/scoring.ts` — `computeScorecardScore(scorecard) → { totalTasks, donePoints }`, pure; replaces the inline loop in `index.tsx` (~L147) and is delegated to by `useDatesPercentages` in `deedStore.ts`.
- `src/domain/schedule.ts` — move `getScheduleLabel`, `getNextActiveDate`, `formatArabicDate`, `getPresetSectionId` out of the top of `settings.tsx`.
- `src/i18n/format.ts` — single home for `toArabicNumeral`; remove the duplicate in `domain/dates.ts`.
- `src/ui/theme.ts` — add module-level `rtlRow` / `rtlAlign` constants (`I18nManager.isRTL` is read once at bundle load, so this is safe), and add color tokens `notDoneBg: 'rgba(239,68,68,0.08)'` (+ Google blue) to both `darkTheme`/`lightTheme`.
- `src/db/schema.ts` — add `export type DeedType = 'boolean' | 'measured'`; delete the local redefinition in `settings.tsx`.

## Splitting the monoliths

**`settings.tsx`** → thin shell keeps the two-tab switcher, state, and handlers; renders `<DeedsSettingsTab>`, `<DhikrsSettingsTab>`, `<DeedFormModal>`, `<DhikrFormModal>`. The 370-line `createStyles` splits so each modal owns its own styles; ~80 lines of shell styles remain.

**`DeedRow.tsx`** (→ ~200 lines) → import `CustomSlider` (shared), `DhikrCard` and `AdhkarModal` (adhkar feature). `AdhkarModal` absorbs the modal-local MMKV state/handlers (`progress`, `updateProgress`, `resetAll`, `completedCount`, `completionPercentage`); `DeedRow` keeps only `modalVisible` and passes `visible/deed/date/onChange` down.

**`counters.tsx`** (→ ~60 lines) → `CounterList`, `KeypadPanel`, `AddCounterModal`.

**`deedStore.ts`** → NOT split (tests mock it at module level; splitting risks broad import churn). Only `computeScorecardScore` is extracted to `scoring.ts`.

## Critical files

`src/app/settings.tsx`, `src/ui/components/DeedRow.tsx`, `src/app/(tabs)/counters.tsx`, `src/app/(tabs)/index.tsx`, `src/ui/theme.ts`, `src/state/deedStore.ts`, `src/db/schema.ts`, `src/domain/dates.ts`, `src/i18n/format.ts`, `src/app/library.tsx`.

## Sequencing (keep `npm test` green between each step)

1. **Dedupe `toArabicNumeral`** — remove from `dates.ts`, repoint imports to `i18n/format.ts`.
2. **Additive token edits** — add `DeedType` to `schema.ts`; add `rtlRow`/`rtlAlign` + `notDoneBg`/Google-blue to `theme.ts`. No consumers yet.
3. **Extract `domain/schedule.ts`** — move 4 pure fns out of `settings.tsx`; add imports.
4. **Extract `state/scoring.ts`** — `computeScorecardScore`; call from `index.tsx` `useMemo`.
5. **Extract `useActiveDefinitionIds`** — update `library.tsx` + `settings.tsx`.
6. **Create shared primitives** — new files only (ProgressBar, ScreenHeader, ModalActions, ThemedTextInput, ChipSelector, DayBubblePicker).
7. **Move `CustomSlider`** out of `DeedRow.tsx` → import.
8. **Extract `DhikrCard`** → adhkar feature; move its module-scope `cardStyles` into a `createStyles(theme)` (fixes latent theme-reactivity bug); use `<ProgressBar>`.
9. **Extract `AdhkarModal`** (most complex — owns MMKV state); use `ScreenHeader`/`ProgressBar`/`DhikrCard`.
10. **Apply `rtlRow`/`rtlAlign`** across all `createStyles`/inline ternaries, file-by-file (visual review).
11. **Split `settings.tsx`** into the 4 feature components; verify testIDs (`btn-add-deed`, `btn-save-deed`, `input-deed-name`, `btn-day-bubble-*`) stay in-tree.
12. **Split `counters.tsx`** into the 3 feature components; verify testIDs (`btn-keypad-*`, `counter-row-*`, `btn-new-counter`, `input-new-name`).
13. **Swap inline progress bars → `<ProgressBar>`** (fold into steps 8/9/11/12).
14. **Apply `ThemedTextInput`** to all `TextInput` usages.
15. **Migrate `index.tsx` + `counters.tsx` to `createStyles`** for styling consistency.

## Watchpoints

- **Theme reactivity**: never build StyleSheet with theme values at module scope — always `useMemo(() => createStyles(theme), [theme])`. Fix `DeedRow.tsx`'s module-level `cardStyles` during the `DhikrCard` extraction.
- **Test import paths**: the 4 screen entry points must stay at their current `app/` paths; testID'd children must render in-tree (no lazy-loading) so RNTL `getByTestId` finds them. No `jest.config.js` changes needed.
- **MMKV in tests**: `react-native-mmkv` is globally mocked in `jest.setup.js`, so it still covers `AdhkarModal`'s new path.
- **RTL**: `I18nManager.isRTL` is fixed at runtime — module-level `rtlRow` is correct. Also delete the duplicate `forceRTL` block in `library.tsx` (belongs only in `_layout.tsx`).
- **Out of scope**: leave the unused `theme.spacing(n)` helper alone.

## Verification

- After **each** step: `npm test` must stay green (suite: `__tests__/ui/{DeedRow,counters,index,settings}.test.tsx`, plus domain/state tests).
- Type check: `npx tsc --noEmit` clean (watch for unused-import warnings after extractions, e.g. `useSyncExternalStore` in `settings.tsx`).
- Manual smoke (run app via Expo): Day screen (date strip, progress, check/skip a deed, completed split), Counters (keypad +/− modes, custom input, reset, add-counter modal), Settings (both tabs, add/edit/delete deed with schedule + linked dhikr, add/edit dhikr), Library (bundles, add presets), Adhkar modal (open from a deed, advance dhikr cards, reset, complete), light/dark theme toggle, RTL layout intact throughout.
