import { db } from './client';
import { deedDefinitions, sections, deeds, dhikrs } from './schema';
import { sql } from 'drizzle-orm';

/**
 * Seeds the database with default definitions, scorecard sections, deeds, and dhikrs
 * if they are not already populated.
 */
export async function seedDatabase() {
  // 1. Check if seeded already
  const existingDefs = await db.select({ count: sql`count(*)` }).from(deedDefinitions);
  const count = (existingDefs[0] as any)?.count ?? 0;
  if (count > 0) {
    console.log('[Seed] Database already seeded, skipping.');
    return;
  }

  console.log('[Seed] Seeding default database data...');

  // 2. Insert Deed Definitions
  const definitions = [
    { id: 'fajr', name: 'الفجر', type: 'boolean', defaultSchedule: 'daily' },
    { id: 'dhuhr', name: 'الظهر', type: 'boolean', defaultSchedule: 'daily' },
    { id: 'asr', name: 'العصر', type: 'boolean', defaultSchedule: 'daily' },
    { id: 'maghrib', name: 'المغرب', type: 'boolean', defaultSchedule: 'daily' },
    { id: 'isha', name: 'العشاء', type: 'boolean', defaultSchedule: 'daily' },
    { id: 'sunnah_fajr', name: 'سنة الفجر', type: 'boolean', defaultSchedule: 'daily' },
    { id: 'witr', name: 'الوتر', type: 'boolean', defaultSchedule: 'daily' },
    { id: 'duha', name: 'الضحى', type: 'boolean', defaultSchedule: 'daily' },
    { id: 'quran_reading', name: 'ورد التلاوة', type: 'measured', defaultSchedule: 'daily' },
    { id: 'adhkar_morning', name: 'أذكار الصباح', type: 'boolean', defaultSchedule: 'daily' },
    { id: 'adhkar_evening', name: 'أذكار المساء', type: 'boolean', defaultSchedule: 'daily' },
  ];

  for (const def of definitions) {
    await db.insert(deedDefinitions).values(def);
  }

  // 3. Insert Default Sections (local-only initially, user_id is null)
  const defaultSections = [
    { id: 'sec_prayers', name: 'الصلوات المفروضة', sortOrder: 1, updatedAt: Date.now() },
    { id: 'sec_sunnah', name: 'السنن والرواتب', sortOrder: 2, updatedAt: Date.now() },
    { id: 'sec_quran', name: 'القرآن الكريم', sortOrder: 3, updatedAt: Date.now() },
    { id: 'sec_adhkar', name: 'الأذكار', sortOrder: 4, updatedAt: Date.now() },
  ];

  for (const sec of defaultSections) {
    await db.insert(sections).values(sec);
  }

  // 4. Insert Default Dhikrs (Counters)
  const defaultDhikrs = [
    { id: 'dhikr_istighfar', name: 'استغفار', sortOrder: 1, target: 100, createdAt: '2026-06-12', updatedAt: Date.now() },
    { id: 'dhikr_tasbih', name: 'سبحان الله وبحمده', sortOrder: 2, target: 100, createdAt: '2026-06-12', updatedAt: Date.now() },
    { id: 'dhikr_salawat', name: 'الصلاة على النبي', sortOrder: 3, target: 100, createdAt: '2026-06-12', updatedAt: Date.now() },
    { id: 'dhikr_tahlil', name: 'لا إله إلا الله', sortOrder: 4, target: 100, createdAt: '2026-06-12', updatedAt: Date.now() },
  ];

  for (const dk of defaultDhikrs) {
    await db.insert(dhikrs).values(dk);
  }

  // 5. Insert Default Deeds
  const todayStr = new Date().toISOString().split('T')[0]; // local YYYY-MM-DD
  const defaultDeeds = [
    // Prayers Section
    { id: 'deed_fajr', definitionId: 'fajr', sectionId: 'sec_prayers', name: 'الفجر', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 1, updatedAt: Date.now() },
    { id: 'deed_dhuhr', definitionId: 'dhuhr', sectionId: 'sec_prayers', name: 'الظهر', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 2, updatedAt: Date.now() },
    { id: 'deed_asr', definitionId: 'asr', sectionId: 'sec_prayers', name: 'العصر', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 3, updatedAt: Date.now() },
    { id: 'deed_maghrib', definitionId: 'maghrib', sectionId: 'sec_prayers', name: 'المغرب', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 4, updatedAt: Date.now() },
    { id: 'deed_isha', definitionId: 'isha', sectionId: 'sec_prayers', name: 'العشاء', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 5, updatedAt: Date.now() },

    // Sunnah Section
    { id: 'deed_sunnah_fajr', definitionId: 'sunnah_fajr', sectionId: 'sec_sunnah', name: 'سنة الفجر', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 1, updatedAt: Date.now() },
    { id: 'deed_duha', definitionId: 'duha', sectionId: 'sec_sunnah', name: 'الضحى', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 2, updatedAt: Date.now() },
    { id: 'deed_witr', definitionId: 'witr', sectionId: 'sec_sunnah', name: 'الوتر', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 3, updatedAt: Date.now() },

    // Quran Section
    { id: 'deed_quran', definitionId: 'quran_reading', sectionId: 'sec_quran', name: 'ورد التلاوة', type: 'measured', schedule: 'daily', createdAt: todayStr, sortOrder: 1, target: 10, updatedAt: Date.now() },

    // Adhkar Section
    { id: 'deed_adhkar_morning', definitionId: 'adhkar_morning', sectionId: 'sec_adhkar', name: 'أذكار الصباح', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 1, updatedAt: Date.now() },
    { id: 'deed_adhkar_evening', definitionId: 'adhkar_evening', sectionId: 'sec_adhkar', name: 'أذكار المساء', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 2, updatedAt: Date.now() },
    
    // Linked counter deed (Istighfar task auto-completed by Istighfar counter!)
    { id: 'deed_istighfar_100', definitionId: null, sectionId: 'sec_adhkar', name: 'الاستغفار (١٠٠ مرة)', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 3, linkedDhikrId: 'dhikr_istighfar', target: 100, updatedAt: Date.now() },
  ];

  for (const deed of defaultDeeds) {
    await db.insert(deeds).values(deed);
  }

  console.log('[Seed] Database seeding completed successfully.');
}
