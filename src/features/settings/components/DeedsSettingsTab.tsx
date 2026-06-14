import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeType, rtlRow } from '@/ui/theme';
import { ar } from '@/i18n/ar';
import { toArabicNumeral } from '@/i18n/format';
import { getScheduleLabel } from '@/domain/schedule';
import { ScorecardStructureSection } from '@/state/deedStore';
import { DeedRow } from '@/db/schema';

interface DeedsSettingsTabProps {
  scorecardStructure: ScorecardStructureSection[];
  dhikrNamesMap: Map<string, string>;
  onEditDeed: (deed: DeedRow) => void;
  onDeleteDeed: (id: string, name: string) => void;
}

export function DeedsSettingsTab({
  scorecardStructure,
  dhikrNamesMap,
  onEditDeed,
  onDeleteDeed,
}: DeedsSettingsTabProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <>
      {scorecardStructure.map(({ section, deeds }) => (
        <View key={section.id} style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>{section.name}</Text>

          {deeds.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{ar.settings.deeds.noDeeds}</Text>
            </View>
          ) : (
            deeds.map((deed) => {
              const scheduleLabel = getScheduleLabel(deed.schedule);
              const typeLabel =
                deed.type === 'boolean'
                  ? ar.settings.deeds.typeBoolean
                  : `${ar.settings.deeds.typeMeasured} (هدف: ${toArabicNumeral(deed.target ?? 0)})`;

              const linkedDhikrName = deed.linkedDhikrId ? dhikrNamesMap.get(deed.linkedDhikrId) : null;

              return (
                <View key={deed.id} style={styles.deedCard} testID={`deed-card-${deed.id}`}>
                  <View style={styles.deedInfo}>
                    <Text style={styles.deedName}>{deed.name}</Text>

                    <View style={styles.metaRow}>
                      <View style={styles.metaBadge}>
                        <Text style={styles.metaText}>{scheduleLabel}</Text>
                      </View>
                      <View style={styles.metaBadge}>
                        <Text style={styles.metaText}>{typeLabel}</Text>
                      </View>
                    </View>

                    {linkedDhikrName && (
                      <View style={styles.linkedBadge}>
                        <Ionicons name="link-outline" size={12} color={theme.colors.primary} />
                        <Text style={styles.linkedText}>
                          {`${ar.settings.deeds.linkedDhikr}: ${linkedDhikrName}`}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Card Actions */}
                  <View style={styles.cardActions}>
                    <Pressable
                      testID={`btn-edit-deed-${deed.id}`}
                      onPress={() => onEditDeed(deed)}
                      hitSlop={8}
                      style={styles.actionBtn}
                    >
                      <Ionicons name="pencil-outline" size={20} color={theme.colors.muted} />
                    </Pressable>
                    <Pressable
                      testID={`btn-delete-deed-${deed.id}`}
                      onPress={() => onDeleteDeed(deed.id, deed.name)}
                      hitSlop={8}
                      style={styles.actionBtn}
                    >
                      <Ionicons name="trash-outline" size={20} color={theme.colors.missed} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      ))}
    </>
  );
}

function createStyles(theme: ThemeType) {
  return StyleSheet.create({
    sectionBlock: {
      marginBottom: 20,
    },
    sectionHeader: {
      color: theme.colors.primary,
      fontFamily: theme.fontBold,
      fontSize: 15,
      marginHorizontal: 16,
      marginBottom: 8,
      textAlign: I18nManager.isRTL ? 'right' : 'left',
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
      textAlign: I18nManager.isRTL ? 'right' : 'left',
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
    linkedBadge: {
      flexDirection: rtlRow,
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    linkedText: {
      color: theme.colors.primary,
      fontFamily: theme.font,
      fontSize: 12,
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
