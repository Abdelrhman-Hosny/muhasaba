import { db } from './client';
import { deedDefinitions, sections, deeds, dhikrs } from './schema';
import { sql, eq, inArray, and, isNull } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { buildDefaultUserData } from './defaultData';

/** The five daily prayers, with their time-of-day section and Arabic label. */
const PRAYER_SLOTS = [
  { key: 'fajr', section: 'sec_morning', label: 'الفجر' },
  { key: 'dhuhr', section: 'sec_dhuhr', label: 'الظهر' },
  { key: 'asr', section: 'sec_asr', label: 'العصر' },
  { key: 'maghrib', section: 'sec_maghrib', label: 'المغرب' },
  { key: 'isha', section: 'sec_isha_night', label: 'العشاء' },
];

/**
 * Builds 5 per-prayer deed definitions for an act repeated each prayer (e.g.
 * ترديد الأذان). They share a bundleId so the library renders them as one
 * collapsible group with a per-prayer checkbox each.
 */
const perPrayerDefs = (idPrefix: string, bundleId: string, baseName: string) =>
  PRAYER_SLOTS.map((p) => ({
    id: `${idPrefix}_${p.key}`,
    name: `${baseName} (${p.label})`,
    type: 'boolean',
    defaultSchedule: 'daily',
    defaultSectionId: p.section,
    bundleId,
    linkedDhikrTemplate: null as string | null,
  }));

