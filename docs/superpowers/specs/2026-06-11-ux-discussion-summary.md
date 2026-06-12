# Muhassaba UI/UX — Discussion Summary (Draft)

Date: 2026-06-11
Status: **Decisions so far** — pre-mockup. The final design doc will supersede this.

## Vision

Replace the printed weekly muhasaba PDFs (`examples/عبادة 1-3.pdf`) with a digital,
local-first mobile app. Three goals:

1. **Digital instead of paper** — fill the daily scorecard in the app, not on a printout.
2. **Customizability + templates** — no fixed "3 levels by stage/year"; the user shapes
   his own scorecard.
3. **Dhikr inside the app** — a dhikr deed can either be marked done directly, or opened
   to read/count the actual adhkar — no juggling between apps.

Plus a special page: a configurable **ذكر مطلق** counter table that accumulates through
the day, resets daily, and supports quick add.

## What the paper sheets contain (source material)

- Weekly tables: rows = deeds, columns = days of the week.
- Deeds grouped into **time-of-day / category sections**: الصبح، الظهر، العصر، المغرب،
  العشاء، الليل، القرآن، الأذكار المقيدة، أذكار الصباح/المساء، العلم الشرعي، وظائف
  الجمعة، الأعمال الأسبوعية.
- Each deed has a **weight (الدرجة)**: 1, 2, 4, 5…
- Daily **المجموع** and **النسبة المئوية لليوم**; weekly totals; an "advanced" sheet adds
  المحاسبة والتوبة and countable adhkar (الاستغفار ١٠٠، التهليل ١٠٠، الصلاة على النبي ١٠٠).
- Three difficulty levels (سنة ١، سنة ٢-٣، advanced).

## Decisions

### 1. Template model — one personal scorecard + deed library (gym-style)

- There is only ever **"my current scorecard"** — no juggling multiple active templates.
- Deeds come from a **predefined deed library** (like a gym app's exercise library).
  Predefined deeds carry **built-in behaviors** — e.g., a dhikr-linked deed opens the
  actual adhkar reader; a plain deed is a checkbox.
- If a deed isn't in the library, the user **adds a custom deed** (checkbox by default).
- **Presets** (e.g., the three PDF levels) are curated bundles from the library used as
  starting points; after that the user freely adds/removes/re-weights deeds.

### 2. Scoring — equal task weights (1 task = 1 point)

- We dropped configurable weights. Every task counts as exactly **1 point** towards the daily total.
- For measured tasks (e.g., read 20 pages), the score is a fraction (e.g., 10 pages = 0.5 points).
- Each day shows **total points + percentage** (النسبة المئوية لليوم).
- The percentage also appears **on the date strip / calendar** without opening the day —
  a suspiciously low score (e.g., 3/10) hints at a forgotten, unfilled day.

### 3. Embedded dhikr experience

- A dhikr-linked deed has two affordances: **mark done directly**, or **open the reader**.
- Reader = each dhikr item with its text and repeat count (٣×…), **tap to count**.
- Finishing all items **auto-marks the deed done** in the scorecard.
- **Manual completion stays available everywhere** (scorecard row and inside the reader) —
  the user may have recited from memory.

### 4. ذكر مطلق counter page — connected to the scorecard

- Configurable table of dhikr counters; **accumulates throughout the day, resets daily**;
  **quick add** for new counters.
- A counter can optionally have a **daily target and a link to a scorecard deed** —
  hitting 100 استغفار auto-completes that deed for the day.
- Counters without targets just accumulate freely. **One unified counting system** — no
  counting استغفار in two places.

### 5. Scheduling — a property of each deed

Three schedule types:

| Type | Example | Behavior |
| --- | --- | --- |
| Daily | الجماعة الأولى | Appears every day, counts in daily score |
| Specific weekdays | صيام الاثنين والخميس، وظائف الجمعة، دروس العلم | Appears only on those days; counts in that day's score (so Friday's denominator is naturally bigger, like the paper) |
| Weekly-anytime | زيارة القبور، سنن الفطرة | "أعمال الأسبوع" section on the day screen, visible every day until checked; once done, shows completed for the rest of the week; scores into a **separate weekly total**, not the daily % |

- The **start day of the week is a user setting** — weekly reset and weekly views pivot
  on it.

## Existing app foundation (to build on)

- Expo (SDK 56) + Expo Router, RTL Arabic UI, local-first SQLite (Drizzle) with Supabase
  last-write-wins sync, no auth wall.
- Current single screen: 5 daily prayers with binary checkboxes, 7-day editable date
  strip, daily progress bar — effectively a hardcoded mini-version of the scorecard.

## Final Decisions (Resolved Open Questions)

- **Overall app structure:** Bottom Tabs for primary views (اليوم Day Scorecard, الأسبوع Week Scorecard, الأذكار Counters). The "الأسبوع" tab only appears if the user has weekly tasks. Side Drawer for secondary views (الإحصائيات Stats, الإعدادات Settings/Template).
- **Day screen layout:** Flat vertical list with sticky headers. Checked tasks move to a collapsed "Completed" section at the bottom upon next launch/refresh.
- **Dhikr reader layout:** Vertical scrollable list. Each dhikr has its own circular progress indicator/counter.
- **ذكر مطلق counter page layout:** Split view. One part shows a vertical list of adhkar with their current total to select/focus. The other part has a persistent Quick Add keypad (+1, +5, +10, +25, +50, +100, Custom) that adds to the currently focused dhikr without needing a popup.
- **Template/library editing UX:** Dedicated "Edit Scorecard" screen from Settings to reorder and add deeds from the library. Weights are no longer configured here.
- **Stats / weekly review view:** Horizontal scrollable matrix (heatmap) where rows are deeds and columns are days, mimicking the paper. Summary chart on top.

## Future Phase: Mentorship (Sheikh & Students)

While the initial focus is on individual self-accountability, a future phase will introduce mentorship capabilities:
- **Role Structure:** A user can act as a "Sheikh" managing multiple "groups". Each "Student" belongs to a single group (1 Sheikh per student).
- **Abilities:** The Sheikh will be able to view their students' scorecards and progress.
- **Bulk Actions:** The Sheikh can bulk-add or modify deeds for an entire group at once.
- *Details on the UX and permissions for this mode will be explored in a later design phase.*
