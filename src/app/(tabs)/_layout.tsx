import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.surface },
        tabBarLabelStyle: { fontFamily: theme.font },
      }}>
      <Tabs.Screen name="index" options={{ title: ar.tabs.today, tabBarIcon: ({ color, size }) => <Ionicons name="today" color={color} size={size} /> }} />
      <Tabs.Screen name="history" options={{ title: ar.tabs.history, tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: ar.tabs.account, tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }} />
    </Tabs>
  );
}
