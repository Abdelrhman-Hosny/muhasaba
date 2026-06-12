import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser, signInWithGoogle, signOut } from '@/state/auth';
import { useSyncStatus } from '@/state/syncStatus';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

export default function AccountScreen() {
  const router = useRouter();
  const user = useUser();
  const insets = useSafeAreaInsets();
  const syncStatus = useSyncStatus();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />
      <View style={styles.header}>
        <Text style={styles.title}>{ar.account.title}</Text>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={theme.colors.muted} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {!user ? (
          <View style={styles.signedOutState}>
            <Pressable style={styles.googleBtn} onPress={signInWithGoogle}>
              <Ionicons name="logo-google" size={20} color="#fff" style={styles.googleIcon} />
              <Text style={styles.googleBtnText}>{ar.account.signInGoogle}</Text>
            </Pressable>
            <Text style={styles.prompt}>{ar.account.signInPrompt}</Text>
          </View>
        ) : (
          <View style={styles.signedInState}>
            <Text style={styles.greeting}>{ar.account.greeting}{user.name || 'User'}</Text>
            <Text style={styles.email}>{user.email}</Text>
            
            <View style={styles.syncStatusRow}>
              <View style={[styles.statusDot, { backgroundColor: syncStatus === 'synced' ? theme.colors.primary : theme.colors.muted }]} />
              <Text style={styles.syncStatus}>{ar.sync[syncStatus]}</Text>
            </View>

            <Pressable style={styles.signOutBtn} onPress={signOut}>
              <Text style={styles.signOutBtnText}>{ar.account.signOut}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  title: { color: theme.colors.text, fontFamily: theme.font, fontSize: 20 },
  closeBtn: { position: 'absolute', left: 16 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  
  // Signed Out
  signedOutState: { alignItems: 'center', gap: 16 },
  googleBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  googleIcon: { marginLeft: 12 },
  googleBtnText: { color: '#fff', fontFamily: theme.font, fontSize: 16 },
  prompt: { color: theme.colors.muted, fontFamily: theme.font, fontSize: 14, textAlign: 'center' },
  
  // Signed In
  signedInState: { alignItems: 'center', gap: 12 },
  greeting: { color: theme.colors.text, fontFamily: theme.font, fontSize: 24 },
  email: { color: theme.colors.muted, fontFamily: theme.font, fontSize: 16 },
  syncStatusRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 24 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  syncStatus: { color: theme.colors.muted, fontFamily: theme.font, fontSize: 14 },
  signOutBtn: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  signOutBtnText: { color: theme.colors.missed, fontFamily: theme.font, fontSize: 16 },
});
