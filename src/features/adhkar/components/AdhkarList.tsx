import React from 'react';
import { View, Text, ScrollView, I18nManager } from 'react-native';
import { useTheme } from '@/ui/theme';
import { toArabicNumeral } from '@/i18n/format';
import { DhikrItem } from '@/domain/azkarData';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { DhikrCard } from '@/features/adhkar/components/DhikrCard';

export interface AdhkarListProps {
  items: DhikrItem[];
  counts: number[];
  onIncrement: (index: number, nextVal: number) => void;
  onResetItem: (index: number) => void;
  bottomInset?: number;
}

export function AdhkarList({ items, counts, onIncrement, onResetItem, bottomInset = 40 }: AdhkarListProps) {
  const theme = useTheme();
  const total = items.length;
  const completedCount = items.filter((it, i) => (counts[i] ?? 0) >= it.count).length;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ marginHorizontal: 16, marginTop: 10, marginBottom: 14 }}>
        <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ color: theme.colors.muted, fontFamily: theme.font, fontSize: 13, lineHeight: 22 }}>
            الأذكار المنجزة
          </Text>
          <Text style={{ color: theme.colors.text, fontFamily: theme.fontBold, fontSize: 15, lineHeight: 22 }}>
            {`‎${toArabicNumeral(completedCount)} / ${toArabicNumeral(total)} (${toArabicNumeral(percentage)}%)`}
          </Text>
        </View>
        <ProgressBar value={completedCount} total={total} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset }}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item, index) => (
          <DhikrCard
            key={index}
            item={item}
            index={index}
            currentCount={counts[index] ?? 0}
            onIncrement={onIncrement}
            onResetItem={onResetItem}
          />
        ))}
      </ScrollView>
    </View>
  );
}
