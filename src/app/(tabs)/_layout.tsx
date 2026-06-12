import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.bg,
          borderTopColor: theme.colors.surface,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarLabelStyle: {
          fontFamily: theme.font,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: ar.tabs.day,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'today' : 'today-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="week"
        options={{
          title: ar.tabs.week,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="counters"
        options={{
          title: ar.tabs.counters,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'hand-left' : 'hand-left-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
