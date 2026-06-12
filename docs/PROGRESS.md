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

---

## 🔲 Remaining Work (by priority)

### Iteration 2 — Generalized Deed/Task Data Model
> *This is the architectural foundation everything else depends on.*

- [ ] Create `sections` table (id, name, sort_order)
- [ ] Create `deeds` table (id, section_id, name, type, schedule, sort_order)
- [ ] Create `deed_logs` table (id, deed_id, date, status, value, updated_at, dirty, deleted)
- [ ] Seed predefined deed library (prayers, adhkar, quran, etc.)
- [ ] Migrate existing `prayer_logs` data into `deed_logs`
- [ ] Refactor Day screen to render deeds by section with sticky headers
- [ ] Support 3 schedule types: daily, specific weekdays, weekly-anytime

### Iteration 3 — Day Screen Polish
- [ ] Sections with sticky headers (الصبح، الظهر، القرآن…)
- [ ] Collapsed "تم إنجازها" section for completed tasks
- [ ] Measured tasks (e.g., pages read → fraction score)
- [ ] Auto-scroll date strip to selected chip
- [ ] Bold font variant (`Cairo_700Bold`)

### Iteration 4 — Side Drawer
- [ ] Hamburger icon opens drawer
- [ ] Drawer items: الإحصائيات (Stats), الإعدادات (Settings/Template)

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
- [ ] `/account` route scaffold
- [ ] Supabase sync (anonymous auth, push/pull)

### Future Phase
- [ ] Mentorship mode (Sheikh & Students)
