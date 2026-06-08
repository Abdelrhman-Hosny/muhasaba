import { Habit, isHabitComplete, nextBooleanValue } from '@/domain/habits';

const boolHabit: Habit = { id: '1', name: 'قراءة القرآن', icon: 'book', type: 'boolean', target: null, sort_order: 0, active: true };
const countHabit: Habit = { id: '2', name: 'صلاة الضحى', icon: 'sun', type: 'count', target: 2, sort_order: 1, active: true };

describe('habits', () => {
  it('boolean habit is complete when value >= 1', () => {
    expect(isHabitComplete(boolHabit, 0)).toBe(false);
    expect(isHabitComplete(boolHabit, 1)).toBe(true);
  });
  it('count habit is complete when value reaches target', () => {
    expect(isHabitComplete(countHabit, 1)).toBe(false);
    expect(isHabitComplete(countHabit, 2)).toBe(true);
    expect(isHabitComplete(countHabit, 3)).toBe(true);
  });
  it('toggles a boolean value', () => {
    expect(nextBooleanValue(0)).toBe(1);
    expect(nextBooleanValue(1)).toBe(0);
  });
});
