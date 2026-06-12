import { db } from './client';
import { deedDefinitions, sections, deeds, dhikrs } from './schema';
import { sql, eq } from 'drizzle-orm';

/**
 * Seeds the database with default definitions, scorecard sections, deeds, and dhikrs
 * if they are not already populated.
 */
export async function seedDatabase() {
  // Developer-friendly check: If old section 'sec_prayers' exists, clear to re-seed the new time-of-day layout
  const oldSection = await db.select().from(sections).where(eq(sections.id, 'sec_prayers')).limit(1);
  if (oldSection.length > 0) {
    console.log('[Seed] Old seed layout detected. Clearing database to re-seed with time-of-day layout...');
    await db.delete(deeds);
    await db.delete(sections);
    await db.delete(dhikrs);
    await db.delete(deedDefinitions);
  }

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

  // 3. Insert Time of Day Sections (local-only initially, user_id is null)
  const defaultSections = [
    { id: 'sec_morning', name: 'الصبح', sortOrder: 1, updatedAt: Date.now() },
    { id: 'sec_dhuhr', name: 'الظهر', sortOrder: 2, updatedAt: Date.now() },
    { id: 'sec_asr', name: 'العصر', sortOrder: 3, updatedAt: Date.now() },
    { id: 'sec_maghrib', name: 'المغرب', sortOrder: 4, updatedAt: Date.now() },
    { id: 'sec_isha_night', name: 'العشاء والليل', sortOrder: 5, updatedAt: Date.now() },
    { id: 'sec_quran', name: 'القرآن الكريم', sortOrder: 6, updatedAt: Date.now() },
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
    // Morning Section (الصبح)
    { id: 'deed_fajr', definitionId: 'fajr', sectionId: 'sec_morning', name: 'صلاة الفجر', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 1, updatedAt: Date.now() },
    { id: 'deed_sunnah_fajr', definitionId: 'sunnah_fajr', sectionId: 'sec_morning', name: 'سنة الفجر', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 2, updatedAt: Date.now() },
    { id: 'deed_adhkar_morning', definitionId: 'adhkar_morning', sectionId: 'sec_morning', name: 'أذكار الصباح', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 3, updatedAt: Date.now() },
    { id: 'deed_istighfar_100', definitionId: null, sectionId: 'sec_morning', name: 'الاستغفار (100 مرة)', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 4, linkedDhikrId: 'dhikr_istighfar', target: 100, updatedAt: Date.now() },

    // Dhuhr Section (الظهر)
    { id: 'deed_dhuhr', definitionId: 'dhuhr', sectionId: 'sec_dhuhr', name: 'صلاة الظهر', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 1, updatedAt: Date.now() },
    { id: 'deed_duha', definitionId: 'duha', sectionId: 'sec_dhuhr', name: 'صلاة الضحى', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 2, updatedAt: Date.now() },

    // Asr Section (العصر)
    { id: 'deed_asr', definitionId: 'asr', sectionId: 'sec_asr', name: 'صلاة العصر', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 1, updatedAt: Date.now() },

    // Maghrib Section (المغرب)
    { id: 'deed_maghrib', definitionId: 'maghrib', sectionId: 'sec_maghrib', name: 'صلاة المغرب', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 1, updatedAt: Date.now() },
    { id: 'deed_adhkar_evening', definitionId: 'adhkar_evening', sectionId: 'sec_maghrib', name: 'أذكار المساء', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 2, updatedAt: Date.now() },

    // Isha & Night Section (العشاء والليل)
    { id: 'deed_isha', definitionId: 'isha', sectionId: 'sec_isha_night', name: 'صلاة العشاء', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 1, updatedAt: Date.now() },
    { id: 'deed_witr', definitionId: 'witr', sectionId: 'sec_isha_night', name: 'صلاة الوتر', type: 'boolean', schedule: 'daily', createdAt: todayStr, sortOrder: 2, updatedAt: Date.now() },

    // Quran Section (القرآن الكريم)
    { id: 'deed_quran', definitionId: 'quran_reading', sectionId: 'sec_quran', name: 'ورد تلاوة القرآن', type: 'measured', schedule: 'daily', createdAt: todayStr, sortOrder: 1, target: 10, updatedAt: Date.now() },
  ];

  for (const deed of defaultDeeds) {
    await db.insert(deeds).values(deed);
  }

  console.log('[Seed] Database seeding completed successfully.');
}
