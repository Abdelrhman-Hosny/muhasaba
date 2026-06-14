import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme, rtlRow } from '@/ui/theme';

interface MultiChipSelectorItem {
  id: string;
  name: string;
}

interface MultiChipSelectorProps {
  items: MultiChipSelectorItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

/**
 * Horizontal chip selector that allows selecting multiple items at once.
 * Used to pick which sections a deed applies to (e.g. صلاة الجماعة across prayers).
 */
export function MultiChipSelector({ items, selectedIds, onToggle }: MultiChipSelectorProps) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.horizontalChips, { flexDirection: rtlRow }]}
    >
      {items.map((item) => {
        const selected = selectedIds.includes(item.id);
        return (
          <Pressable
            key={item.id}
            testID={`multichip-${item.id}`}
            onPress={() => onToggle(item.id)}
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
