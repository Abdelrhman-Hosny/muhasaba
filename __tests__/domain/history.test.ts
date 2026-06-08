import { summarizeDay } from '@/domain/history';
import { Habit } from '@/domain/habits';

const habits: Habit[] = [
  { id: 'h1', name: 'قرآن', icon: 'book', type: 'boolean', target: null, sort_order: 0, active: true },
  { id: 'h2', name: 'ضحى', icon: 'sun', type: 'count', target: 2, sort_order: 1, active: true },
];

describe('summarizeDay', () => {
  it('counts prayers prayed (on_time or late) and habits complete', () => {
    const summary = summarizeDay({
      date: '2026-06-08',
      prayerStatuses: { fajr: 'on_time', dhuhr: 'late', asr: 'missed', maghrib: 'not_yet', isha: 'on_time' },
      habitValues: { h1: 1, h2: 1 },
      habits,
    });
    expect(summary.prayersPrayed).toBe(3);
    expect(summary.prayersTotal).toBe(5);
    expect(summary.habitsComplete).toBe(1);
    expect(summary.habitsTotal).toBe(2);
  });
});
