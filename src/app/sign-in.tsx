import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { signInWithGoogle } from '@/state/auth';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

export default function SignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPress() {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError('تعذّر تسجيل الدخول، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: theme.colors.text, fontSize: 40, fontFamily: theme.font, marginBottom: 8 }}>{ar.appName}</Text>
      <Text style={{ color: theme.colors.muted, fontFamily: theme.font, marginBottom: 32, textAlign: 'center' }}>{ar.account.signInPrompt}</Text>
      <Pressable onPress={onPress} disabled={loading}
        style={{ backgroundColor: theme.colors.primary, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, minWidth: 220, alignItems: 'center' }}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontFamily: theme.font, fontSize: 16 }}>{ar.account.signInGoogle}</Text>}
      </Pressable>
      {error ? <Text style={{ color: theme.colors.missed, marginTop: 16, fontFamily: theme.font }}>{error}</Text> : null}
    </View>
  );
}
