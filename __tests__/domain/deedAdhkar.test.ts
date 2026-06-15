import { getDeedAdhkar, hasDeedAdhkar } from '@/domain/deedAdhkar';

describe('deed → حصن المسلم linking', () => {
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  it('links every per-prayer ترديد الأذان deed to real azkar content', () => {
    for (const p of prayers) {
      const id = `adhan_${p}`;
      expect(hasDeedAdhkar(id)).toBe(true);
      expect((getDeedAdhkar(id) ?? []).length).toBeGreaterThan(0);
    }
  });

  it('links every per-prayer الأذكار عقب الصلاة deed to real azkar content', () => {
    for (const p of prayers) {
      const id = `adhkar_baad_${p}`;
      expect(hasDeedAdhkar(id)).toBe(true);
      expect((getDeedAdhkar(id) ?? []).length).toBeGreaterThan(0);
    }
  });

  it('does not link الدعاء بين الأذانين (no fixed text)', () => {
    for (const p of prayers) {
      expect(hasDeedAdhkar(`dua_adhanain_${p}`)).toBe(false);
    }
  });
});
