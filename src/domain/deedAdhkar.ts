import { azkarCategories, DhikrItem } from './azkarData';

const byTitle = (t: string): DhikrItem[] =>
  azkarCategories.find((c) => c.title === t)?.items ?? [];

const PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/** Builds `${prefix}_${prayer}` -> titles entries for a per-prayer deed bundle. */
const perPrayerAdhkar = (prefix: string, titles: string[]): Record<string, string[]> =>
  Object.fromEntries(PRAYER_KEYS.map((k) => [`${prefix}_${k}`, titles]));

/**
 * Maps a deed definition ID to the حصن المسلم category titles whose أذكار make up
 * that deed. A deed may aggregate more than one category (e.g. the wudhu deed
 * combines the before/after-wudhu duas). Titles must match azkarData exactly.
 */
const DEED_ADHKAR_TITLES: Record<string, string[]> = {
  adhkar_morning: ['أذكار الصباح'],
  adhkar_evening: ['أذكار المساء'],
  muqayyada_wake: ['أذكار الاستيقاظ من النوم'],
  muqayyada_sleep: ['أذكار النوم'],
  muqayyada_toilet_in: ['دعاء دخول الخلاء'],
  muqayyada_toilet_out: ['دعاء الخروج من الخلاء'],
  muqayyada_wudhu: ['الذكر قبل الوضوء', 'الذكر بعد الفراغ من الوضوء'],
  muqayyada_home_in: ['الذكر عند دخول المنزل'],
  muqayyada_home_out: ['الذكر عند الخروج من المنزل'],
  muqayyada_riding: ['دعاء الركوب'],
  muqayyada_mosque_walk: ['دعاء الذهاب إلى المسجد'],
  muqayyada_mosque_in: ['دعاء دخول المسجد'],
  muqayyada_mosque_out: ['دعاء الخروج من المسجد'],
  // Per-prayer salah-adhkar bundles (same content for each of the 5 prayers).
  // الدعاء بين الأذانين has no fixed text, so it is intentionally not linked.
  ...perPrayerAdhkar('adhan', ['أذكار الآذان']),
  ...perPrayerAdhkar('adhkar_baad', ['الأذكار بعد السلام من الصلاة']),
};

/** Returns the أذكار items for a deed definition, or null if the deed has none. */
export function getDeedAdhkar(definitionId: string | null | undefined): DhikrItem[] | null {
  if (!definitionId) return null;
  const titles = DEED_ADHKAR_TITLES[definitionId];
  if (!titles) return null;
  const items = titles.flatMap(byTitle);
  return items.length > 0 ? items : null;
}

/** True when a deed has linked أذكار content that can be opened in a reader. */
export function hasDeedAdhkar(definitionId: string | null | undefined): boolean {
  return getDeedAdhkar(definitionId) !== null;
}
