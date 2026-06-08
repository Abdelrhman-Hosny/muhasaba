import { ScrollView, Text, View, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { use$ } from '@legendapp/state/react';
import { PRAYERS, Prayer, PrayerStatus } from '@/domain/prayers';
import { Habit } from '@/domain/habits';
import { todayKey } from '@/domain/dates';
import { user$ } from '@/state/auth';
import { habits$, habitLogs$, prayerLogs$, habitLogId, prayerLogId } from '@/state/stores';
import { PrayerRow } from '@/ui/components/PrayerRow';
import { HabitRow } from '@/ui/components/HabitRow';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

export default function Today() {
  const date = todayKey();
  const uid = use$(user$)?.id ?? '';
  const habits = Object.values(use$(habits$) ?? {}) as Habit[];
  const habitLogs = use$(habitLogs$) ?? {};
  const prayerLogs = use$(prayerLogs$) ?? {};

  function setPrayer(prayer: Prayer, status: PrayerStatus) {
    const id = prayerLogId(uid, date, prayer);
    prayerLogs$[id].set({ id, user_id: uid, date, prayer, status, deleted: false } as any);
  }
  function setHabit(habit: Habit, value: number) {
    const id = habitLogId(uid, date, habit.id);
    habitLogs$[id].set({ id, user_id: uid, habit_id: habit.id, date, value, deleted: false } as any);
  }

  const activeHabits = habits.filter((h) => h.active).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 24, marginBottom: 12, textAlign: 'right' }}>{ar.tabs.today}</Text>

      {PRAYERS.map((p) => {
        const log = (prayerLogs as any)[prayerLogId(uid, date, p)];
        return <PrayerRow key={p} prayer={p} status={(log?.status as PrayerStatus) ?? 'not_yet'} onChange={(s) => setPrayer(p, s)} />;
      })}

      <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
        <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 20 }}>{ar.habits.title}</Text>
        <Link href="/habits/manage" asChild>
          <Pressable><Text style={{ color: theme.colors.primary, fontFamily: theme.font }}>{ar.habits.manage}</Text></Pressable>
        </Link>
      </View>

      {activeHabits.map((h) => {
        const log = (habitLogs as any)[habitLogId(uid, date, h.id)];
        return <HabitRow key={h.id} habit={h} value={log?.value ?? 0} onChange={(v) => setHabit(h, v)} />;
      })}
    </ScrollView>
  );
}
