import { PRAYERS, PRAYER_STATUSES, toggleStatus, isDone, normalizeStatus } from '@/domain/prayers';

describe('prayers', () => {
  it('defines the five prayers in order', () => {
    expect(PRAYERS).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
  });
  it('defines the binary statuses', () => {
    expect(PRAYER_STATUSES).toEqual(['not_yet', 'done']);
  });
  it('toggles between done and not-done', () => {
    expect(toggleStatus('not_yet')).toBe('done');
    expect(toggleStatus('done')).toBe('not_yet');
  });
  it('reports done state', () => {
    expect(isDone('done')).toBe(true);
    expect(isDone('not_yet')).toBe(false);
  });
  it('normalizes legacy statuses onto the binary model', () => {
    expect(normalizeStatus('not_yet')).toBe('not_yet');
    expect(normalizeStatus('on_time')).toBe('done');
    expect(normalizeStatus('late')).toBe('done');
    expect(normalizeStatus('missed')).toBe('done');
  });
});
