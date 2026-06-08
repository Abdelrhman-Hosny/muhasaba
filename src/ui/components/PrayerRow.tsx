import { Pressable, Text, View } from 'react-native';
import { Prayer, PrayerStatus, cyclePrayerStatus } from '@/domain/prayers';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

const STATUS_COLOR: Record<PrayerStatus, string> = {
  not_yet: theme.colors.notYet,
  on_time: theme.colors.onTime,
  late: theme.colors.late,
  missed: theme.colors.missed,
};

export function PrayerRow({ prayer, status, onChange }: {
  prayer: Prayer; status: PrayerStatus; onChange: (next: PrayerStatus) => void;
}) {
  return (
    <Pressable onPress={() => onChange(cyclePrayerStatus(status))}
      style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 8 }}>
      <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 18 }}>{ar.prayers[prayer]}</Text>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: STATUS_COLOR[status], marginLeft: 8 }} />
        <Text style={{ color: theme.colors.muted, fontFamily: theme.font }}>{ar.prayerStatus[status]}</Text>
      </View>
    </Pressable>
  );
}
