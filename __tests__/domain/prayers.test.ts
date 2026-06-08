import { PRAYERS, PRAYER_STATUSES, cyclePrayerStatus } from '@/domain/prayers';

describe('prayers', () => {
  it('defines the five prayers in order', () => {
    expect(PRAYERS).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
  });
  it('defines the four statuses', () => {
    expect(PRAYER_STATUSES).toEqual(['not_yet', 'on_time', 'late', 'missed']);
  });
  it('cycles status forward and wraps around', () => {
    expect(cyclePrayerStatus('not_yet')).toBe('on_time');
    expect(cyclePrayerStatus('on_time')).toBe('late');
    expect(cyclePrayerStatus('late')).toBe('missed');
    expect(cyclePrayerStatus('missed')).toBe('not_yet');
  });
});
