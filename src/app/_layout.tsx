import { useEffect } from 'react';
import { I18nManager, View, Text, ActivityIndicator, AppState, AppStateStatus, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useFonts, Cairo_400Regular, Cairo_700Bold } from '@expo-google-fonts/cairo';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from '@/db/client';
import migrations from '../../drizzle/migrations';
import { seedDatabase } from '@/db/seed';
import { initAuth } from '@/state/auth';
import { runSync } from '@/state/sync';
import { useTheme } from '@/ui/theme';
import { StatusBar } from 'expo-status-bar';

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

function Centered({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      {children}
    </View>
  );
}

export default function RootLayout() {
  const theme = useTheme();
  const [fontsLoaded] = useFonts({
    Cairo: Cairo_400Regular,
    'Cairo-Bold': Cairo_700Bold,
  });
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (!success) return;
    seedDatabase()
      .then(() => initAuth())
      .then(() => runSync())
      .catch((err) => console.error('Database seed error:', err));

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        runSync();
      }
    });

    return () => subscription.remove();
  }, [success]);

  if (error) {
    return (
      <Centered>
        <Text style={{ color: theme.colors.text, fontFamily: theme.font }}>{String(error.message)}</Text>
      </Centered>
    );
  }

  const isReady = success && fontsLoaded;

  return (
    <SafeAreaProvider>
      <StatusBar style={theme.statusBar} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      {!isReady && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.bg }]}>
          <Centered>
            <ActivityIndicator color={theme.colors.primary} />
          </Centered>
        </View>
      )}
    </SafeAreaProvider>
  );
}
