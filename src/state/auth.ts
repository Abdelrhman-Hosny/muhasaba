import { observable } from '@legendapp/state';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export interface AppUser {
  id: string;
  email: string | null;
  name: string | null;
}

export const user$ = observable<AppUser | null>(null);

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
  const { data } = await supabase.auth.getSession();
  user$.set(toAppUser(data.session));
  supabase.auth.onAuthStateChange((_event, session) => {
    user$.set(toAppUser(session));
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
  const { clearStores } = await import('./stores');
  clearStores();
}
