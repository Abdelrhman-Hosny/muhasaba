import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme, rtlRow } from '@/ui/theme';

interface DayBubblePickerProps {
  selectedDays: number[];
  onToggle: (dayIndex: number) => void;
}

const DAYS = [
  { idx: 0, label: 'ح', name: 'أحد' },
  { idx: 1, label: 'ن', name: 'إثنين' },
  { idx: 2, label: 'ث', name: 'ثلاثاء' },
  { idx: 3, label: 'ر', name: 'أربعاء' },
  { idx: 4, label: 'خ', name: 'خميس' },
  { idx: 5, label: 'ج', name: 'جمعة' },
  { idx: 6, label: 'س', name: 'سبت' },
];

export function DayBubblePicker({ selectedDays, onToggle }: DayBubblePickerProps) {
  const theme = useTheme();

  return (
    <View style={[styles.dayBubblesRow, { flexDirection: rtlRow }]}>
      {DAYS.map((day) => {
        const isSelected = selectedDays.includes(day.idx);
        return (
          <View key={day.idx} style={styles.dayColumn}>
            <Pressable
              testID={`btn-day-bubble-${day.idx}`}
              onPress={() => onToggle(day.idx)}
              style={[
                styles.dayBubble,
                {
                  backgroundColor: theme.colors.translucentBg,
                  borderColor: theme.colors.translucentBorder,
                },
                isSelected && {
                  backgroundColor: theme.colors.translucentPrimaryBorder,
                  borderColor: theme.colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayBubbleText,
                  {
                    fontFamily: theme.font,
                    color: theme.colors.muted,
                  },
                  isSelected && {
                    fontFamily: theme.fontBold,
                    color: theme.colors.primary,
                  },
                ]}
              >
                {day.label}
              </Text>
            </Pressable>
            <Text style={[styles.dayNameLabel, { fontFamily: theme.font, color: theme.colors.muted }]}>
              {day.name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dayBubblesRow: {
    justifyContent: 'space-between',
    marginVertical: 12,
    width: '100%',
  },
  dayColumn: {
    alignItems: 'center',
    gap: 6,
  },
  dayBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBubbleText: {
    fontSize: 14,
  },
  dayNameLabel: {
    fontSize: 10,
  },
});
