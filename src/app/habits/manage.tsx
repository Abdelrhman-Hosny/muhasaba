import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Switch } from 'react-native';
import { useObs } from '@/state/useObs';
import * as Crypto from 'expo-crypto';
import { Habit } from '@/domain/habits';
import { user$ } from '@/state/auth';
import { habits$ } from '@/state/stores';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';

export default function ManageHabits() {
  const uid = useObs(user$)?.id ?? '';
  const habits = Object.values(useObs(habits$) ?? {}) as Habit[];
  const [name, setName] = useState('');
  const [isCount, setIsCount] = useState(false);
  const [target, setTarget] = useState('1');

  function addHabit() {
    if (!name.trim()) return;
    const id = Crypto.randomUUID();
    habits$[id].set({
      id, user_id: uid, name: name.trim(), icon: 'star',
      type: isCount ? 'count' : 'boolean',
      target: isCount ? Math.max(1, parseInt(target, 10) || 1) : null,
      sort_order: habits.length, active: true, deleted: false,
    } as any);
    setName(''); setIsCount(false); setTarget('1');
  }

  function archive(h: Habit) {
    habits$[h.id].active.set(false);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 24, marginBottom: 16, textAlign: 'right' }}>{ar.habits.manage}</Text>

      <View style={{ backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 24 }}>
        <TextInput value={name} onChangeText={setName} placeholder={ar.habits.name} placeholderTextColor={theme.colors.muted}
          style={{ color: theme.colors.text, fontFamily: theme.font, textAlign: 'right', fontSize: 16, marginBottom: 12 }} />
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ color: theme.colors.text, fontFamily: theme.font }}>{ar.habits.target}</Text>
          <Switch value={isCount} onValueChange={setIsCount} />
        </View>
        {isCount ? (
          <TextInput value={target} onChangeText={setTarget} keyboardType="number-pad"
            style={{ color: theme.colors.text, fontFamily: theme.font, textAlign: 'right', marginBottom: 12 }} />
        ) : null}
        <Pressable onPress={addHabit} style={{ backgroundColor: theme.colors.primary, padding: 12, borderRadius: 10, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontFamily: theme.font }}>{ar.habits.add}</Text>
        </Pressable>
      </View>

      {habits.filter((h) => h.active).sort((a, b) => a.sort_order - b.sort_order).map((h) => (
        <View key={h.id} style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 8 }}>
          <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 16 }}>{h.name}</Text>
          <Pressable onPress={() => archive(h)}><Text style={{ color: theme.colors.missed, fontFamily: theme.font }}>{ar.habits.archive}</Text></Pressable>
        </View>
      ))}
    </ScrollView>
  );
}
