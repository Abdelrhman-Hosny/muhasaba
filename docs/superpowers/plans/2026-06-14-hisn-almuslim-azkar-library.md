# حصن المسلم General Azkar Library — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a browse-only "حصن المسلم" azkar reference library, seeded from the full `azkar.csv`, reached from the side drawer, fully decoupled from the daily scorecard.

**Architecture:** A code-generation step turns `azkar.csv` into `src/domain/azkarData.ts` (an ordered `azkarCategories` array plus backward-compatible `morningAdhkar`/`eveningAdhkar`). A new pair of Expo Router screens (`azkar/index.tsx` list + `azkar/[index].tsx` reader) render categories using a shared, presentational `AdhkarList` extracted from the existing `AdhkarModal`. Counting in the library is ephemeral (local state, no MMKV, no deed completion).

**Tech Stack:** Expo Router, React Native, TypeScript, Jest + @testing-library/react-native, Node (generator script), MMKV (existing scorecard path only).

**Reference spec:** `docs/superpowers/specs/2026-06-14-hisn-almuslim-azkar-library-design.md`

---

## File Structure

| Action | File | Responsibility |
|---|---|---|
| Create | `scripts/gen-azkar.mjs` | Parse `azkar.csv` → emit `src/domain/azkarData.ts` |
| Regenerate | `src/domain/azkarData.ts` | `azkarCategories` + derived `morningAdhkar`/`eveningAdhkar` |
| Create | `src/features/adhkar/components/AdhkarList.tsx` | Presentational summary + DhikrCard list |
| Modify | `src/features/adhkar/components/AdhkarModal.tsx` | Delegate card list to `AdhkarList` (behavior unchanged) |
| Create | `src/app/azkar/index.tsx` | Category list: favorites block + searchable flat list |
| Create | `src/app/azkar/[index].tsx` | Reader for one category (ephemeral counting) |
| Modify | `src/ui/components/Drawer.tsx` | New "حصن المسلم" menu item → `/azkar` |
| Modify | `src/i18n/ar.ts` | `drawer.azkar` string + screen labels |
| Create | `__tests__/domain/azkarData.test.ts` | Generated-data sanity |
| Create | `__tests__/ui/AdhkarList.test.tsx` | Increment/reset wiring + summary |

---

## Task 1: CSV Generator & Data Regeneration

**Files:**
- Create: `scripts/gen-azkar.mjs`
- Regenerate: `src/domain/azkarData.ts`
- Test: `__tests__/domain/azkarData.test.ts`

- [ ] **Step 1: Write the generator script**

Create `scripts/gen-azkar.mjs`. It uses a minimal RFC-4180 parser (handles quoted fields, embedded newlines, escaped `""`), groups rows by `category` preserving first-seen order, maps `zekr`→`dhikr`, coerces `count`, and writes the data module.

```js
// scripts/gen-azkar.mjs
// Regenerates src/domain/azkarData.ts from azkar.csv.
// Run: node scripts/gen-azkar.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSV = join(root, 'azkar.csv');
const OUT = join(root, 'src', 'domain', 'azkarData.ts');

const MORNING_TITLE = 'أذكار الصباح';
const EVENING_TITLE = 'أذكار المساء';

// RFC-4180 parser → array of string[] rows.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else if (c === '\r') {
      // ignore; handled by following \n
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const raw = readFileSync(CSV, 'utf8');
const rows = parseCsv(raw).filter((r) => r.length > 1 && r.some((c) => c.trim() !== ''));
const header = rows.shift().map((h) => h.trim());
const col = (name) => header.indexOf(name);
const ci = {
  category: col('category'),
  zekr: col('zekr'),
  description: col('description'),
  count: col('count'),
  reference: col('reference'),
  search: col('search'),
};

const order = [];
const byCat = new Map();
for (const r of rows) {
  const title = (r[ci.category] ?? '').trim();
  if (!title) continue;
  if (!byCat.has(title)) { byCat.set(title, []); order.push(title); }
  const countRaw = (r[ci.count] ?? '').trim();
  const count = Number.parseInt(countRaw, 10);
  byCat.get(title).push({
    dhikr: (r[ci.zekr] ?? '').trim(),
    description: (r[ci.description] ?? '').trim(),
    count: Number.isFinite(count) && count > 0 ? count : 1,
    reference: (r[ci.reference] ?? '').trim(),
    _search: (r[ci.search] ?? '').trim(),
  });
}

const categories = order.map((title, index) => {
  const items = byCat.get(title);
  const search = [title, ...items.map((it) => it._search)].join(' ').trim();
  return {
    index,
    title,
    search,
    items: items.map(({ _search, ...keep }) => keep),
  };
});

const banner = '// Auto-generated from azkar.csv by scripts/gen-azkar.mjs. Do not edit manually.\n\n';
const types =
  'export interface DhikrItem {\n' +
  '  dhikr: string;\n  description: string;\n  count: number;\n  reference: string;\n}\n\n' +
  'export interface AdhkarCategory {\n' +
  '  index: number;\n  title: string;\n  search: string;\n  items: DhikrItem[];\n}\n\n';
const data = 'export const azkarCategories: AdhkarCategory[] = ' + JSON.stringify(categories, null, 2) + ';\n\n';
const derived =
  'const byTitle = (t: string): DhikrItem[] =>\n' +
  '  azkarCategories.find((c) => c.title === t)?.items ?? [];\n\n' +
  `export const morningAdhkar: DhikrItem[] = byTitle(${JSON.stringify(MORNING_TITLE)});\n` +
  `export const eveningAdhkar: DhikrItem[] = byTitle(${JSON.stringify(EVENING_TITLE)});\n`;

writeFileSync(OUT, banner + types + data + derived, 'utf8');
console.log(`Wrote ${categories.length} categories to ${OUT}`);
```

