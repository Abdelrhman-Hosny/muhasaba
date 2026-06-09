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

  it('keeps the user signed in when a token refresh fails offline', async () => {
    const { supabase } = require('@/state/supabase');
    const session = { user: { id: 'u1', email: 'a@b.co', user_metadata: { full_name: 'A' } } };
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session } });

    await initAuth();
    expect(user$.get()?.id).toBe('u1');

    // gotrue emits these with a null session when offline / refresh fails.
    const onChange = supabase.auth.onAuthStateChange.mock.calls.at(-1)[0];
    onChange('TOKEN_REFRESHED', null);
    expect(user$.get()?.id).toBe('u1'); // still signed in

    // Only an explicit sign-out clears the user.
    onChange('SIGNED_OUT', null);
    expect(user$.get()).toBeNull();
  });
});
