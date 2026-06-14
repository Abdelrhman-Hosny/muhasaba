import { createMMKV } from 'react-native-mmkv';
import { useSyncExternalStore } from 'react';
import { makeObservable } from '@/state/observable';

const storage = createMMKV({ id: 'muhassaba-azkar-favorites' });
const KEY = 'favoriteTitles';

// Seeded on first run; users can remove these later.
const DEFAULT_FAVORITES = [
  'أذكار الصباح',
  'أذكار المساء',
  'أذكار النوم',
  'أذكار الاستيقاظ من النوم',
];

function loadInitial(): Set<string> {
  const raw = storage.getString(KEY);
  if (raw == null) {
    storage.set(KEY, JSON.stringify(DEFAULT_FAVORITES));
    return new Set(DEFAULT_FAVORITES);
  }
  try {
    const arr = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(arr) ? (arr as string[]) : []);
  } catch {
    return new Set();
  }
}

const favorites$ = makeObservable<Set<string>>(loadInitial());

export function toggleFavorite(title: string) {
  const next = new Set(favorites$.get());
  if (next.has(title)) next.delete(title);
  else next.add(title);
  storage.set(KEY, JSON.stringify([...next]));
  favorites$.set(next);
}

export function useFavorites(): Set<string> {
  return useSyncExternalStore(favorites$.onChange, favorites$.get, favorites$.get);
}