- [ ] **Step 2: Run the generator**

Run: `node scripts/gen-azkar.mjs`
Expected: `Wrote 135 categories to .../src/domain/azkarData.ts`

- [ ] **Step 3: Write the data sanity test**

Create `__tests__/domain/azkarData.test.ts`:

```ts
import { azkarCategories, morningAdhkar, eveningAdhkar } from '@/domain/azkarData';

describe('azkarData (generated)', () => {
  it('has all categories in order with stable indices', () => {
    expect(azkarCategories.length).toBeGreaterThan(100);
    azkarCategories.forEach((c, i) => expect(c.index).toBe(i));
  });

  it('every dhikr count is a positive number', () => {
    for (const c of azkarCategories) {
      for (const it of c.items) {
        expect(typeof it.count).toBe('number');
        expect(it.count).toBeGreaterThan(0);
      }
    }
  });

  it('derives morning/evening from their categories', () => {
    const morning = azkarCategories.find((c) => c.title === 'أذكار الصباح');
    const evening = azkarCategories.find((c) => c.title === 'أذكار المساء');
    expect(morningAdhkar).toEqual(morning?.items);
    expect(eveningAdhkar).toEqual(evening?.items);
    expect(morningAdhkar.length).toBeGreaterThan(0);
    expect(eveningAdhkar.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: Run the test**

Run: `npm test -- azkarData`
Expected: PASS (3 tests).

- [ ] **Step 5: Verify scorecard data did not regress**

The existing `AdhkarModal` consumes `morningAdhkar`/`eveningAdhkar`. Confirm the regenerated arrays still drive the existing adhkar tests.

Run: `npm test -- DeedRow` and `npx tsc --noEmit`
Expected: existing suites PASS, 0 type errors. If morning/evening content shifted vs the previously-committed file, inspect `git diff src/domain/azkarData.ts` — the morning/evening *items* should be unchanged in meaning (only formatting/new categories added). Reconcile any genuine content drift before continuing.

- [ ] **Step 6: Commit**

```bash
git add scripts/gen-azkar.mjs src/domain/azkarData.ts __tests__/domain/azkarData.test.ts
git commit -m "feat: generate full azkar dataset from azkar.csv

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Extract Shared `AdhkarList`

**Files:**
- Create: `src/features/adhkar/components/AdhkarList.tsx`
- Modify: `src/features/adhkar/components/AdhkarModal.tsx`
- Test: `__tests__/ui/AdhkarList.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/ui/AdhkarList.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AdhkarList } from '@/features/adhkar/components/AdhkarList';
import { DhikrItem } from '@/domain/azkarData';

const items: DhikrItem[] = [
  { dhikr: 'سبحان الله', description: '', count: 3, reference: 'مسلم' },
  { dhikr: 'الحمد لله', description: '', count: 1, reference: '' },
];

describe('AdhkarList', () => {
  it('calls onIncrement with next value when a card is pressed', () => {
    const onIncrement = jest.fn();
    const { getByTestId } = render(
      <AdhkarList items={items} counts={[0, 0]} onIncrement={onIncrement} onResetItem={jest.fn()} />
    );
    fireEvent.press(getByTestId('dhikr-card-0'));
    expect(onIncrement).toHaveBeenCalledWith(0, 1);
  });

  it('shows completed count in the summary', () => {
    const { getByText } = render(
      <AdhkarList items={items} counts={[3, 1]} onIncrement={jest.fn()} onResetItem={jest.fn()} />
    );
    // both items complete → 2 / 2
    expect(getByText(/‎.*2.*\/.*2/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- AdhkarList`