export const DEFAULT_DEED_DEFINITIONS = [
  // 1. الصلوات المكتوبة (grouped in bundle_prayers)
  { id: 'fajr', name: 'الفجر', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_morning', bundleId: 'bundle_prayers', linkedDhikrTemplate: null },
  { id: 'dhuhr', name: 'الظهر', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_dhuhr', bundleId: 'bundle_prayers', linkedDhikrTemplate: null },
  { id: 'asr', name: 'العصر', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_asr', bundleId: 'bundle_prayers', linkedDhikrTemplate: null },
  { id: 'maghrib', name: 'المغرب', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_maghrib', bundleId: 'bundle_prayers', linkedDhikrTemplate: null },
  { id: 'isha', name: 'العشاء', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_isha_night', bundleId: 'bundle_prayers', linkedDhikrTemplate: null },

  // 1.5 صلاة الجماعة — one definition per prayer (bundle_jamaah), opt-in via the library
  { id: 'jamaah_fajr', name: 'جماعة الفجر', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_morning', bundleId: 'bundle_jamaah', linkedDhikrTemplate: null },
  { id: 'jamaah_dhuhr', name: 'جماعة الظهر', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_dhuhr', bundleId: 'bundle_jamaah', linkedDhikrTemplate: null },
  { id: 'jamaah_asr', name: 'جماعة العصر', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_asr', bundleId: 'bundle_jamaah', linkedDhikrTemplate: null },
  { id: 'jamaah_maghrib', name: 'جماعة المغرب', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_maghrib', bundleId: 'bundle_jamaah', linkedDhikrTemplate: null },
  { id: 'jamaah_isha', name: 'جماعة العشاء', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_isha_night', bundleId: 'bundle_jamaah', linkedDhikrTemplate: null },

  // 2. السنن الرواتب
  { id: 'sunnah_fajr', name: 'سنة الفجر (ركعتان)', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_morning', bundleId: 'bundle_rawateb', linkedDhikrTemplate: null },
  { id: 'sunnah_dhuhr_before', name: 'سنة الظهر القبلية (4 ركعات)', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_dhuhr', bundleId: 'bundle_rawateb', linkedDhikrTemplate: null },
  { id: 'sunnah_dhuhr_after', name: 'سنة الظهر البعدية (ركعتان)', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_dhuhr', bundleId: 'bundle_rawateb', linkedDhikrTemplate: null },
  { id: 'sunnah_maghrib', name: 'سنة المغرب (ركعتان)', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_maghrib', bundleId: 'bundle_rawateb', linkedDhikrTemplate: null },
  { id: 'sunnah_isha', name: 'سنة العشاء (ركعتان)', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_isha_night', bundleId: 'bundle_rawateb', linkedDhikrTemplate: null },

  // 3. أذكار الصلاة — per-prayer bundles (each act tracked for each of the 5 prayers)
  ...perPrayerDefs('adhan', 'bundle_adhan', 'ترديد الأذان'),
  ...perPrayerDefs('dua_adhanain', 'bundle_dua_adhanain', 'الدعاء بين الأذانين'),
  ...perPrayerDefs('takbeer', 'bundle_takbeer', 'تكبيرة الإحرام'),
  ...perPrayerDefs('adhkar_baad', 'bundle_adhkar_baad', 'الأذكار عقب الصلاة'),

  // 4. وظائف يوم الجمعة (bundle_friday)
  { id: 'friday_ghusl', name: 'الغسل لصلاة الجمعة', type: 'boolean', defaultSchedule: '5', defaultSectionId: 'sec_morning', bundleId: 'bundle_friday', linkedDhikrTemplate: null },
  { id: 'friday_perfume', name: 'التطيب ولبس أحسن الثياب', type: 'boolean', defaultSchedule: '5', defaultSectionId: 'sec_morning', bundleId: 'bundle_friday', linkedDhikrTemplate: null },
  { id: 'friday_early', name: 'التبكير للمسجد لصلاة الجمعة', type: 'boolean', defaultSchedule: '5', defaultSectionId: 'sec_morning', bundleId: 'bundle_friday', linkedDhikrTemplate: null },
  { id: 'friday_kahf', name: 'قراءة سورة الكهف', type: 'boolean', defaultSchedule: '5', defaultSectionId: 'sec_morning', bundleId: 'bundle_friday', linkedDhikrTemplate: null },
  { id: 'friday_salawat', name: 'الإكثار من الصلاة على النبي في يوم الجمعة وليلتها', type: 'boolean', defaultSchedule: '5', defaultSectionId: 'sec_morning', bundleId: 'bundle_friday', linkedDhikrTemplate: null },

  // 5. الأذكار المقيدة اليومية (bundle_adhkar_muqayyada)
  { id: 'muqayyada_wake', name: 'أذكار الاستيقاظ', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_morning', bundleId: 'bundle_adhkar_muqayyada', linkedDhikrTemplate: null },
  { id: 'muqayyada_sleep', name: 'أذكار النوم', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_isha_night', bundleId: 'bundle_adhkar_muqayyada', linkedDhikrTemplate: null },
  { id: 'muqayyada_toilet_in', name: 'دعاء دخول الخلاء', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_quran', bundleId: 'bundle_adhkar_muqayyada', linkedDhikrTemplate: null },
  { id: 'muqayyada_toilet_out', name: 'دعاء الخروج من الخلاء', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_quran', bundleId: 'bundle_adhkar_muqayyada', linkedDhikrTemplate: null },
  { id: 'muqayyada_wudhu', name: 'أذكار الوضوء', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_quran', bundleId: 'bundle_adhkar_muqayyada', linkedDhikrTemplate: null },
  { id: 'muqayyada_home_in', name: 'الذكر عند دخول المنزل', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_quran', bundleId: 'bundle_adhkar_muqayyada', linkedDhikrTemplate: null },
  { id: 'muqayyada_home_out', name: 'الذكر عند الخروج من المنزل', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_quran', bundleId: 'bundle_adhkar_muqayyada', linkedDhikrTemplate: null },
  { id: 'muqayyada_riding', name: 'دعاء الركوب', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_quran', bundleId: 'bundle_adhkar_muqayyada', linkedDhikrTemplate: null },
  { id: 'muqayyada_mosque_walk', name: 'دعاء المشي إلى المسجد', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_quran', bundleId: 'bundle_adhkar_muqayyada', linkedDhikrTemplate: null },
  { id: 'muqayyada_mosque_in', name: 'دعاء دخول المسجد', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_quran', bundleId: 'bundle_adhkar_muqayyada', linkedDhikrTemplate: null },
  { id: 'muqayyada_mosque_out', name: 'دعاء الخروج من المسجد', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_quran', bundleId: 'bundle_adhkar_muqayyada', linkedDhikrTemplate: null },
  { id: 'muqayyada_majlis_istighfar', name: 'الاستغفار في المجلس', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_quran', bundleId: 'bundle_adhkar_muqayyada', linkedDhikrTemplate: null },
  { id: 'muqayyada_majlis_expiation', name: 'كفارة المجلس', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_quran', bundleId: 'bundle_adhkar_muqayyada', linkedDhikrTemplate: null },
  { id: 'adhkar_morning', name: 'أذكار الصباح', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_morning', bundleId: 'bundle_adhkar_muqayyada', linkedDhikrTemplate: null },
  { id: 'adhkar_evening', name: 'أذكار المساء', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_isha_night', bundleId: 'bundle_adhkar_muqayyada', linkedDhikrTemplate: null },

  // 6. الصيام
  { id: 'fasting_mon_thu', name: 'صيام الإثنين والخميس', type: 'boolean', defaultSchedule: '1,4', defaultSectionId: 'sec_morning', bundleId: null, linkedDhikrTemplate: null },

  // 6.5 عبادات فردية
  { id: 'qiym_layl', name: 'قيام الليل', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_isha_night', bundleId: null, linkedDhikrTemplate: null },
  { id: 'tafsir_tadabbur', name: 'تفسير / تدبر', type: 'boolean', defaultSchedule: 'daily', defaultSectionId: 'sec_quran', bundleId: null, linkedDhikrTemplate: null },

  // 7. الأذكار (Istighfar Only)
  { id: 'dhikr_istighfar_lib', name: 'الاستغفار', type: 'measured', defaultSchedule: 'daily', defaultSectionId: 'sec_quran', bundleId: 'bundle_adhkar_mutlaqa', linkedDhikrTemplate: JSON.stringify({ name: 'استغفار', target: 100 }) },

  // 8. الأذكار المطلقة (grouped in bundle_adhkar_mutlaqa)
  { id: 'dhikr_tasbih_lib', name: 'سبحان الله وبحمده', type: 'measured', defaultSchedule: 'daily', defaultSectionId: 'sec_quran', bundleId: 'bundle_adhkar_mutlaqa', linkedDhikrTemplate: JSON.stringify({ name: 'سبحان الله وبحمده', target: 100 }) },
  { id: 'dhikr_salawat_lib', name: 'الصلاة على النبي', type: 'measured', defaultSchedule: 'daily', defaultSectionId: 'sec_quran', bundleId: 'bundle_adhkar_mutlaqa', linkedDhikrTemplate: JSON.stringify({ name: 'الصلاة على النبي', target: 100 }) },
  { id: 'dhikr_tahlil_lib', name: 'لا إله إلا الله', type: 'measured', defaultSchedule: 'daily', defaultSectionId: 'sec_quran', bundleId: 'bundle_adhkar_mutlaqa', linkedDhikrTemplate: JSON.stringify({ name: 'لا إله إلا الله', target: 100 }) },
  { id: 'dhikr_hawqala_lib', name: 'لا حول ولا قوة إلا بالله', type: 'measured', defaultSchedule: 'daily', defaultSectionId: 'sec_quran', bundleId: 'bundle_adhkar_mutlaqa', linkedDhikrTemplate: JSON.stringify({ name: 'لا حول ولا قوة إلا بالله', target: 100 }) },
];

/**
 * Seeds the database with default definitions, scorecard sections, deeds, and dhikrs
 * if they are not already populated.
 */
export async function seedDatabase() {
  const existingDefs = await db.select({ count: sql`count(*)` }).from(deedDefinitions);
  const count = (existingDefs[0] as any)?.count ?? 0;

  if (count > 0) {
    console.log('[Seed] Database already seeded, running incremental migrations if needed...');

    // 0. Update name of sec_quran for existing database seed to match the new requirement
    await db
      .update(sections)
      .set({ name: 'أعمال على مدار اليوم' })
      .where(eq(sections.id, 'sec_quran'));

    // Update name of 'dhikr_istighfar_lib' and existing deeds to 'الاستغفار'
    await db
      .update(deedDefinitions)
      .set({ name: 'الاستغفار' })
      .where(eq(deedDefinitions.id, 'dhikr_istighfar_lib'));

    await db
      .update(deeds)
      .set({ name: 'الاستغفار' })
      .where(eq(deeds.definitionId, 'dhikr_istighfar_lib'));

    // Update bundleId of dhikr_istighfar_lib for existing database seeds
    await db
      .update(deedDefinitions)
      .set({ bundleId: 'bundle_adhkar_mutlaqa' })
      .where(eq(deedDefinitions.id, 'dhikr_istighfar_lib'));

    // 1. Update defaultSectionId of the bundle_adhkar_mutlaqa definitions to 'sec_quran'
    await db
      .update(deedDefinitions)
      .set({ defaultSectionId: 'sec_quran' })
      .where(eq(deedDefinitions.bundleId, 'bundle_adhkar_mutlaqa'));

    // 2. Update sectionId of existing deeds that are linked to bundle_adhkar_mutlaqa definitions
    await db
      .update(deeds)
      .set({ sectionId: 'sec_quran' })
      .where(inArray(deeds.definitionId, [
        'dhikr_istighfar_lib',
        'dhikr_tasbih_lib',
        'dhikr_salawat_lib',
        'dhikr_tahlil_lib',
        'dhikr_hawqala_lib'
      ]));

    // Also update specific deed_istighfar_100 deed specifically
    await db
      .update(deeds)
      .set({ sectionId: 'sec_quran' })
      .where(eq(deeds.id, 'deed_istighfar_100'));

    // 2.5 Update Mutlaq Adhkar types to 'measured' for definitions and existing deeds
    await db
      .update(deedDefinitions)
      .set({ type: 'measured' })
      .where(eq(deedDefinitions.bundleId, 'bundle_adhkar_mutlaqa'));

    await db
      .update(deeds)
      .set({ type: 'measured' })
      .where(inArray(deeds.definitionId, [
        'dhikr_istighfar_lib',
        'dhikr_tasbih_lib',
        'dhikr_salawat_lib',
        'dhikr_tahlil_lib',
        'dhikr_hawqala_lib'
      ]));

    // 3. Ensure 'qiym_layl' and 'tafsir_tadabbur' definitions exist
    for (const defId of ['qiym_layl', 'tafsir_tadabbur']) {
      const existingDef = await db.select().from(deedDefinitions).where(eq(deedDefinitions.id, defId)).limit(1);
      if (existingDef.length === 0) {
        const def = DEFAULT_DEED_DEFINITIONS.find(d => d.id === defId);
        if (def) {
          await db.insert(deedDefinitions).values(def);
        }
      }
    }

    // 4. Ensure 'dhikr_hawqala_lib' definition exists
    const existingHawqalaDef = await db.select().from(deedDefinitions).where(eq(deedDefinitions.id, 'dhikr_hawqala_lib')).limit(1);
    if (existingHawqalaDef.length === 0) {
      const def = DEFAULT_DEED_DEFINITIONS.find(d => d.id === 'dhikr_hawqala_lib');
      if (def) {
        await db.insert(deedDefinitions).values(def);
      }
    }

    // 5. Ensure 'dhikr_hawqala' counter exists
    const existingHawqalaDhikr = await db.select().from(dhikrs).where(eq(dhikrs.id, 'dhikr_hawqala')).limit(1);
    if (existingHawqalaDhikr.length === 0) {
      await db.insert(dhikrs).values({
        id: 'dhikr_hawqala',
        name: 'لا حول ولا قوة إلا بالله',
        sortOrder: 5,
        target: 100,
        createdAt: '2026-06-12',
        updatedAt: Date.now()
      });
    }

    // 6. Ensure 'deed_hawqala_100' deed exists in the default scorecard
    const todayStr = new Date().toISOString().split('T')[0];
    const existingHawqalaDeed = await db.select().from(deeds).where(eq(deeds.definitionId, 'dhikr_hawqala_lib')).limit(1);
    if (existingHawqalaDeed.length === 0) {
      await db.insert(deeds).values({
        id: 'deed_hawqala_100',
        definitionId: 'dhikr_hawqala_lib',
        sectionId: 'sec_quran',
        name: 'لا حول ولا قوة إلا بالله',
        type: 'measured',
        schedule: 'daily',
        createdAt: todayStr,
        sortOrder: 5,
        linkedDhikrId: 'dhikr_hawqala',
        target: 100,
        updatedAt: Date.now()
      });
    }

    // 7. Split combined Adhkar Muqayyada definitions and deeds
    const oldToNewMapping = [
      {
        oldId: 'muqayyada_sleep_wake',
        newDefs: ['muqayyada_wake', 'muqayyada_sleep']
      },
      {
        oldId: 'muqayyada_toilet_wudhu',
        newDefs: ['muqayyada_toilet_in', 'muqayyada_toilet_out', 'muqayyada_wudhu']
      },
      {
        oldId: 'muqayyada_home',
        newDefs: ['muqayyada_home_in', 'muqayyada_home_out', 'muqayyada_riding']
      },
      {
        oldId: 'muqayyada_mosque',
        newDefs: ['muqayyada_mosque_walk', 'muqayyada_mosque_in', 'muqayyada_mosque_out']
      },
      {
        oldId: 'muqayyada_majlis',
        newDefs: ['muqayyada_majlis_istighfar', 'muqayyada_majlis_expiation']
      },
      {
        oldId: 'muqayyada_toilet',
        newDefs: ['muqayyada_toilet_in', 'muqayyada_toilet_out']
      },
      {
        oldId: 'muqayyada_home_in_out',
        newDefs: ['muqayyada_home_in', 'muqayyada_home_out']
      },
      {
        oldId: 'muqayyada_mosque_in_out',
        newDefs: ['muqayyada_mosque_in', 'muqayyada_mosque_out']
      }
    ];

    for (const mapping of oldToNewMapping) {
      // Check if user had a deed for the old combined definition
      const oldDeeds = await db.select().from(deeds).where(eq(deeds.definitionId, mapping.oldId));
      if (oldDeeds.length > 0) {
        // Create new deeds for the new separate definitions
        for (const newDefId of mapping.newDefs) {
          const def = DEFAULT_DEED_DEFINITIONS.find(d => d.id === newDefId);
          if (def) {
            const existing = await db.select().from(deeds).where(eq(deeds.definitionId, newDefId)).limit(1);
            if (existing.length === 0) {
              await db.insert(deeds).values({
                id: `deed_${newDefId}`,
                definitionId: newDefId,
                sectionId: def.defaultSectionId,
                name: def.name,
                type: def.type,
                schedule: def.defaultSchedule,
                createdAt: todayStr,
                sortOrder: 10,
                updatedAt: Date.now()
              });
            }
          }
        }
        await db.delete(deeds).where(eq(deeds.definitionId, mapping.oldId));
      }
      await db.delete(deedDefinitions).where(eq(deedDefinitions.id, mapping.oldId));
    }

    // Ensure all 10 new split definitions exist
    const newSplitIds = [
      'muqayyada_wake', 'muqayyada_sleep',
      'muqayyada_toilet_in', 'muqayyada_toilet_out', 'muqayyada_wudhu',
      'muqayyada_home_in', 'muqayyada_home_out', 'muqayyada_riding',
      'muqayyada_mosque_walk', 'muqayyada_mosque_in', 'muqayyada_mosque_out',
      'muqayyada_majlis_istighfar', 'muqayyada_majlis_expiation'
    ];

    for (const defId of newSplitIds) {
      const existingDef = await db.select().from(deedDefinitions).where(eq(deedDefinitions.id, defId)).limit(1);
      if (existingDef.length === 0) {
        const def = DEFAULT_DEED_DEFINITIONS.find(d => d.id === defId);
        if (def) {
          await db.insert(deedDefinitions).values(def);
        }
      }
    }

    // 8. صلاة الجماعة is now a library bundle (opt-in), not an auto-seeded deed.
    // Ensure the 5 per-prayer definitions exist...
    for (const defId of ['jamaah_fajr', 'jamaah_dhuhr', 'jamaah_asr', 'jamaah_maghrib', 'jamaah_isha']) {
      const existingDef = await db.select().from(deedDefinitions).where(eq(deedDefinitions.id, defId)).limit(1);
      if (existingDef.length === 0) {
        const def = DEFAULT_DEED_DEFINITIONS.find((d) => d.id === defId);
        if (def) {
          await db.insert(deedDefinitions).values(def);
        }
      }
    }
    // ...and remove the opaque deeds auto-seeded by the previous version (definitionId null).
    await db
      .delete(deeds)
      .where(and(eq(deeds.bundleId, 'bundle_jamaah'), isNull(deeds.definitionId)));

    // 9. أذكار الصلاة: split each single item into a per-prayer bundle; drop الصلاة على النبي.
    const adhkarSalahSplit = [
      { oldId: 'adhkar_salah_adhan', bundleId: 'bundle_adhan' },
      { oldId: 'adhkar_salah_between', bundleId: 'bundle_dua_adhanain' },
      { oldId: 'adhkar_salah_takbeer', bundleId: 'bundle_takbeer' },
      { oldId: 'adhkar_salah_after', bundleId: 'bundle_adhkar_baad' },
    ];

    for (const split of adhkarSalahSplit) {
      const newDefs = DEFAULT_DEED_DEFINITIONS.filter((d) => d.bundleId === split.bundleId);

      // Ensure the 5 per-prayer definitions exist.
      for (const def of newDefs) {
        const existingDef = await db.select().from(deedDefinitions).where(eq(deedDefinitions.id, def.id)).limit(1);
        if (existingDef.length === 0) {
          await db.insert(deedDefinitions).values(def);
        }
      }

      // If the user had opted into the old single deed, recreate it as 5 per-prayer deeds
      // (matching how the library would create them: bundleId null, keyed by definitionId).
      const oldDeeds = await db.select().from(deeds).where(eq(deeds.definitionId, split.oldId));
      if (oldDeeds.length > 0) {
        for (const def of newDefs) {
          const existing = await db.select().from(deeds).where(eq(deeds.definitionId, def.id)).limit(1);
          if (existing.length === 0) {
            await db.insert(deeds).values({
              id: `deed_${def.id}`,
              definitionId: def.id,
              sectionId: def.defaultSectionId,
              name: def.name,
              type: def.type,
              schedule: def.defaultSchedule,
              createdAt: todayStr,
              sortOrder: 15,
              updatedAt: Date.now(),
            });
          }
        }
        await db.delete(deeds).where(eq(deeds.definitionId, split.oldId));
      }

      await db.delete(deedDefinitions).where(eq(deedDefinitions.id, split.oldId));
    }

    // Remove الصلاة على النبي بعد الفراغ entirely (covered by أذكار عقب الصلاة).
    await db.delete(deeds).where(eq(deeds.definitionId, 'adhkar_salah_salawat'));
    await db.delete(deedDefinitions).where(eq(deedDefinitions.id, 'adhkar_salah_salawat'));

    console.log('[Seed] Incremental migrations completed successfully.');
    return;
  }

  // Developer-friendly check: If old section 'sec_prayers' exists, clear to re-seed the new time-of-day layout
  const oldSection = await db.select().from(sections).where(eq(sections.id, 'sec_prayers')).limit(1);
  if (oldSection.length > 0) {
    console.log('[Seed] Old seed layout detected. Clearing database to re-seed with time-of-day layout...');
    await db.delete(deeds);
    await db.delete(sections);
    await db.delete(dhikrs);
    await db.delete(deedDefinitions);
  }

  console.log('[Seed] Seeding default database data...');

  // 2. Insert Deed Definitions
  for (const def of DEFAULT_DEED_DEFINITIONS) {
    await db.insert(deedDefinitions).values(def);
  }

  // 3. Insert the default starter scorecard (sections, dhikrs, deeds).
  // Note: صلاة الجماعة is intentionally NOT seeded as a deed — it is opt-in via
  // the library (its 5 per-prayer definitions live in DEFAULT_DEED_DEFINITIONS).
  await seedDefaultUserData();

  console.log('[Seed] Database seeding completed successfully.');
}

/**
 * Inserts the default starter scorecard: sections, dhikr counters, and deeds.
 * Does NOT touch deedDefinitions (the global catalog).
 *
 * - Default behaviour (deterministic ids) is used by the initial seed.
 * - `freshIds: true` generates new ids for every row and remaps references,
 *   used by factory reset so the new rows don't collide with tombstoned
 *   default rows that still hold the deterministic ids.
 */
export async function seedDefaultUserData(options?: { freshIds?: boolean }): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // local YYYY-MM-DD
  const { sections: secs, dhikrs: dks, deeds: dds } = buildDefaultUserData({
    now: Date.now(),
    today,
    freshIds: options?.freshIds ?? false,
    genId: () => Crypto.randomUUID(),
  });

  for (const sec of secs) {
    await db.insert(sections).values(sec);
  }
  for (const dk of dks) {
    await db.insert(dhikrs).values(dk);
  }
  for (const deed of dds) {
    await db.insert(deeds).values(deed);
  }
}
