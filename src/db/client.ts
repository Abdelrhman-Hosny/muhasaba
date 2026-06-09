import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';
import { DB_NAME } from '@/config';

// `enableChangeListener: true` is REQUIRED for Drizzle's useLiveQuery to react to writes.
const expoDb = openDatabaseSync(DB_NAME, { enableChangeListener: true });

export const db = drizzle(expoDb, { schema });
export { schema };
