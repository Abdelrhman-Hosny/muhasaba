import { View, Text, Pressable, StyleSheet, I18nManager, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser, signInWithGoogle, signOut } from '@/state/auth';
import { useSyncStatus } from '@/state/syncStatus';
import { resetLogsOnly, resetLogsAndDeeds, factoryReset } from '@/state/resetStore';
import { useTheme, ThemeType } from '@/ui/theme';
import { ar } from '@/i18n/ar';
import { useMemo } from 'react';

function confirmReset(body: string, run: () => Promise<void>) {
  Alert.alert(ar.reset.title, body, [
    { text: ar.reset.cancel, style: 'cancel' },
    {
      text: ar.reset.confirmCta,
      style: 'destructive',
      onPress: async () => {
        try {
          await run();
          Alert.alert(ar.reset.doneTitle, ar.reset.doneBody);
        } catch {
          Alert.alert(ar.reset.errorTitle, ar.reset.errorBody);
        }
      },
    },
  ]);
}

function onResetPress() {
  Alert.alert(ar.reset.title, ar.reset.chooseBody, [
    { text: ar.reset.logsOnly, onPress: () => confirmReset(ar.reset.logsOnlyConfirm, resetLogsOnly) },
    { text: ar.reset.logsAndDeeds, style: 'destructive', onPress: () => confirmReset(ar.reset.logsAndDeedsConfirm, resetLogsAndDeeds) },
    { text: ar.reset.factory, style: 'destructive', onPress: () => confirmReset(ar.reset.factoryConfirm, factoryReset) },
    { text: ar.reset.cancel, style: 'cancel' },
  ]);
}

export default function AccountScreen() {
  const router = useRouter();
  const user = useUser();
  const insets = useSafeAreaInsets();
  const syncStatus = useSyncStatus();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.dangerLabel}>{ar.reset.sectionLabel}</Text>
        <Pressable style={styles.resetBtn} onPress={onResetPress}>
          <Ionicons name="trash-outline" size={18} color={theme.colors.missed} style={styles.resetIcon} />
          <Text style={styles.resetBtnText}>{ar.reset.title}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: ThemeType) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
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
      flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
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
    syncStatusRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 24 },
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

    // Danger zone (reset progress)
    footer: { paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.surface, gap: 12 },
    dangerLabel: { color: theme.colors.muted, fontFamily: theme.font, fontSize: 13, textAlign: 'center' },
    resetBtn: {
      flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.missed,
    },
    resetIcon: {},
    resetBtnText: { color: theme.colors.missed, fontFamily: theme.font, fontSize: 16 },
  });
}
