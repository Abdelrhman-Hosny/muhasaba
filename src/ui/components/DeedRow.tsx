import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/ui/theme';
import { toArabicNumeral } from '@/i18n/format';
import { DeedRow as DeedRowType, DeedLogRow } from '@/db/schema';

export function DeedRow({
  deed,
  log,
  onChange,
}: {
  deed: DeedRowType;
  log: DeedLogRow | null;
  onChange: (status: 'done' | 'not_yet', value: number | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const done = log?.status === 'done';

  // Boolean checkbox deed
  if (deed.type === 'boolean') {
    return (
      <Pressable
        testID="btn-toggle"
        onPress={() => onChange(done ? 'not_yet' : 'done', null)}
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: done ? theme.colors.surfaceDone : theme.colors.surface,
          borderWidth: 1,
          borderColor: done ? theme.colors.primary : 'transparent',
          padding: 16,
          borderRadius: 12,
          marginBottom: 8,
        }}
      >
        <Text style={{ color: done ? theme.colors.text : theme.colors.muted, fontFamily: theme.font, fontSize: 18 }}>
          {deed.name}
        </Text>
        <Ionicons
          name={done ? 'checkbox' : 'square-outline'}
          size={26}
          color={done ? theme.colors.primary : theme.colors.muted}
        />
      </Pressable>
    );
  }

  // Measured deed (e.g. pages count, target-based slider/stepper)
  const target = deed.target ?? 1;
  const currentValue = log?.value ?? 0;
  const progressPct = Math.min(100, (currentValue / target) * 100);

  const handleIncrement = (amount: number) => {
    const nextVal = Math.max(0, Math.min(target, currentValue + amount));
    const nextStatus = nextVal >= target ? 'done' : 'not_yet';
    onChange(nextStatus, nextVal);
  };

  return (
    <View
      style={{
        backgroundColor: done ? theme.colors.surfaceDone : theme.colors.surface,
        borderWidth: 1,
        borderColor: done ? theme.colors.primary : 'transparent',
        borderRadius: 12,
        marginBottom: 8,
        overflow: 'hidden',
      }}
    >
      <Pressable
        testID="btn-expand"
        onPress={() => setExpanded(!expanded)}
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
        }}
      >
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: done ? theme.colors.text : theme.colors.muted, fontFamily: theme.font, fontSize: 18 }}>
            {deed.name}
          </Text>
          <Text style={{ color: theme.colors.muted, fontFamily: theme.font, fontSize: 14 }}>
            ({toArabicNumeral(currentValue)}/{toArabicNumeral(target)})
          </Text>
        </View>
        <Ionicons
          name={done ? 'checkbox' : 'square-outline'}
          size={26}
          color={done ? theme.colors.primary : theme.colors.muted}
        />
      </Pressable>

      {/* Embedded Progress bar always visible at the bottom of the card */}
      <View style={{ height: 3, backgroundColor: 'rgba(0,0,0,0.05)', width: '100%' }}>
        <View style={{ height: '100%', width: `${progressPct}%`, backgroundColor: theme.colors.primary }} />
      </View>

      {/* Stepper increment/decrement buttons visible when expanded */}
      {expanded && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            paddingHorizontal: 16,
            gap: 20,
            backgroundColor: 'rgba(0,0,0,0.02)',
          }}
        >
          {/* Decrement Button */}
          <Pressable
            testID="btn-decrement"
            onPress={() => handleIncrement(-1)}
            disabled={currentValue === 0}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: theme.colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.1)',
              opacity: currentValue === 0 ? 0.5 : 1,
            }}
          >
            <Ionicons name="remove" size={20} color={theme.colors.text} />
          </Pressable>

          {/* Current Count Stepper Value */}
          <Text style={{ fontFamily: theme.font, fontSize: 18, color: theme.colors.text, minWidth: 60, textAlign: 'center' }}>
            {toArabicNumeral(currentValue)}
          </Text>

          {/* Increment Button */}
          <Pressable
            testID="btn-increment"
            onPress={() => handleIncrement(1)}
            disabled={currentValue === target}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: theme.colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.1)',
              opacity: currentValue === target ? 0.5 : 1,
            }}
          >
            <Ionicons name="add" size={20} color={theme.colors.text} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
