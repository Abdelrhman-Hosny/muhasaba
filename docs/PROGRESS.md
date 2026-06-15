# Muhassaba — Progress Tracker

Based on [UX spec](superpowers/specs/2026-06-11-ux-discussion-summary.md) and [ASCII mockups](superpowers/specs/2026-06-12-ascii-mockups.md).

---

## ✅ Iteration 1 — Bottom Tab Layout + Day Screen Header (2026-06-12)

### Navigation
- [x] Bottom tab navigator with 3 tabs: اليوم / الأسبوع / الأذكار
- [x] Tab bar styled to match dark green theme (icons, colors, Cairo font)
- [x] Root layout updated to wrap tabs in a Stack

### Day Screen (اليوم)
- [x] Header updated: `☰  الدرجة: N/M` (hamburger + score display)
- [x] Removed broken `/account` link from header
- [x] Date strip chips show completion `٪` in Arabic-Indic numerals
- [x] Bulk query hook (`useDatesDoneCount`) for efficient % calculation

### Utilities
- [x] Arabic numeral conversion helper (`toArabicNumeral` in `src/i18n/format.ts`)
- [x] i18n strings for tabs, header score

### Housekeeping
- [x] Fixed stale test (`on_time` → `done` in PrayerRow test)
- [x] All 18 tests passing, zero TypeScript errors

### Files touched

| Action | File |
|---|---|
| Created | `src/app/(tabs)/_layout.tsx` |
| Created | `src/app/(tabs)/index.tsx` |
| Created | `src/app/(tabs)/week.tsx` |
| Created | `src/app/(tabs)/counters.tsx` |
| Created | `src/i18n/format.ts` |
| Modified | `src/app/_layout.tsx` |
| Modified | `src/i18n/ar.ts` |
| Modified | `src/state/prayerStore.ts` |
| Modified | `__tests__/ui/PrayerRow.test.tsx` |
| Deleted | `src/app/index.tsx` |

## ✅ Iteration 1.5 — Auth, Sync & Drawer (2026-06-12)

### Account & Sync Engine
- [x] Account screen with Google OAuth via `expo-auth-session`
- [x] Local-first sync engine (push dirty rows, pull remote, merge by `updated_at`)
- [x] Claim local rows on first sign-in
- [x] Live sync status indicator (`محلي فقط`, `جارٍ المزامنة…`, `متزامن`, `دون اتصال`)
- [x] Map UI `done` status to Supabase Postgres `on_time` enum

### Side Drawer (formerly Iteration 4)
- [x] Hamburger icon opens right-side drawer overlay
- [x] Drawer layout with Safe Area insets
- [x] Links to Stats, Settings (placeholders) and Account

### Files touched
| Action | File |
|---|---|
| Created | `src/app/account.tsx` |
| Created | `src/ui/components/Drawer.tsx` |
| Created | `src/state/sync.ts` |
| Created | `src/state/syncStatus.ts` |
| Modified | `src/app/_layout.tsx` |
| Modified | `src/app/(tabs)/index.tsx` |
| Modified | `src/state/auth.ts` |
| Modified | `src/state/prayerStore.ts` |
| Modified | `src/i18n/ar.ts` |

## ✅ Iteration 2 — Generalized Deed/Task Data Model (2026-06-12)