Expected: FAIL — cannot find module `AdhkarList`.

- [ ] **Step 3: Implement `AdhkarList`**

Create `src/features/adhkar/components/AdhkarList.tsx` (logic lifted verbatim from `AdhkarModal`'s summary + ScrollView):

```tsx
import React from 'react';
import { View, Text, ScrollView, I18nManager } from 'react-native';
import { useTheme } from '@/ui/theme';
import { toArabicNumeral } from '@/i18n/format';
import { DhikrItem } from '@/domain/azkarData';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { DhikrCard } from '@/features/adhkar/components/DhikrCard';

export interface AdhkarListProps {
  items: DhikrItem[];
  counts: number[];
  onIncrement: (index: number, nextVal: number) => void;
  onResetItem: (index: number) => void;
  bottomInset?: number;
}

export function AdhkarList({ items, counts, onIncrement, onResetItem, bottomInset = 40 }: AdhkarListProps) {
  const theme = useTheme();
  const total = items.length;
  const completedCount = items.filter((it, i) => (counts[i] ?? 0) >= it.count).length;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ marginHorizontal: 16, marginTop: 10, marginBottom: 14 }}>
        <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ color: theme.colors.muted, fontFamily: theme.font, fontSize: 13, lineHeight: 22 }}>
            الأذكار المنجزة
          </Text>
          <Text style={{ color: theme.colors.text, fontFamily: theme.fontBold, fontSize: 15, lineHeight: 22 }}>
            {`‎${toArabicNumeral(completedCount)} / ${toArabicNumeral(total)} (${toArabicNumeral(percentage)}%)`}
          </Text>
        </View>
        <ProgressBar value={completedCount} total={total} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset }}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item, index) => (
          <DhikrCard
            key={index}
            item={item}
            index={index}
            currentCount={counts[index] ?? 0}
            onIncrement={onIncrement}
            onResetItem={onResetItem}
          />
        ))}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- AdhkarList`
Expected: PASS (2 tests).

- [ ] **Step 5: Refactor `AdhkarModal` to use `AdhkarList`**

In `src/features/adhkar/components/AdhkarModal.tsx`:
1. Add import: `import { AdhkarList } from '@/features/adhkar/components/AdhkarList';`
2. Remove the now-unused imports `toArabicNumeral`, `ProgressBar`, `DhikrCard` (keep `ScreenHeader`, `Ionicons`, etc.).
3. Replace the entire summary `View` (the block at lines ~124-136) **and** the cards `ScrollView` (lines ~138-156) with a single:

```tsx
<AdhkarList
  items={activeAdhkar}
  counts={progress}
  onIncrement={updateProgress}
  onResetItem={(idx) => updateProgress(idx, 0)}
  bottomInset={100}
/>
```

Leave everything else (MMKV load/save in `updateProgress`, the `resetAll` header button, the auto-complete `useEffect`, the bottom "إتمام العبادة وتسجيلها" button) unchanged. The `completedCount`/`completionPercentage` locals in the modal are no longer needed — delete them.

- [ ] **Step 6: Verify no regression**

Run: `npm test -- AdhkarList DeedRow` and `npx tsc --noEmit`
Expected: PASS, 0 type errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/adhkar/components/AdhkarList.tsx src/features/adhkar/components/AdhkarModal.tsx __tests__/ui/AdhkarList.test.tsx
git commit -m "refactor: extract shared AdhkarList from AdhkarModal

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Azkar Reader Screen (`azkar/[index].tsx`)

**Files:**
- Create: `src/app/azkar/[index].tsx`

- [ ] **Step 1: Implement the reader screen**

Ephemeral counting via local state; resolves the category by route param `index`. Reuses `ScreenHeader` and `AdhkarList`.

```tsx
import { useState, useMemo } from 'react';
import { View, Text, Pressable, I18nManager } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/ui/theme';
import { azkarCategories } from '@/domain/azkarData';
import { ScreenHeader } from '@/shared/components/ScreenHeader';
import { AdhkarList } from '@/features/adhkar/components/AdhkarList';

export default function AzkarReaderScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ index: string }>();
  const idx = Number.parseInt(String(params.index), 10);
  const category = Number.isInteger(idx) ? azkarCategories[idx] : undefined;

  const initialCounts = useMemo(
    () => (category ? new Array(category.items.length).fill(0) : []),
    [category]
  );
  const [counts, setCounts] = useState<number[]>(initialCounts);

  const updateCount = (index: number, nextVal: number) =>
    setCounts((prev) => {
      const next = [...prev];
      next[index] = nextVal;
      return next;
    });

  const resetAll = () => setCounts(new Array(category?.items.length ?? 0).fill(0));

  if (!category) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: 40 }}>
        <ScreenHeader
          title="حصن المسلم"
          leftAction={
            <Pressable hitSlop={8} onPress={() => router.back()}>
              <Ionicons name="close" size={26} color={theme.colors.muted} />
            </Pressable>
          }
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.muted, fontFamily: theme.font }}>لم يتم العثور على هذا القسم.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: 40 }}>
      <ScreenHeader
        title={category.title}
        leftAction={
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <Ionicons name="close" size={26} color={theme.colors.muted} />
          </Pressable>
        }
        rightAction={
          <Pressable
            onPress={resetAll}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 8,
              backgroundColor: theme.colors.translucentBgActive,
            }}
            hitSlop={8}
          >
            <Ionicons name="refresh-outline" size={16} color={theme.colors.muted} />
            <Text style={{ color: theme.colors.muted, fontFamily: theme.font, fontSize: 12 }}>تصفير الكل</Text>
          </Pressable>
        }
      />
      <AdhkarList
        items={category.items}
        counts={counts}
        onIncrement={updateCount}
        onResetItem={(i) => updateCount(i, 0)}
        bottomInset={40}
      />
    </View>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: 0 errors. (Screen is exercised through Task 4 navigation; no separate unit test needed — its logic is local state delegating to the already-tested `AdhkarList`.)

- [ ] **Step 3: Commit**

```bash
git add src/app/azkar/\[index\].tsx
git commit -m "feat: add azkar reader screen with ephemeral counting

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Azkar Category List Screen (`azkar/index.tsx`)

**Files:**
- Create: `src/app/azkar/index.tsx`

- [ ] **Step 1: Implement the category list**

Pinned favorites block (`المفضلة`) + search box + full list in book order. Mirrors `library.tsx` header/search styling.

```tsx
import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, I18nManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeType, rtlRow } from '@/ui/theme';
import { azkarCategories, AdhkarCategory } from '@/domain/azkarData';
import { toArabicNumeral } from '@/i18n/format';

const FAVORITE_TITLES = [
  'أذكار الصباح',
  'أذكار المساء',
  'أذكار النوم',
  'الأذكار بعد السلام من الصلاة',
  'أذكار الاستيقاظ من النوم',
];

export default function AzkarLibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [searchQuery, setSearchQuery] = useState('');

  const favorites = useMemo(
    () =>
      FAVORITE_TITLES
        .map((t) => azkarCategories.find((c) => c.title === t))
        .filter((c): c is AdhkarCategory => Boolean(c)),
    []
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return azkarCategories;
    return azkarCategories.filter(
      (c) => c.title.includes(q) || c.search.includes(q)
    );
  }, [searchQuery]);

  const open = (category: AdhkarCategory) =>
    router.push({ pathname: '/azkar/[index]', params: { index: String(category.index) } });

  const Row = ({ category }: { category: AdhkarCategory }) => (
    <Pressable style={styles.row} onPress={() => open(category)}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{category.title}</Text>
        <Text style={styles.rowCount}>{toArabicNumeral(category.items.length)}</Text>
      </View>
      <Ionicons name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.colors.placeholderText} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeText}>تم</Text>
        </Pressable>
        <Text style={styles.title}>حصن المسلم</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.placeholderText} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن ذكر أو دعاء..."
          placeholderTextColor={theme.colors.placeholderText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.colors.placeholderText} />
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {searchQuery.trim().length === 0 && favorites.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>المفضلة</Text>
            <View style={styles.card}>
              {favorites.map((c) => <Row key={`fav-${c.index}`} category={c} />)}
            </View>
          </View>
        )}

        <View style={styles.section}>
          {searchQuery.trim().length === 0 && <Text style={styles.sectionTitle}>كل الأذكار والأدعية</Text>}
          <View style={styles.card}>
            {filtered.map((c) => <Row key={c.index} category={c} />)}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(theme: ThemeType) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      flexDirection: rtlRow,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.translucentBorder,
    },
    closeButton: { padding: 8 },
    closeText: { color: theme.colors.primary, fontSize: 16, fontFamily: theme.font },
    title: { fontSize: 18, color: theme.colors.text, fontFamily: theme.fontBold },
    searchContainer: {
      flexDirection: rtlRow,
      alignItems: 'center',
      backgroundColor: theme.colors.translucentBg,
      margin: 20,
      paddingHorizontal: 16,
      borderRadius: 12,
      height: 48,
    },
    searchInput: {
      flex: 1,
      color: theme.colors.text,
      fontFamily: theme.font,
      fontSize: 15,
      marginHorizontal: 10,
      textAlign: I18nManager.isRTL ? 'right' : 'left',
    },
    content: { flex: 1 },
    section: { marginHorizontal: 20, marginBottom: 24 },
    sectionTitle: {
      fontSize: 16,
      color: theme.colors.primary,
      fontFamily: theme.fontBold,
      marginBottom: 10,
      marginHorizontal: 4,
      textAlign: I18nManager.isRTL ? 'left' : 'right',
    },
    card: {
      backgroundColor: theme.colors.translucentBg,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.translucentBorder,
    },
    row: {
      flexDirection: rtlRow,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.translucentBorder,
    },
    rowText: { flexDirection: rtlRow, alignItems: 'center', gap: 10, flex: 1 },
    rowTitle: { fontSize: 15, color: theme.colors.text, fontFamily: theme.font },
    rowCount: { fontSize: 12, color: theme.colors.placeholderText, fontFamily: theme.font },
  });
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/azkar/index.tsx
git commit -m "feat: add حصن المسلم category list with favorites and search

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Drawer Entry & i18n

**Files:**
- Modify: `src/i18n/ar.ts:14`
- Modify: `src/ui/components/Drawer.tsx`

- [ ] **Step 1: Add the i18n string**

In `src/i18n/ar.ts`, update the `drawer` line to add `azkar`:

```ts
  drawer: { stats: 'الإحصائيات', settings: 'تعديل الجدول والعبادات', account: 'الحساب', azkar: 'حصن المسلم', version: 'الإصدار ' },
```

- [ ] **Step 2: Add the drawer menu item**

In `src/ui/components/Drawer.tsx`, inside `<View style={styles.menu}>`, add this Pressable **above** the Settings item (the block currently rendering `ar.drawer.settings`):

```tsx
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                onClose();
                setTimeout(() => router.push('/azkar'), 100);
              }}
            >
              <Text style={styles.menuItemText}>{ar.drawer.azkar}</Text>
            </Pressable>
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/ar.ts src/ui/components/Drawer.tsx
git commit -m "feat: add حصن المسلم entry to side drawer

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Final Verification

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: all suites green (previous count + 5 new tests from Tasks 1–2).

