import { EDITABLE_DAYS_BACK } from '@/config';
import { editableDates, todayKey, weekdayIndex } from '@/domain/dates';
import { PRAYERS, Prayer, PrayerStatus, isDone } from '@/domain/prayers';
import { ar } from '@/i18n/ar';
import { toArabicNumeral } from '@/i18n/format';
import { setStatus, useDatesDoneCount, useDay } from '@/state/prayerStore';
import { PrayerRow } from '@/ui/components/PrayerRow';
import { theme } from '@/ui/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function dayLabel(date: string, today: string): { top: string; sub: string } {
  const dd = date.slice(8); // DD
  const days = editableDates(today, EDITABLE_DAYS_BACK);
  if (date === today) return { top: ar.days.today, sub: dd };
  if (date === days[1]) return { top: ar.days.yesterday, sub: dd };
  return { top: ar.weekdays[weekdayIndex(date)], sub: dd };
}

export default function DayScreen() {
  const insets = useSafeAreaInsets();
  const today = todayKey();
  const dates = editableDates(today, EDITABLE_DAYS_BACK); // today → oldest
  const [selected, setSelected] = useState(today);
  const day = useDay(selected);
  const doneCount = PRAYERS.filter((p) => isDone(day[p])).length;
  const dateCounts = useDatesDoneCount(dates);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      {/* Header: ☰  الدرجة: N/M */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
        <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 20 }}>
          {ar.header.score}: {toArabicNumeral(doneCount)}/{toArabicNumeral(PRAYERS.length)}
        </Text>
        <Pressable hitSlop={8}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.muted} />
        </Pressable>
      </View>

      {/* Day strip: today (right) → oldest (left), RTL */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8 }}
        style={{ maxHeight: 90 }}>
        {dates.map((d) => {
          const active = d === selected;
          const lbl = dayLabel(d, today);
          const count = dateCounts[d] ?? 0;
          const pct = count > 0 ? Math.round((count / PRAYERS.length) * 100) : 0;
          const pctLabel = count > 0 ? `${toArabicNumeral(pct)}٪` : '--';
          return (
            <Pressable key={d} onPress={() => setSelected(d)}
              style={{
                paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center',
                backgroundColor: active ? theme.colors.primary : theme.colors.surface
              }}>
              <Text style={{ fontFamily: theme.font, fontSize: 14, color: active ? '#fff' : theme.colors.text }}>
                {lbl.top}
              </Text>
              <Text style={{ fontFamily: theme.font, fontSize: 11, color: active ? '#dfeee5' : theme.colors.muted }}>
                {lbl.sub}
              </Text>
              <Text style={{ fontFamily: theme.font, fontSize: 13, color: active ? '#dfeee5' : theme.colors.muted, marginTop: 2 }}>
                {pctLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Daily progress summary */}
      <View style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 4 }}>
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <Text style={{ color: theme.colors.muted, fontFamily: theme.font, fontSize: 13 }}>{ar.summary.completed}</Text>
          <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 15 }}>{doneCount} / {PRAYERS.length}</Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.notYet, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${(doneCount / PRAYERS.length) * 100}%`, backgroundColor: theme.colors.primary }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {PRAYERS.map((p: Prayer) => (
          <PrayerRow key={p} prayer={p} status={day[p]}
            onChange={(s: PrayerStatus) => setStatus(selected, p, s)} />
        ))}
      </ScrollView>
    </View>
  );
}
