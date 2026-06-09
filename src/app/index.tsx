import { useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PRAYERS, Prayer, PrayerStatus, isDone } from '@/domain/prayers';
import { editableDates, todayKey, weekdayIndex } from '@/domain/dates';
import { EDITABLE_DAYS_BACK } from '@/config';
import { useDay, setStatus } from '@/state/prayerStore';
import { PrayerRow } from '@/ui/components/PrayerRow';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

function dayLabel(date: string, today: string): { top: string; sub: string } {
  const dd = date.slice(8); // DD
  const days = editableDates(today, EDITABLE_DAYS_BACK);
  if (date === today) return { top: ar.days.today, sub: dd };
  if (date === days[1]) return { top: ar.days.yesterday, sub: dd };
  return { top: ar.weekdays[weekdayIndex(date)], sub: dd };
}

export default function Prayers() {
  const insets = useSafeAreaInsets();
  const today = todayKey();
  const dates = editableDates(today, EDITABLE_DAYS_BACK); // today → oldest
  const [selected, setSelected] = useState(today);
  const day = useDay(selected);
  const doneCount = PRAYERS.filter((p) => isDone(day[p])).length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
        <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 24 }}>{ar.appName}</Text>
        <Link href="/account" asChild>
          <Pressable hitSlop={8}><Ionicons name="person-circle-outline" size={28} color={theme.colors.muted} /></Pressable>
        </Link>
      </View>

      {/* Day strip: today (right) → oldest (left), RTL */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8 }}
        style={{ maxHeight: 64 }}>
        {dates.map((d) => {
          const active = d === selected;
          const lbl = dayLabel(d, today);
          return (
            <Pressable key={d} onPress={() => setSelected(d)}
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center',
                backgroundColor: active ? theme.colors.primary : theme.colors.surface }}>
              <Text style={{ fontFamily: theme.font, fontSize: 14, color: active ? '#fff' : theme.colors.text }}>
                {lbl.top}
              </Text>
              <Text style={{ fontFamily: theme.font, fontSize: 11, color: active ? '#dfeee5' : theme.colors.muted }}>
                {lbl.sub}
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
