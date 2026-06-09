import { useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PRAYERS, Prayer, PrayerStatus } from '@/domain/prayers';
import { editableDates, todayKey } from '@/domain/dates';
import { EDITABLE_DAYS_BACK } from '@/config';
import { useDay, setStatus } from '@/state/prayerStore';
import { PrayerRow } from '@/ui/components/PrayerRow';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

function dayLabel(date: string, today: string): string {
  if (date === today) return ar.days.today;
  const days = editableDates(today, EDITABLE_DAYS_BACK);
  if (date === days[1]) return ar.days.yesterday;
  return date.slice(5); // MM-DD
}

export default function Prayers() {
  const today = todayKey();
  const dates = editableDates(today, EDITABLE_DAYS_BACK); // today → oldest
  const [selected, setSelected] = useState(today);
  const day = useDay(selected);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
        <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 24 }}>{ar.appName}</Text>
        <Link href="/account" asChild>
          <Pressable hitSlop={8}><Ionicons name="person-circle-outline" size={28} color={theme.colors.muted} /></Pressable>
        </Link>
      </View>

      {/* Day strip: today (right) → oldest (left), RTL */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row-reverse', paddingHorizontal: 16, gap: 8 }}
        style={{ maxHeight: 56 }}>
        {dates.map((d) => {
          const active = d === selected;
          return (
            <Pressable key={d} onPress={() => setSelected(d)}
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
                backgroundColor: active ? theme.colors.primary : theme.colors.surface }}>
              <Text style={{ fontFamily: theme.font, color: active ? '#fff' : theme.colors.muted }}>
                {dayLabel(d, today)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {PRAYERS.map((p: Prayer) => (
          <PrayerRow key={p} prayer={p} status={day[p]}
            onChange={(s: PrayerStatus) => setStatus(selected, p, s)} />
        ))}
      </ScrollView>
    </View>
  );
}
