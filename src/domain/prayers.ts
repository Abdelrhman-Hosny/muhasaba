export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type Prayer = (typeof PRAYERS)[number];

export const PRAYER_STATUSES = ['not_yet', 'on_time', 'late', 'missed'] as const;
export type PrayerStatus = (typeof PRAYER_STATUSES)[number];

/** Tapping a prayer advances its status, wrapping back to not_yet. */
export function cyclePrayerStatus(status: PrayerStatus): PrayerStatus {
  const i = PRAYER_STATUSES.indexOf(status);
  return PRAYER_STATUSES[(i + 1) % PRAYER_STATUSES.length];
}
