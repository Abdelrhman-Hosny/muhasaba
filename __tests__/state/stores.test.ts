// Mock supabase to avoid runtime client creation (no env vars in tests).
jest.mock('@/state/supabase', () => ({
  supabase: {
    auth: {},
    from: jest.fn(),
    channel: jest.fn(),
  },
}));

// Mock auth to provide a stable observable without triggering Supabase calls.
jest.mock('@/state/auth', () => {
  const { observable } = require('@legendapp/state');
  return { user$: observable(null) };
});

import { prayerLogId, habitLogId } from '@/state/stores';

describe('store id helpers', () => {
  it('builds a deterministic prayer log id', () => {
    expect(prayerLogId('u1', '2026-06-08', 'fajr')).toBe('u1:2026-06-08:fajr');
  });
  it('builds a deterministic habit log id', () => {
    expect(habitLogId('u1', '2026-06-08', 'h1')).toBe('u1:2026-06-08:h1');
  });
});
