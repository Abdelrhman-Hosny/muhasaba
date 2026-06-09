export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type Prayer = (typeof PRAYERS)[number];

/**
 * Binary done / not-done. Prayers are (for now) a task subtype; the model is
 * intentionally a simple checkbox and may grow richer states later.
 */
export const PRAYER_STATUSES = ['not_yet', 'done'] as const;
export type PrayerStatus = (typeof PRAYER_STATUSES)[number];

export const isDone = (status: PrayerStatus): boolean => status === 'done';

/** Tapping a prayer toggles between done and not-done. */
export function toggleStatus(status: PrayerStatus): PrayerStatus {
  return status === 'done' ? 'not_yet' : 'done';
}

/** Map any stored status (incl. legacy on_time/late/missed) onto the binary model. */
export function normalizeStatus(raw: string): PrayerStatus {
  return raw === 'not_yet' ? 'not_yet' : 'done';
}
