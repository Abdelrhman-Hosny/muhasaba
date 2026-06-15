// Pure data assertions on the seed catalog. Mock native/db deps so importing
// seed.ts doesn't pull in expo-sqlite / expo-crypto.
jest.mock('@/db/client', () => ({ db: {} }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'test-uuid' }));

import { DEFAULT_DEED_DEFINITIONS } from '@/db/seed';

const byBundle = (bundleId: string) =>
  DEFAULT_DEED_DEFINITIONS.filter((d) => d.bundleId === bundleId);

describe('أذكار الصلاة per-prayer bundles', () => {
  const PRAYER_SECTIONS = ['sec_morning', 'sec_dhuhr', 'sec_asr', 'sec_maghrib', 'sec_isha_night'];

  it.each([
    ['bundle_adhan', 'ترديد الأذان'],
    ['bundle_dua_adhanain', 'الدعاء بين الأذانين'],
    ['bundle_takbeer', 'تكبيرة الإحرام'],
    ['bundle_adhkar_baad', 'الأذكار عقب الصلاة'],
  ])('%s has one boolean definition per prayer section', (bundleId, baseName) => {
    const defs = byBundle(bundleId);
    expect(defs).toHaveLength(5);
    expect(defs.map((d) => d.defaultSectionId).sort()).toEqual([...PRAYER_SECTIONS].sort());
    for (const d of defs) {
      expect(d.type).toBe('boolean');
      expect(d.name).toContain(baseName);
    }
  });

  it('drops the old single adhkar-salah definitions and الصلاة على النبي', () => {
    const removed = [
      'adhkar_salah_adhan',
      'adhkar_salah_between',
      'adhkar_salah_after',
      'adhkar_salah_takbeer',
      'adhkar_salah_salawat',
    ];
    const ids = new Set(DEFAULT_DEED_DEFINITIONS.map((d) => d.id));
    for (const id of removed) {
      expect(ids.has(id)).toBe(false);
    }
    expect(byBundle('bundle_adhkar_salah')).toHaveLength(0);
  });

  it('keeps صلاة الجماعة as a 5-prayer bundle', () => {
    expect(byBundle('bundle_jamaah')).toHaveLength(5);
  });
});
