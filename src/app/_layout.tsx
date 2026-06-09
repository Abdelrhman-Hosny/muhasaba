import { useEffect } from 'react';
import { I18nManager, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useFonts, Cairo_400Regular } from '@expo-google-fonts/cairo';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from '@/db/client';
import migrations from '../../drizzle/migrations';
import { initAuth } from '@/state/auth';
import { theme } from '@/ui/theme';

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      {children}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Cairo: Cairo_400Regular });
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (!success) return;
    initAuth(); // optional: loads any cached session; never blocks
  }, [success]);

  if (error) return <Centered><Text style={{ color: theme.colors.text, fontFamily: theme.font }}>{String(error.message)}</Text></Centered>;
  if (!success || !fontsLoaded) return <Centered><ActivityIndicator color={theme.colors.primary} /></Centered>;

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
