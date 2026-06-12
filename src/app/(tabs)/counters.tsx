import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

export default function CountersScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: theme.colors.muted, fontFamily: theme.font, fontSize: 18 }}>{ar.tabs.counters}</Text>
    </View>
  );
}
