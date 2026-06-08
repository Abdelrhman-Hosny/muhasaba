import { Pressable, Text, View } from 'react-native';
import { Habit, isHabitComplete, nextBooleanValue } from '@/domain/habits';
import { theme } from '@/ui/theme';
import { Ionicons } from '@expo/vector-icons';

export function HabitRow({ habit, value, onChange }: {
  habit: Habit; value: number; onChange: (next: number) => void;
}) {
  const done = isHabitComplete(habit, value);
  function onPress() {
    if (habit.type === 'boolean') onChange(nextBooleanValue(value));
    else onChange(value + 1);
  }
  return (
    <Pressable onPress={onPress}
      style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 8 }}>
      <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 18 }}>{habit.name}</Text>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
        {habit.type === 'count' ? (
          <Text style={{ color: theme.colors.muted, fontFamily: theme.font, marginLeft: 8 }}>{value}/{habit.target}</Text>
        ) : null}
        <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={24}
          color={done ? theme.colors.primary : theme.colors.muted} />
      </View>
    </Pressable>
  );
}
