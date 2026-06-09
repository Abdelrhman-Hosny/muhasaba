import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Prayer, PrayerStatus, toggleStatus, isDone } from '@/domain/prayers';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

export function PrayerRow({ prayer, status, onChange }: {
  prayer: Prayer; status: PrayerStatus; onChange: (next: PrayerStatus) => void;
}) {
  const done = isDone(status);
  return (
    <Pressable onPress={() => onChange(toggleStatus(status))}
      style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: done ? theme.colors.surfaceDone : theme.colors.surface,
        borderWidth: 1, borderColor: done ? theme.colors.primary : 'transparent',
        padding: 16, borderRadius: 12, marginBottom: 8 }}>
      <Text style={{ color: done ? theme.colors.text : theme.colors.muted, fontFamily: theme.font, fontSize: 18 }}>
        {ar.prayers[prayer]}
      </Text>
      <Ionicons name={done ? 'checkbox' : 'square-outline'} size={26}
        color={done ? theme.colors.primary : theme.colors.muted} />
    </Pressable>
  );
}
