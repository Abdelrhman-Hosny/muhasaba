import React, { useMemo } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeType, rtlRow } from '@/ui/theme';
import { toArabicNumeral } from '@/i18n/format';
import { ar } from '@/i18n/ar';
import { ProgressBar } from '@/shared/components/ProgressBar';

interface CounterListItem {
  dhikr: {
    id: string;
    name: string;
    target: number | null;
  };
  log: {
    count: number;
  } | null;
}

interface CounterListProps {
  dhikrsList: CounterListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CounterList({
  dhikrsList,
  selectedId,
  onSelect,
  onDelete,
}: CounterListProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (dhikrsList.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {ar.counters.noCounters}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollView}
    >
      {dhikrsList.map(({ dhikr, log }) => {
        const active = dhikr.id === selectedId;
        const count = log?.count ?? 0;
        const target = dhikr.target;
        const hasTarget = target !== null && target > 0;
        const completed = hasTarget && count >= (target ?? 0);

        return (
          <Pressable
            key={dhikr.id}
            testID={`counter-row-${dhikr.id}`}
            onPress={() => onSelect(dhikr.id)}
            style={[
              styles.card,
              {
                backgroundColor: active ? theme.colors.surfaceDone : theme.colors.surface,
                borderColor: active ? theme.colors.primary : theme.colors.translucentBorder,
                elevation: active ? 1 : 0,
              },
            ]}
          >
            <View style={styles.cardContent}>
              <View style={styles.textContainer}>
                <Text style={[styles.nameText, { color: theme.colors.text }]}>
                  {dhikr.name}
                </Text>
                <View style={styles.subtextContainer}>
                  <Text style={[styles.countText, { color: completed ? theme.colors.primary : theme.colors.muted }]}>
                    {`\u200E${toArabicNumeral(count)}${hasTarget ? ` / ${toArabicNumeral(target ?? 0)}` : ''}`}
                  </Text>
                </View>
              </View>

              <View style={styles.actionContainer}>
                <Pressable
                  testID={`btn-delete-${dhikr.id}`}
                  onPress={() => onDelete(dhikr.id)}
                  hitSlop={8}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={20} color={theme.colors.muted} />
                </Pressable>
              </View>
            </View>

            {hasTarget && (
              <ProgressBar
                value={count}
                total={target ?? 0}
                height={4}
                trackColor={theme.colors.translucentBorder}
              />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles(theme: ThemeType) {
  return StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    emptyContainer: {
      alignItems: 'center',
      marginTop: 40,
      paddingHorizontal: 16,
    },
    emptyText: {
      color: theme.colors.muted,
      fontFamily: theme.font,
      textAlign: 'center',
      fontSize: 16,
    },
    card: {
      borderWidth: 1.5,
      borderRadius: 14,
      marginBottom: 10,
      overflow: 'hidden',
    },
    cardContent: {
      flexDirection: rtlRow,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    textContainer: {
      flexDirection: 'column',
      alignItems: I18nManager.isRTL ? 'flex-start' : 'flex-end',
      flex: 1,
      paddingEnd: 8,
    },
    nameText: {
      fontFamily: theme.font,
      fontSize: 18,
      fontWeight: 'bold',
    },
    subtextContainer: {
      flexDirection: rtlRow,
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    countText: {
      fontFamily: theme.font,
      fontSize: 14,
    },
    actionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    deleteBtn: {
      padding: 4,
    },
  });
}
