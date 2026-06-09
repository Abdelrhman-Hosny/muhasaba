import { isEditableDate, editableDates } from '@/domain/dates';

describe('editable window', () => {
  const today = '2026-06-09';

  test('today is editable', () => {
    expect(isEditableDate('2026-06-09', today, 7)).toBe(true);
  });
  test('a date within the window is editable', () => {
    expect(isEditableDate('2026-06-03', today, 7)).toBe(true);
  });
  test('the oldest allowed day is editable', () => {
    expect(isEditableDate('2026-06-02', today, 7)).toBe(true);
  });
  test('a date older than the window is not editable', () => {
    expect(isEditableDate('2026-06-01', today, 7)).toBe(false);
  });
  test('a future date is not editable', () => {
    expect(isEditableDate('2026-06-10', today, 7)).toBe(false);
  });
  test('editableDates lists today first, oldest last, length daysBack+1', () => {
    const days = editableDates(today, 7);
    expect(days).toHaveLength(8);
    expect(days[0]).toBe('2026-06-09');
    expect(days[7]).toBe('2026-06-02');
  });
});
