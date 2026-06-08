import { toLocalDateKey, todayKey } from '@/domain/dates';

describe('dates', () => {
  it('formats a Date as a local YYYY-MM-DD key', () => {
    const d = new Date(2026, 5, 8, 9, 0, 0);
    expect(toLocalDateKey(d)).toBe('2026-06-08');
  });
  it('pads single-digit month and day', () => {
    const d = new Date(2026, 0, 3, 0, 0, 0);
    expect(toLocalDateKey(d)).toBe('2026-01-03');
  });
  it('todayKey returns a valid key shape', () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
