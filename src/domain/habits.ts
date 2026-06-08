export type HabitType = 'boolean' | 'count';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  type: HabitType;
  target: number | null;
  sort_order: number;
  active: boolean;
}

/** Is today's habit value enough to count as complete? */
export function isHabitComplete(habit: Habit, value: number): boolean {
  if (habit.type === 'boolean') return value >= 1;
  return value >= (habit.target ?? 1);
}

/** Toggle a boolean habit's stored value. */
export function nextBooleanValue(value: number): number {
  return value >= 1 ? 0 : 1;
}
