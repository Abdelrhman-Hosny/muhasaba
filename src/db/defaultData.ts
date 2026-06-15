import type { SectionRow, DhikrRow, DeedRow } from './schema';

/**
 * Templates for the default starter scorecard (sections, dhikr counters, deeds).
 *
 * Kept free of any native/runtime imports (type-only schema import) so the
 * `buildDefaultUserData` builder can be unit-tested in a plain node env.
 *
 * Each template uses a stable `key` that doubles as the deterministic row id
 * during the initial seed. `buildDefaultUserData({ freshIds: true })` swaps the
 * keys for freshly generated ids (used by factory reset) while remapping the
 * `sectionId` / `linkedDhikrId` references to the new ids.
 */

const SECTION_TEMPLATES = [
  { key: 'sec_morning', name: 'الصبح', sortOrder: 1 },
  { key: 'sec_dhuhr', name: 'الظهر', sortOrder: 2 },
  { key: 'sec_asr', name: 'العصر', sortOrder: 3 },
  { key: 'sec_maghrib', name: 'المغرب', sortOrder: 4 },
  { key: 'sec_isha_night', name: 'العشاء والليل', sortOrder: 5 },
  { key: 'sec_quran', name: 'أعمال على مدار اليوم', sortOrder: 6 },
] as const;

const DHIKR_TEMPLATES = [
  { key: 'dhikr_istighfar', name: 'استغفار', sortOrder: 1, target: 100, createdAt: '2026-06-12' },
  { key: 'dhikr_tasbih', name: 'سبحان الله وبحمده', sortOrder: 2, target: 100, createdAt: '2026-06-12' },
  { key: 'dhikr_salawat', name: 'الصلاة على النبي', sortOrder: 3, target: 100, createdAt: '2026-06-12' },
  { key: 'dhikr_tahlil', name: 'لا إله إلا الله', sortOrder: 4, target: 100, createdAt: '2026-06-12' },
  { key: 'dhikr_hawqala', name: 'لا حول ولا قوة إلا بالله', sortOrder: 5, target: 100, createdAt: '2026-06-12' },
] as const;

interface DeedTemplate {
  key: string;
  definitionId: string;
  sectionKey: string;
  name: string;
  type: 'boolean' | 'measured';
  schedule: string;
  sortOrder: number;
  linkedDhikrKey: string | null;
  target: number | null;
}

const DEED_TEMPLATES: DeedTemplate[] = [
  // الصبح
  { key: 'deed_fajr', definitionId: 'fajr', sectionKey: 'sec_morning', name: 'صلاة الفجر', type: 'boolean', schedule: 'daily', sortOrder: 1, linkedDhikrKey: null, target: null },
  { key: 'deed_sunnah_fajr', definitionId: 'sunnah_fajr', sectionKey: 'sec_morning', name: 'سنة الفجر (ركعتان)', type: 'boolean', schedule: 'daily', sortOrder: 2, linkedDhikrKey: null, target: null },
  { key: 'deed_adhkar_morning', definitionId: 'adhkar_morning', sectionKey: 'sec_morning', name: 'أذكار الصباح', type: 'boolean', schedule: 'daily', sortOrder: 3, linkedDhikrKey: null, target: null },
  // الظهر
  { key: 'deed_dhuhr', definitionId: 'dhuhr', sectionKey: 'sec_dhuhr', name: 'صلاة الظهر', type: 'boolean', schedule: 'daily', sortOrder: 1, linkedDhikrKey: null, target: null },
  // العصر
  { key: 'deed_asr', definitionId: 'asr', sectionKey: 'sec_asr', name: 'صلاة العصر', type: 'boolean', schedule: 'daily', sortOrder: 1, linkedDhikrKey: null, target: null },
  // المغرب
  { key: 'deed_maghrib', definitionId: 'maghrib', sectionKey: 'sec_maghrib', name: 'صلاة المغرب', type: 'boolean', schedule: 'daily', sortOrder: 1, linkedDhikrKey: null, target: null },
  // العشاء والليل
  { key: 'deed_isha', definitionId: 'isha', sectionKey: 'sec_isha_night', name: 'صلاة العشاء', type: 'boolean', schedule: 'daily', sortOrder: 1, linkedDhikrKey: null, target: null },
  { key: 'deed_adhkar_evening', definitionId: 'adhkar_evening', sectionKey: 'sec_isha_night', name: 'أذكار المساء', type: 'boolean', schedule: 'daily', sortOrder: 2, linkedDhikrKey: null, target: null },
  // أعمال على مدار اليوم
  { key: 'deed_istighfar_100', definitionId: 'dhikr_istighfar_lib', sectionKey: 'sec_quran', name: 'الاستغفار', type: 'measured', schedule: 'daily', sortOrder: 1, linkedDhikrKey: 'dhikr_istighfar', target: 100 },
  { key: 'deed_hawqala_100', definitionId: 'dhikr_hawqala_lib', sectionKey: 'sec_quran', name: 'لا حول ولا قوة إلا بالله', type: 'measured', schedule: 'daily', sortOrder: 2, linkedDhikrKey: 'dhikr_hawqala', target: 100 },
];

