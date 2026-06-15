import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  NestedReorderableList,
  ReorderableListReorderEvent,
  reorderItems,
  useReorderableDrag,
} from 'react-native-reorderable-list';
import { useTheme, ThemeType, rtlRow } from '@/ui/theme';
import { ar } from '@/i18n/ar';
import { toArabicNumeral } from '@/i18n/format';
import { getScheduleLabel } from '@/domain/schedule';
import { ScorecardStructureSection, reorderDeeds } from '@/state/deedStore';
import { DeedRow } from '@/db/schema';

interface DeedsSettingsTabProps {
  scorecardStructure: ScorecardStructureSection[];
  dhikrNamesMap: Map<string, string>;
  onEditDeed: (deed: DeedRow) => void;
  onDeleteDeed: (deed: DeedRow) => void;
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
        <DeedSection
          key={section.id}
          sectionName={section.name}
          deeds={deeds}
          dhikrNamesMap={dhikrNamesMap}
          onEditDeed={onEditDeed}
          onDeleteDeed={onDeleteDeed}
          theme={theme}
          styles={styles}
        />
      ))}
    </>
  );
}

interface DeedSectionProps {
  sectionName: string;
  deeds: DeedRow[];
  dhikrNamesMap: Map<string, string>;
  onEditDeed: (deed: DeedRow) => void;
  onDeleteDeed: (deed: DeedRow) => void;
  theme: ThemeType;
  styles: ReturnType<typeof createStyles>;
}

function DeedSection({
  sectionName,
  deeds,
  dhikrNamesMap,
  onEditDeed,
  onDeleteDeed,
  theme,
  styles,
}: DeedSectionProps) {
  // Local copy so a drag updates the order instantly; the live query reconciles
  // to the persisted order once reorderDeeds writes to the database.
  const [items, setItems] = useState(deeds);
  useEffect(() => {
    setItems(deeds);
  }, [deeds]);

  const handleReorder = ({ from, to }: ReorderableListReorderEvent) => {
    const next = reorderItems(items, from, to);
    setItems(next);
    reorderDeeds(next.map((d) => d.id));
  };

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionHeader}>{sectionName}</Text>

      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{ar.settings.deeds.noDeeds}</Text>
        </View>
      ) : (
        <NestedReorderableList
          data={items}
          onReorder={handleReorder}
          keyExtractor={(deed) => deed.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <DeedCard
              deed={item}
              dhikrNamesMap={dhikrNamesMap}
              onEditDeed={onEditDeed}
              onDeleteDeed={onDeleteDeed}
              theme={theme}
              styles={styles}
            />
          )}
        />
      )}
    </View>
  );
}

interface DeedCardProps {
  deed: DeedRow;
  dhikrNamesMap: Map<string, string>;
  onEditDeed: (deed: DeedRow) => void;
  onDeleteDeed: (deed: DeedRow) => void;
  theme: ThemeType;
  styles: ReturnType<typeof createStyles>;
}

function DeedCard({ deed, dhikrNamesMap, onEditDeed, onDeleteDeed, theme, styles }: DeedCardProps) {
  const drag = useReorderableDrag();

  const scheduleLabel = getScheduleLabel(deed.schedule);
  const typeLabel =
    deed.type === 'boolean'
      ? ar.settings.deeds.typeBoolean
      : `${ar.settings.deeds.typeMeasured} (هدف: ${toArabicNumeral(deed.target ?? 0)})`;

  const linkedDhikrName = deed.linkedDhikrId ? dhikrNamesMap.get(deed.linkedDhikrId) : null;

  return (
    <View style={styles.deedCard} testID={`deed-card-${deed.id}`}>
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
          testID={`btn-reorder-deed-${deed.id}`}
          onPressIn={drag}
          hitSlop={8}
          style={styles.actionBtn}
        >
          <Ionicons name="reorder-three-outline" size={22} color={theme.colors.muted} />
        </Pressable>
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
          onPress={() => onDeleteDeed(deed)}
          hitSlop={8}
          style={styles.actionBtn}
        >
          <Ionicons name="trash-outline" size={20} color={theme.colors.missed} />
        </Pressable>
      </View>
    </View>
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
