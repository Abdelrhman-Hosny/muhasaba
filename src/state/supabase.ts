import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { createMMKV } from 'react-native-mmkv';

// During Expo Router's web server-side render this module is evaluated in Node,
// where native storage isn't available. Lazily create MMKV and only on the client.
const isServer = typeof window === 'undefined';

let storage: ReturnType<typeof createMMKV> | null = null;
const getStorage = () => {
  if (isServer) return null;
  if (!storage) storage = createMMKV({ id: 'muhassaba-auth' });
  return storage;
};

const mmkvAuthStorage = {
  getItem: (key: string) => getStorage()?.getString(key) ?? null,
  setItem: (key: string, value: string) => { getStorage()?.set(key, value); },
  removeItem: (key: string) => { getStorage()?.remove(key); },
};

// Node 20 (used by Expo's web static render) has no global WebSocket, so Supabase's
// realtime client throws on construction. Realtime never connects during a static
// pre-render, so a no-op stub is enough to let createClient succeed on the server.
if (isServer && typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class {
    close() {}
    addEventListener() {}
    removeEventListener() {}
    send() {}
  };
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: mmkvAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