- [ ] **Step 3: Manual smoke (optional, via the `verify`/`run` skill)**

Open the drawer → tap "حصن المسلم" → confirm favorites block + full searchable list → open a category → tap cards to count → "تصفير الكل" resets → back navigates to the list. Confirm the day screen score is **unchanged** (library counting must not touch the scorecard).

- [ ] **Step 4: Update progress docs**

Add an iteration entry to `docs/PROGRESS.md` summarizing the حصن المسلم library, then commit:

```bash
git add docs/PROGRESS.md
git commit -m "docs: record حصن المسلم azkar library iteration

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** routing (T3/T4), generator + data shape + backward-compat (T1), `AdhkarList` extraction + modal refactor (T2), ephemeral reader (T3), drawer + i18n + favorites (T4/T5), edge cases — blank count (T1 generator), invalid route index (T3 guard), missing favorite title (T4 `.filter(Boolean)`), multiline CSV (T1 parser). All covered.
- **Type consistency:** `DhikrItem`, `AdhkarCategory`, `azkarCategories`, `morningAdhkar`, `eveningAdhkar` (T1) are consumed with identical names in T2–T4. `AdhkarList` prop names (`items`, `counts`, `onIncrement`, `onResetItem`, `bottomInset`) match across T2/T3. Route param `index` consistent between T4 push and T3 read.
- **Placeholders:** none — every code step is complete.
</content>
</invoke>
