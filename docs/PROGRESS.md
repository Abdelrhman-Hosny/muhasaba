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

---

## 🔲 Remaining Work (by priority)

### Iteration 3 — Day Screen Polish
- [ ] Sections with sticky headers (الصبح، الظهر، القرآن…)
- [ ] Collapsed "تم إنجازها" section for completed tasks
- [ ] Measured tasks (e.g., pages read → fraction score)
- [ ] Auto-scroll date strip to selected chip
- [ ] Bold font variant (`Cairo_700Bold`)

### Iteration 5 — Edit Scorecard
- [ ] Dedicated "تعديل الجدول" screen from Settings
- [ ] Reorder deeds (drag handle)
- [ ] Add deeds from library (library picker modal)
- [ ] Add custom deed
- [ ] Deed settings modal (schedule type, section assignment)
- [ ] Delete deed

### Iteration 6 — Dhikr Reader
- [ ] Dhikr-linked deeds: mark done directly OR open reader
- [ ] Reader: vertical list, each dhikr with text + tap-to-count
- [ ] Finishing all items auto-marks deed done
- [ ] Manual completion available inside reader

### Iteration 7 — ذكر مطلق Counter Page
- [ ] Split view: dhikr list (top) + quick-add keypad (bottom)
- [ ] Quick-add buttons: +١, +٥, +١٠, +٢٥, +٥٠, +١٠٠, مخصص
- [ ] Daily accumulation + daily reset
- [ ] Optional target + scorecard deed link (auto-complete on target hit)

### Iteration 8 — Week Screen
- [ ] "أعمال الأسبوع" section for weekly-anytime deeds
- [ ] Visible every day until checked, then shows ✓ for rest of week
- [ ] Separate weekly total (not in daily %)
- [ ] Tab only visible if user has weekly tasks

### Iteration 9 — Stats & Weekly Review
- [ ] Horizontal scrollable heatmap matrix (deeds × days)
- [ ] Summary chart on top
- [ ] Configurable week start day

### Iteration 10 — Presets & Onboarding
- [ ] Preset bundles (سنة ١, سنة ٢-٣, advanced) from the PDF levels
- [ ] First-launch flow to pick a starting preset

### Polish Backlog
- [ ] Circular progress ring option
- [ ] 7-day streak row

### Future Phase
- [ ] Mentorship mode (Sheikh & Students)
