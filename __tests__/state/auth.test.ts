jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn().mockReturnValue('muhassaba://'),
}));

jest.mock('@/state/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

import { user$, initAuth } from '@/state/auth';

describe('auth', () => {
  it('starts with no user', () => {
    expect(user$.get()).toBeNull();
  });

  it('initAuth subscribes to auth changes', async () => {
    const { supabase } = require('@/state/supabase');
    await initAuth();
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
  });
});
