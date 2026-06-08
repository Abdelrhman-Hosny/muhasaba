import { useEffect, useState } from 'react';
import { I18nManager, View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts, Cairo_400Regular } from '@expo-google-fonts/cairo';
import { use$ } from '@legendapp/state/react';
import { user$, initAuth } from '@/state/auth';
import { theme } from '@/ui/theme';

// Force RTL once.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Cairo: Cairo_400Regular,
  });

  useEffect(() => {
    initAuth().finally(() => setReady(true));
  }, []);

  if (!ready || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  // Auth/navigation hooks live in a child that only mounts once loading is
  // done, so RootLayout's hook order stays stable across the loading→ready
  // transition (avoids a rules-of-hooks violation).
  return <AuthGuardedStack />;
}

function AuthGuardedStack() {
  const user = use$(user$);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === 'sign-in';
    if (!user && !inAuthGroup) {
      router.replace('/sign-in');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, segments, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
