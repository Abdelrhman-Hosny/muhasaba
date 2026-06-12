import { useSyncExternalStore } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from './supabase';
import { makeObservable } from './observable';

WebBrowser.maybeCompleteAuthSession();

export interface AppUser {
  id: string;
  email: string | null;
  name: string | null;
}

export const user$ = makeObservable<AppUser | null>(null);

function toAppUser(session: any): AppUser | null {
  const u = session?.user;
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? null,
    name: u.user_metadata?.full_name ?? null,
  };
}

/** Load any persisted session and subscribe to changes. Call once at startup. */
export async function initAuth(): Promise<void> {
  // Trust the persisted session even if the access token has already expired or
  // we're currently offline. The stored refresh token is long-lived, so the user
  // stays signed in; gotrue refreshes the access token automatically once it can
  // reach the network again.
  const { data } = await supabase.auth.getSession();
  user$.set(toAppUser(data.session));
  supabase.auth.onAuthStateChange((event, session) => {
    // Only an *explicit* sign-out should clear the user. A failed or offline
    // token refresh must never log the user out — gotrue may briefly emit a null
    // session in that case, but the refresh token is still valid and is retried.
    if (event === 'SIGNED_OUT') {
      user$.set(null);
      return;
    }
    if (session) {
      user$.set(toAppUser(session));
    }
  });
}

/** Launch Google OAuth via an external browser, then set the session. */
export async function signInWithGoogle(): Promise<void> {
  const redirectTo = AuthSession.makeRedirectUri({ scheme: 'muhassaba' });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo);
  if (result.type !== 'success' || !result.url) return;

  const url = new URL(result.url);
  const params = new URLSearchParams(url.hash.replace(/^#/, ''));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) {
    await supabase.auth.setSession({ access_token, refresh_token });
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  user$.set(null);
  // Local prayer data is intentionally kept; sign-out only stops syncing.
}

/** Reactive hook: returns the current AppUser or null. Re-renders on auth changes. */
export function useUser(): AppUser | null {
  return useSyncExternalStore(user$.onChange, user$.get, user$.get);
}
