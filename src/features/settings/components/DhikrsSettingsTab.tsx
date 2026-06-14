import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeType, rtlRow } from '@/ui/theme';
import { ar } from '@/i18n/ar';
import { toArabicNumeral } from '@/i18n/format';
import { DhikrRow } from '@/db/schema';

interface DhikrsSettingsTabProps {
  dhikrsList: DhikrRow[];
  onEditDhikr: (dhikr: DhikrRow) => void;
  onDeleteDhikr: (id: string, name: string) => void;
}

export function DhikrsSettingsTab({
  dhikrsList,
  onEditDhikr,
  onDeleteDhikr,
}: DhikrsSettingsTabProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.dhikrsBlock}>
      {dhikrsList.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{ar.settings.dhikrs.noCounters}</Text>
        </View>
      ) : (
        dhikrsList.map((dk) => (
          <View key={dk.id} style={styles.deedCard} testID={`dhikr-card-${dk.id}`}>
            <View style={styles.deedInfo}>
              <Text style={styles.deedName}>{dk.name}</Text>
              {dk.target && (
                <View style={styles.metaRow}>
                  <View style={styles.metaBadge}>
                    <Text style={styles.metaText}>
                      {`${ar.counters.target}: ${toArabicNumeral(dk.target)}`}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.cardActions}>
              <Pressable
                testID={`btn-edit-dhikr-${dk.id}`}
                onPress={() => onEditDhikr(dk)}
                hitSlop={8}
                style={styles.actionBtn}
              >
                <Ionicons name="pencil-outline" size={20} color={theme.colors.muted} />
              </Pressable>
              <Pressable
                testID={`btn-delete-dhikr-${dk.id}`}
                onPress={() => onDeleteDhikr(dk.id, dk.name)}
                hitSlop={8}
                style={styles.actionBtn}
              >
                <Ionicons name="trash-outline" size={20} color={theme.colors.missed} />
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function createStyles(theme: ThemeType) {
  return StyleSheet.create({
    dhikrsBlock: {
      marginBottom: 20,
    },
    emptyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.colors.translucentBorder,
      alignItems: 'center',
    },
    emptyText: {
      color: theme.colors.muted,
      fontFamily: theme.font,
      fontSize: 14,
    },
    deedCard: {
      flexDirection: rtlRow,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.translucentBorder,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    deedInfo: {
      flex: 1,
      alignItems: I18nManager.isRTL ? 'flex-start' : 'flex-end',
      gap: 6,
    },
    deedName: {
      color: theme.colors.text,
      fontFamily: theme.fontBold,
      fontSize: 16,
      textAlign: 'right',
    },
    metaRow: {
      flexDirection: rtlRow,
      flexWrap: 'wrap',
      gap: 6,
    },
    metaBadge: {
      backgroundColor: theme.colors.translucentBg,
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    metaText: {
      color: theme.colors.muted,
      fontFamily: theme.font,
      fontSize: 11,
    },
    cardActions: {
      flexDirection: rtlRow,
      alignItems: 'center',
      gap: 12,
    },
    actionBtn: {
      padding: 4,
    },
  });
}