export interface BuildDefaultUserDataOptions {
  /** epoch ms stamped on every row's updatedAt */
  now: number;
  /** YYYY-MM-DD used as deed createdAt */
  today: string;
  /** When true, rows get fresh ids (via genId) instead of their stable keys. */
  freshIds?: boolean;
  /** Required when freshIds is true; produces a unique id per call. */
  genId?: () => string;
}

export interface DefaultUserData {
  sections: SectionRow[];
  dhikrs: DhikrRow[];
  deeds: DeedRow[];
}

/**
 * Builds insert-ready default sections, dhikrs, and deeds.
 *
 * With `freshIds: true`, every row receives a generated id and all references
 * (`deed.sectionId`, `deed.linkedDhikrId`) are remapped to the new ids, so the
 * rows can be inserted without colliding with tombstoned default rows that
 * still hold the deterministic keys (the factory-reset case).
 */
export function buildDefaultUserData(options: BuildDefaultUserDataOptions): DefaultUserData {
  const { now, today, freshIds = false } = options;
  const genId = options.genId;

  const idFor = (key: string): string => {
    if (!freshIds) return key;
    if (!genId) throw new Error('buildDefaultUserData: genId is required when freshIds is true');
    return genId();
  };

  const sectionIdByKey = new Map<string, string>();
  const sections: SectionRow[] = SECTION_TEMPLATES.map((t) => {
    const id = idFor(t.key);
    sectionIdByKey.set(t.key, id);
    return {
      id,
      userId: null,
      name: t.name,
      sortOrder: t.sortOrder,
      deletedAt: null,
      updatedAt: now,
      deleted: false,
      dirty: true,
    };
  });

  const dhikrIdByKey = new Map<string, string>();
  const dhikrs: DhikrRow[] = DHIKR_TEMPLATES.map((t) => {
    const id = idFor(t.key);
    dhikrIdByKey.set(t.key, id);
    return {
      id,
      userId: null,
      name: t.name,
      sortOrder: t.sortOrder,
      target: t.target,
      createdAt: t.createdAt,
      deletedAt: null,
      updatedAt: now,
      deleted: false,
      dirty: true,
    };
  });

  const deeds: DeedRow[] = DEED_TEMPLATES.map((t) => {
    const sectionId = sectionIdByKey.get(t.sectionKey);
    if (!sectionId) throw new Error(`buildDefaultUserData: unknown sectionKey ${t.sectionKey}`);
    const linkedDhikrId = t.linkedDhikrKey ? dhikrIdByKey.get(t.linkedDhikrKey) ?? null : null;
    return {
      id: idFor(t.key),
      userId: null,
      definitionId: t.definitionId,
      sectionId,
      bundleId: null,
      name: t.name,
      type: t.type,
      schedule: t.schedule,
      createdAt: today,
      sortOrder: t.sortOrder,
      deletedAt: null,
      linkedDhikrId,
      target: t.target,
      updatedAt: now,
      deleted: false,
      dirty: true,
    };
  });

  return { sections, dhikrs, deeds };
}