### Schema & Migrations
- [x] Create `sections` table (user's scorecard sections)
- [x] Create `deeds` table (user's checklist items, supporting level targets)
- [x] Create `deed_logs` table (completion log, with `note` support)
- [x] Create `dhikrs` (free-tally counters list) and `dhikr_logs` (daily counts)
- [x] Created Supabase migration SQL (`0002_deeds_model.sql`) and RLS policies
- [x] Generated Drizzle SQLite migration (`0001_real_leper_queen.sql`)

### Logic & Store
- [x] Seed predefined database defaults (`src/db/seed.ts` containing default sections, deeds, and counters)
- [x] Created `src/state/deedStore.ts` for reactive queries, day scores, and auto-completion of deeds linked to counters
- [x] Refactored Sync Engine (`src/state/sync.ts`) to perform topological push/pull sync operations across all 5 tables to prevent foreign key errors

### UI & Tests
- [x] Refactored Day screen (`index.tsx`) to query dynamic sections/deeds and calculate percentage scores
- [x] Added `DeedRow.tsx` rendering boolean checklist rows and expandable stepper components for measured tasks
- [x] Replaced `PrayerRow.test.tsx` with `DeedRow.test.tsx` (fully green)

### Files touched
| Action | File |
|---|---|
| Created | `src/db/seed.ts` |
| Created | `src/state/deedStore.ts` |
| Created | `src/ui/components/DeedRow.tsx` |
| Created | `__tests__/ui/DeedRow.test.tsx` |
| Created | `supabase/migrations/0002_deeds_model.sql` |
| Created | `drizzle/0001_real_leper_queen.sql` |
| Created | `docs/schema_er_diagram.md` |
| Created | `docs/schema_review.md` |
| Modified | `src/db/schema.ts` |
| Modified | `src/app/_layout.tsx` |
| Modified | `src/app/(tabs)/index.tsx` |
| Modified | `src/state/sync.ts` |
| Deleted | `src/state/prayerStore.ts` |
| Deleted | `src/ui/components/PrayerRow.tsx` |
| Deleted | `__tests__/ui/PrayerRow.test.tsx` |

## ✅ Iteration 7 — ذكر مطلق Counter Page (2026-06-12)

### Logic, UI & Tests
- [x] Split view: dhikr list (top) + quick-add keypad (bottom)
- [x] Quick-add buttons: +١, +٥, +١٠, +٢٥, +٥٠, +١٠٠, مخصص
- [x] Daily accumulation + daily reset
- [x] Optional target + scorecard deed link (two-way sync, auto-completing scorecard deeds on target hit and reflecting partial progress for measured deeds)
- [x] Custom counter creation modal with dynamic targets
- [x] Hamburger menu integration for drawer navigation access from the counters tab
- [x] Comprehensive Jest tests covering user interaction, customs, resets, modals, and safe-area context

### Files touched
| Action | File |
|---|---|
| Created | `__tests__/ui/counters.test.tsx` |
| Modified | `src/app/(tabs)/counters.tsx` |
| Modified | `src/i18n/ar.ts` |
| Modified | `src/state/deedStore.ts` |

## ✅ RTL UI Alignments, Score Swapping & Premium Theme (2026-06-12)

### RTL & Layout Alignments
- [x] Swapped display order of value/target labels using Unicode Left-to-Right Mark (`\u200E`) to ensure LTR format regardless of system-wide RTL text-mirroring (resolving `target / value` swap to `value / target`).
- [x] Fixed horizontal date timeline strip on the scoreboard page to keep today ("اليوم") on the right-most side of the screen.
- [x] Removed redundant score display next to the hamburger menu.

### Theme & Aesthetics
- [x] Implemented a premium dark-emerald palette (`#080d0a` deep jade-slate bg, `#111a15` card surfaces, `#10b981` emerald accent, `#7ea18f` minty-gray).
- [x] Replaced all button chips, custom inputs, and keypads with transparent jade-tinted surfaces (`rgba(255,255,255,0.05)` and `rgba(239, 68, 68, 0.08)`) instead of bright white elements or muddy gray overlays.

### Housekeeping & Tests
- [x] Updated Jest assertions to match LRM formatted values in `__tests__/ui/counters.test.tsx`.
- [x] Verified all 29 tests pass and TypeScript compiler reports zero errors.

---

## ✅ Iteration 5.1 — Deeds Library & Presets Integration (2026-06-13)

### Schema & Seeding
- [x] Extended `deed_definitions` table with `defaultSectionId`, `bundleId`, and `linkedDhikrTemplate`.
- [x] Generated Drizzle schema migration (`0002_worried_zaladane.sql`).
- [x] Expanded default seed data in `src/db/seed.ts` to include standard prayers, rawateb (Sunnah) bundles, and special items with linked dhikr templates.

### Deeds Library Screen
- [x] Created `src/app/library.tsx` screen.
- [x] Grouped presets into expandable bundles (e.g. سنن الرواتب) and standalone items.
- [x] Search filter for deeds library by name.
- [x] Single-click to add a deed from presets, with automatic creation of any linked dhikr templates.
- [x] "Add custom deed" action routing back to settings custom-deed form.

### Settings Integration
- [x] Refactored `settings.tsx` to redirect the "Add Deed" button to the new dedicated Library page.
- [x] Handle deep-linking search params to automatically open the custom deed modal on return.
- [x] Relocated suggested presets from Settings modal to the dedicated Library.

### Files touched
| Action | File |
|---|---|
| Created | `src/app/library.tsx` |
| Created | `drizzle/0002_worried_zaladane.sql` |
| Created | `drizzle/meta/0002_snapshot.json` |
| Modified | `src/db/schema.ts` |
| Modified | `src/db/seed.ts` |
| Modified | `src/app/settings.tsx` |
| Modified | `drizzle/meta/_journal.json` |
| Modified | `drizzle/migrations.js` |

---

## ✅ Premium Dynamic Theme, Drawer Selector & Section Renaming (2026-06-13)

### Premium Dynamic Themes
- [x] Defined strict `AppTheme` typescript interface in `src/ui/theme.ts` and enforced on `lightTheme` and `darkTheme`
- [x] Refactored all layout files, screens, and components to retrieve active theme settings reactively via `useTheme()` hook
- [x] Configured persistent theme preference storage in MMKV under key `themeMode` with reactive observables

### Side Drawer improvements
- [x] Replaced the simple text cycle toggle with a premium segmented theme selector card featuring active theme icons (`sunny-outline`, `moon-outline`, `contrast-outline`)
- [x] Renamed the drawer settings entry to `'تعديل الجدول والعبادات'` (Edit Schedule & Worships) to signify editing
- [x] Replaced `'القرآن الكريم'` section in the database seeding and migrations with `'أعمال على مدار اليوم'` (Things to do throughout the day)
- [x] Fixed RTL layout mirroring where `textAlign: 'right'` was placing items on the left side of the screen/cards by using `textAlign: I18nManager.isRTL ? 'left' : 'right'` for section headers, labels, and text views
- [x] Corrected `deedInfo` items layout alignment inside `settings.tsx` to align to the right under RTL by making `alignItems` and horizontal padding conditional on `I18nManager.isRTL`
- [x] Fixed hardcoded `flexDirection: 'row-reverse'` in checklist rows [DeedRow.tsx](file:///Users/abdelrahmanhosny/coding/muhassaba/src/ui/components/DeedRow.tsx) by making it conditional on `I18nManager.isRTL` to prevent dynamic mirroring from double-flipping checkbox layouts
- [x] Fixed all hardcoded `flexDirection: 'row-reverse'` layouts on the absolute dhikr counter tab [counters.tsx](file:///Users/abdelrahmanhosny/coding/muhassaba/src/app/(tabs)/counters.tsx) including the top header, the checklist card items, the keypad buttons, and the custom input blocks to align appropriately in RTL without double-flipping
- [x] Swapped layout headers in both Day index [index.tsx](file:///Users/abdelrahmanhosny/coding/muhassaba/src/app/(tabs)/index.tsx) and Counters [counters.tsx](file:///Users/abdelrahmanhosny/coding/muhassaba/src/app/(tabs)/counters.tsx) tabs to place the hamburger menu drawer toggle on the right side and titles/actions on the left under RTL
- [x] Removed the selected checkmark icon tick from active counter list items in `counters.tsx` to simplify and polish visual feedback by relying purely on the colored card highlights

### Housekeeping & Tests
- [x] Cleaned up unused styles and imports from `settings.tsx`
- [x] Updated settings tests in `settings.test.tsx` to dynamically query navigation parameters and mock local search params
- [x] Updated counters drawer test assertion in `counters.test.tsx` to match the renamed drawer item name
- [x] Verified all 36 Jest unit tests compile and run green successfully

### Files touched
| Action | File |
|---|---|
| Modified | `src/ui/components/Drawer.tsx` |
| Modified | `src/ui/theme.ts` |
| Modified | `src/app/settings.tsx` |
| Modified | `src/i18n/ar.ts` |
| Modified | `src/db/seed.ts` |
| Modified | `src/db/schema.ts` |
| Modified | `__tests__/ui/settings.test.tsx` |
| Modified | `__tests__/ui/counters.test.tsx` |

---

## ✅ Iteration 5.2 — Standalone Deeds & Adhkar Mutlaqa Refinement (2026-06-13)

### Schema & Seeding
- [x] Moved all "الأذكار المطلقة" (Adhkar Mutlaqa) definitions (`dhikr_istighfar_lib`, `dhikr_tasbih_lib`, `dhikr_salawat_lib`, `dhikr_tahlil_lib`, `dhikr_hawqala_lib`) to by default belong to the throughout-the-day section (`sec_quran` / "أعمال على مدار اليوم") instead of the morning section (`sec_morning`).
- [x] Added "لا حول ولا قوة إلا بالله" (Hawqala) to the default deeds scorecard for new users, mapped to its corresponding absolute dhikr counter.
- [x] Moved default "الاستغفار" (Istighfar) deed to the throughout-the-day section (`sec_quran` / "أعمال على مدار اليوم").
- [x] Added "قيام الليل" (Qiym Layl) and "تفسير / تدبر" (Tafsir / Tadabbur) standalone deed presets to the library under the "عبادات فردية" (Ibadat Fardeya / Standalone Deeds) section.
- [x] Configured robust database seeding incremental migrations in `seedDatabase()` to cleanly update existing users' database schema configurations (moving existing Adhkar Mutlaqa deeds/definitions to `sec_quran`, ensuring new definitions and counters exist) without resetting their logs or local storage.
- [x] Split the combined **الأذكار المقيدة اليومية** (Adhkar Muqayyada) definitions into separate deeds (e.g. splitting sleeping/waking, entering/leaving toilet & wudhu, entering/leaving home & riding, walking/entering/leaving mosque, gathering istighfar & gathering expiation) and migrated any existing scorecard deeds for users.
- [x] Configured all absolute dhikrs (**الأذكار المطلقة** - Istighfar, Tasbih, Salawat, Tahlil, Hawqala) to be `'measured'` types with a target of 100 rather than simple `'boolean'` checkmarks, displaying progress bars, counters, and stepper chips on the scorecard.

---

## ✅ Iteration 6 — Dhikr Reader (2026-06-13)

### Core Features
- [x] Dhikr-linked deeds: mark done directly OR open reader (via dedicated book icon)
- [x] Reader: vertical list modal layout, each dhikr item with text description, reference, tap-to-count, and reset
- [x] Finishing all items automatically marks the parent deed as done (via reactive `useEffect` monitoring MMKV azkar progress counts)
- [x] Manual completion button available inside reader modal ("إتمام العبادة وتسجيلها")

---

## ✅ Iteration 6.5 — UI Polish: Skip Toggles, Dynamic Dates Strip, Padding & Tab Cleanups (2026-06-13)

### Core UI & UX Polish
- [x] Side-by-side action buttons (`[ Checkbox ]` and `[ X ]`) added directly to `DeedRow` for discoverable skip/mark-done states.
- [x] Auto-marking parent deeds as done when all sub-adhkars are completed inside the reader.
- [x] Redundant safe-area bottom inset padding removed from the Counters persistent keypad since the bottom tab bar handles it.
- [x] Date strip dynamically starts from the user's first logged deed/active count, preventing empty days from displaying.
- [x] Hid the Week tab screen (`href: null`) and Statistics menu option in Drawer (commented out) to prepare for clean release.

---

## ✅ Iteration 11 — حصن المسلم General Azkar Library (2026-06-15)

Browse-only azkar/du'a reference library, fully decoupled from the daily
scorecard. Design: `docs/superpowers/specs/2026-06-14-hisn-almuslim-azkar-library-design.md`.

### Data & Generator
- [x] Added `scripts/gen-azkar.mjs` (RFC-4180 parser, CRLF-safe) that turns the full `azkar.csv` (135 categories, Hisn al-Muslim order) into `src/domain/azkarData.ts`; runnable via `npm run gen:azkar`.
- [x] New `azkarCategories` export (ordered `{ index, title, search, items }`); `morningAdhkar`/`eveningAdhkar` kept as derived exports so the scorecard `AdhkarModal` flow is unchanged.

### UI
- [x] Extracted shared presentational `AdhkarList` from `AdhkarModal` (progress summary + `DhikrCard` list); modal behavior identical (MMKV persistence + deed auto-complete preserved).
- [x] New `azkar/index.tsx` — searchable category list in book order, plus a pinned "المفضلة" block.
- [x] New `azkar/[index].tsx` — reader with ephemeral tap-to-count (no scorecard writes) and "تصفير الكل".
- [x] New "حصن المسلم" entry in the side drawer.

### Favorites
- [x] User-customizable favorites via a star toggle on each category row, persisted in MMKV (`src/features/adhkar/favorites.ts`) and reactive via observable.
- [x] Seeded defaults (removable): أذكار الصباح، أذكار المساء، أذكار النوم، أذكار الاستيقاظ من النوم.

### Housekeeping & Tests
- [x] Added `__tests__/domain/azkarData.test.ts` and `__tests__/ui/AdhkarList.test.tsx`.
- [x] Full Jest suite green (48 tests) and `npx tsc --noEmit` clean.

---

## ✅ Iteration 12 — Reset Progress (2026-06-15)

Design: [reset-progress](superpowers/specs/2026-06-15-reset-progress-design.md).

### Feature
- [x] "إعادة تعيين التقدم" in a "منطقة الخطر" footer on the الحساب screen (`src/app/account.tsx`), available signed-in or out.
- [x] Two-step flow: scope chooser (3 options) → per-scope confirmation Alert → success/error Alert.
- [x] Three offline-first reset variants in `src/state/resetStore.ts`, each in a SQLite transaction:
  - `resetLogsOnly()` — deletes all deed/dhikr logs, keeps deeds/sections/counters.
  - `resetLogsAndDeeds()` — also removes all deeds, sections, and dhikr counters.
  - `factoryReset()` — wipes everything, then re-seeds defaults with fresh ids.
- [x] Clears the in-modal adhkar progress (`muhassaba-adhkar-progress` MMKV) on every reset.

### Sync correctness
- [x] Tombstones rows (`deleted + dirty`, never hard-delete) and calls `scheduleSync()`, so deletions propagate to Supabase (last-write-wins by `updatedAt`) and aren't resurrected on next pull.
- [x] Factory reset re-seeds with freshly-generated ids to avoid PK collisions with the tombstoned default rows.

### Refactor
- [x] Extracted default scorecard data + a pure `buildDefaultUserData({ freshIds })` builder into `src/db/defaultData.ts` (no native imports).
- [x] `src/db/seed.ts` now exposes `seedDefaultUserData({ freshIds? })`; initial seed uses deterministic ids (unchanged behavior).

### Housekeeping & Tests
- [x] Added `__tests__/domain/defaultData.test.ts` (deterministic ids, seed flags, fresh-id remapping, `genId` guard).
- [x] Added i18n `reset` strings in `src/i18n/ar.ts`.
- [x] Full Jest suite green (58 tests); no new `tsc` errors.

---

## 🔲 Remaining Work (by priority)

### Iteration 3 — Day Screen Polish
- [ ] Sections with sticky headers (الصبح، الظهر، القرآن…)
- [x] Collapsed "تم إنجازها" section for completed tasks
- [x] Measured tasks (e.g., pages read → fraction score)
- [x] Auto-scroll date strip to selected chip
- [x] Bold font variant (`Cairo_700Bold`)

### Iteration 5 — Edit Scorecard
- [ ] Dedicated "تعديل الجدول" screen from Settings
- [ ] Reorder deeds (drag handle)
- [x] Add deeds from library
- [x] Add custom deed
- [ ] Deed settings modal (schedule type, section assignment)
- [ ] Delete deed

### Iteration 10 — Presets & Onboarding
- [ ] Preset bundles (سنة ١, سنة ٢-٣, advanced) from the PDF levels
- [ ] First-launch flow to pick a starting preset

### Polish Backlog
- [ ] Circular progress ring option
- [ ] 7-day streak row
- [ ] **Linking mutlaq adhkar (الأذكار المطلقة) with deeds — UX rework.** Current flow for
      linking a free dhikr counter to an actual deed is not intuitive; needs a clearer,
      more discoverable UX. Revisit before relying on it more heavily.

### Future Phase
- [ ] Iteration 8 — Week Screen (Weekly-anytime deeds tab)
- [ ] Iteration 9 — Stats & Weekly Review (Heatmap matrix & summary chart)
- [ ] Mentorship mode (Sheikh & Students)
