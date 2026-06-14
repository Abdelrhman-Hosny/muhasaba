import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme, rtlRow } from '@/ui/theme';

interface ChipSelectorItem {
  id: string | null;
  name: string;
}

interface ChipSelectorProps {
  items: ChipSelectorItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function ChipSelector({ items, selectedId, onSelect }: ChipSelectorProps) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.horizontalChips, { flexDirection: rtlRow }]}
    >
      {items.map((item) => {
        const selected = selectedId === item.id;
        return (
          <Pressable
            key={item.id ?? 'none'}
            onPress={() => onSelect(item.id)}
            style={[
              styles.chip,
              {
                backgroundColor: theme.colors.translucentBg,
                borderColor: theme.colors.translucentBorder,
              },
              selected && {
                backgroundColor: theme.colors.translucentPrimaryBorder,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: theme.colors.muted,
                  fontFamily: theme.font,
                },
                selected && {
                  color: theme.colors.primary,
                  fontFamily: theme.fontBold,
                },
              ]}
            >
              {item.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  horizontalChips: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
  },
});
