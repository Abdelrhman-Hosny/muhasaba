import { Habit, isHabitComplete } from './habits';
import { Prayer, PrayerStatus, PRAYERS } from './prayers';

export interface DaySummaryInput {
  date: string;
  prayerStatuses: Record<Prayer, PrayerStatus>;
  habitValues: Record<string, number>;
  habits: Habit[];
}

export interface DaySummary {
  date: string;
  prayersPrayed: number;
  prayersTotal: number;
  habitsComplete: number;
  habitsTotal: number;
}

const PRAYED: PrayerStatus[] = ['on_time', 'late'];

export function summarizeDay(input: DaySummaryInput): DaySummary {
  const prayersPrayed = PRAYERS.filter((p) =>
    PRAYED.includes(input.prayerStatuses[p] ?? 'not_yet'),
  ).length;

  const activeHabits = input.habits.filter((h) => h.active);
  const habitsComplete = activeHabits.filter((h) =>
    isHabitComplete(h, input.habitValues[h.id] ?? 0),
  ).length;

  return {
    date: input.date,
    prayersPrayed,
    prayersTotal: PRAYERS.length,
    habitsComplete,
    habitsTotal: activeHabits.length,
  };
}
