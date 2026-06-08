import { ScrollView, Text, View } from 'react-native';
import { useObs } from '@/state/useObs';
import { Habit } from '@/domain/habits';
import { Prayer, PrayerStatus, PRAYERS } from '@/domain/prayers';
import { summarizeDay } from '@/domain/history';
import { habits$, habitLogs$, prayerLogs$ } from '@/state/stores';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

export default function History() {
  const habits = Object.values(useObs(habits$) ?? {}) as Habit[];
  const habitLogs = Object.values(useObs(habitLogs$) ?? {}) as any[];
  const prayerLogs = Object.values(useObs(prayerLogs$) ?? {}) as any[];

  const dates = Array.from(new Set([
    ...habitLogs.map((l) => l.date),
    ...prayerLogs.map((l) => l.date),
  ])).sort().reverse();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 24, marginBottom: 16, textAlign: 'right' }}>{ar.history.title}</Text>
      {dates.map((date) => {
        const prayerStatuses = {} as Record<Prayer, PrayerStatus>;
        PRAYERS.forEach((p) => {
          const log = prayerLogs.find((l) => l.date === date && l.prayer === p);
          prayerStatuses[p] = (log?.status as PrayerStatus) ?? 'not_yet';
        });
        const habitValues: Record<string, number> = {};
        habitLogs.filter((l) => l.date === date).forEach((l) => { habitValues[l.habit_id] = l.value; });
        const s = summarizeDay({ date, prayerStatuses, habitValues, habits });
        return (
          <View key={date} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between',
            backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 8 }}>
            <Text style={{ color: theme.colors.text, fontFamily: theme.font }}>{date}</Text>
            <Text style={{ color: theme.colors.muted, fontFamily: theme.font }}>
              {ar.history.prayed}: {s.prayersPrayed}/{s.prayersTotal}  ·  {ar.history.habitsDone}: {s.habitsComplete}/{s.habitsTotal}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
