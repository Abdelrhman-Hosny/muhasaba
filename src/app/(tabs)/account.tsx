import { View, Text } from 'react-native';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

export default function Account() {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: theme.colors.text, fontFamily: theme.font }}>{ar.tabs.account}</Text>
    </View>
  );
}
