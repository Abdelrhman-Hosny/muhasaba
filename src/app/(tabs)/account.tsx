import { View, Text, Pressable } from 'react-native';
import { useObs } from '@/state/useObs';
import { user$, signOut } from '@/state/auth';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

export default function Account() {
  const user = useObs(user$);
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, padding: 24 }}>
      <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 24, marginBottom: 24, textAlign: 'right' }}>{ar.tabs.account}</Text>
      <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 18, textAlign: 'right' }}>{user?.name ?? ''}</Text>
      <Text style={{ color: theme.colors.muted, fontFamily: theme.font, marginBottom: 32, textAlign: 'right' }}>{user?.email ?? ''}</Text>
      <Pressable onPress={signOut} style={{ backgroundColor: theme.colors.missed, padding: 14, borderRadius: 12, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontFamily: theme.font }}>{ar.account.signOut}</Text>
      </Pressable>
    </View>
  );
}
