import { azkarCategories, morningAdhkar, eveningAdhkar } from '@/domain/azkarData';

describe('azkarData (generated)', () => {
  it('has all categories in order with stable indices', () => {
    expect(azkarCategories.length).toBeGreaterThan(100);
    azkarCategories.forEach((c, i) => expect(c.index).toBe(i));
  });

  it('every dhikr count is a positive number', () => {
    for (const c of azkarCategories) {
      for (const it of c.items) {
        expect(typeof it.count).toBe('number');
        expect(it.count).toBeGreaterThan(0);
      }
    }
  });

  it('derives morning/evening from their categories', () => {
    const morning = azkarCategories.find((c) => c.title === 'أذكار الصباح');
    const evening = azkarCategories.find((c) => c.title === 'أذكار المساء');
    expect(morningAdhkar).toEqual(morning?.items);
    expect(eveningAdhkar).toEqual(evening?.items);
    expect(morningAdhkar.length).toBeGreaterThan(0);
    expect(eveningAdhkar.length).toBeGreaterThan(0);
  });

  it('has no stray carriage returns in dhikr text', () => {
    for (const c of azkarCategories) {
      for (const it of c.items) {
        expect(it.dhikr).not.toMatch(/\r/);
      }
    }
  });
});
