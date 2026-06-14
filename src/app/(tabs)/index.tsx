import { EDITABLE_DAYS_BACK } from '@/config';
import { editableDates, todayKey, weekdayIndex } from '@/domain/dates';
import { ar } from '@/i18n/ar';
import { toArabicNumeral } from '@/i18n/format';
import { useScorecard, setDeedLog, useDatesPercentages, useOldestLogDate } from '@/state/deedStore';
import { computeScorecardScore } from '@/state/scoring';
import { DeedRow } from '@/ui/components/DeedRow';
import { useTheme, ThemeType, rtlRow } from '@/ui/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Pressable, ScrollView, Text, View, I18nManager, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';
import { Drawer } from '@/ui/components/Drawer';
import { ProgressBar } from '@/shared/components/ProgressBar';

function dayLabel(date: string, today: string): { top: string; sub: string } {
  const dd = date.slice(8); // DD
  const days = editableDates(today, EDITABLE_DAYS_BACK);
  if (date === today) return { top: ar.days.today, sub: dd };
  if (date === days[1]) return { top: ar.days.yesterday, sub: dd };
  return { top: ar.weekdays[weekdayIndex(date)], sub: dd };
}

export default function DayScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const today = todayKey();
  const oldestLogDate = useOldestLogDate();

  const dates = useMemo(() => {
    if (!oldestLogDate) {
      return [today];
    }
    const oldest = new Date(oldestLogDate);
    const curr = new Date(today);
    oldest.setHours(0, 0, 0, 0);
    curr.setHours(0, 0, 0, 0);

    const diffMs = curr.getTime() - oldest.getTime();
    const diffDays = Math.max(0, Math.round(diffMs / 86400000));

    const daysBack = Math.min(EDITABLE_DAYS_BACK, diffDays);
    return editableDates(today, daysBack);
  }, [today, oldestLogDate]);

  const [selected, setSelected] = useState(today);

  useEffect(() => {
    if (!dates.includes(selected)) {
      setSelected(today);
    }
  }, [dates, selected, today]);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(false);

  const scorecard = useScorecard(selected);
  const datePercentages = useDatesPercentages(dates);

  const dateStripRef = useRef<ScrollView>(null);

  useEffect(() => {
    const datesList = I18nManager.isRTL ? dates : [...dates].reverse();
    const idx = datesList.indexOf(selected);
    if (idx !== -1 && dateStripRef.current) {
      const itemWidth = 78; // minWidth 70 + gap 8
      const offset = idx * itemWidth;
      dateStripRef.current.scrollTo({ x: offset, animated: true });
    }
  }, [selected, dates]);

  const [fadingDeedIds, setFadingDeedIds] = useState<Record<string, Animated.Value>>({});

  useEffect(() => {
    setFadingDeedIds({});
  }, [selected]);

  const handleDeedChange = (deedId: string, status: 'done' | 'not_yet' | 'not_done', value: number | null) => {
    if (status === 'done' || status === 'not_done') {
      const anim = new Animated.Value(1);
      setFadingDeedIds(prev => ({ ...prev, [deedId]: anim }));

      // Update DB immediately so progress bar updates
      setDeedLog(selected, deedId, status, value);

      Animated.timing(anim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }).start(() => {
        setFadingDeedIds(prev => {
          const next = { ...prev };
          delete next[deedId];
          return next;
        });
      });
    } else {
      // If unchecked, immediately update DB (and if it was fading, stop it)
      setFadingDeedIds(prev => {
        if (prev[deedId]) {
          const next = { ...prev };
          delete next[deedId];
          return next;
        }
        return prev;
      });
      setDeedLog(selected, deedId, status, value);
    }
  };

  // Split scorecard into uncompleted sections, done items, and skipped items
  const { uncompletedSections, doneItems, skippedItems } = useMemo(() => {
    const uncompleted: typeof scorecard = [];
    const done: typeof scorecard[0]['items'] = [];
    const skipped: typeof scorecard[0]['items'] = [];

    for (const sec of scorecard) {
      const uncompletedItemsInSec: typeof sec.items = [];

      for (const item of sec.items) {
        const isFading = fadingDeedIds[item.deed.id] !== undefined;
        const isDone = item.log?.status === 'done';
        const isNotDone = item.log?.status === 'not_done';

        if (isDone && !isFading) {
          done.push(item);
        } else if (isNotDone && !isFading) {
          skipped.push(item);
        } else {
          uncompletedItemsInSec.push(item);
        }
      }

      if (uncompletedItemsInSec.length > 0) {
        uncompleted.push({
          section: sec.section,
          items: uncompletedItemsInSec,
        });
      }
    }

    return { uncompletedSections: uncompleted, doneItems: done, skippedItems: skipped };
  }, [scorecard, fadingDeedIds]);

  const completedCount = doneItems.length + skippedItems.length;

  // Compute total points and total active tasks for the selected date
  const { totalTasks, donePoints } = useMemo(() => {
    const allItems = scorecard.flatMap((sec) => sec.items);
    return computeScorecardScore(allItems);
  }, [scorecard]);

  const todayPercentage = totalTasks > 0 ? Math.round((donePoints / totalTasks) * 100) : 0;
  const formattedScore = toArabicNumeral(Math.round(donePoints * 10) / 10);

  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

  return (
    <View style={styles.container}>
      {/* Header: App Name  ☰ */}
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => setDrawerVisible(true)}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.muted} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {ar.appName}
        </Text>
      </View>

      {/* Day strip: today (right) → oldest (left) */}
      <ScrollView
        ref={dateStripRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStripContent}
        style={styles.dateStripScroll}
      >
        {(I18nManager.isRTL ? dates : [...dates].reverse()).map((d) => {
          const active = d === selected;
          const lbl = dayLabel(d, today);
          const pct = datePercentages[d] ?? 0;
          const pctLabel = pct > 0 ? `${toArabicNumeral(pct)}%` : '--';
          return (
            <Pressable
              key={d}
              onPress={() => setSelected(d)}
              style={[
                styles.dateBtn,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.dateBtnTop,
                  {
                    fontFamily: active ? theme.fontBold : theme.font,
                    color: active ? theme.colors.onPrimary : theme.colors.text,
                  },
                ]}
              >
                {lbl.top}
              </Text>
              <Text
                style={[
                  styles.dateBtnSub,
                  {
                    color: active ? theme.colors.onPrimaryMuted : theme.colors.muted,
                  },
                ]}
              >
                {lbl.sub}
              </Text>
              <Text
                style={[
                  styles.dateBtnPct,
                  {
                    color: active ? theme.colors.onPrimaryMuted : theme.colors.muted,
                  },
                ]}
              >
                {pctLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Daily progress summary */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: theme.colors.muted }]}>
            {ar.summary.completed}
          </Text>
          <Text style={[styles.progressValue, { color: theme.colors.text }]}>
            {`\u200E${formattedScore} / ${toArabicNumeral(totalTasks)} (${toArabicNumeral(todayPercentage)}%)`}
          </Text>
        </View>
        <ProgressBar
          value={donePoints}
          total={totalTasks}
          height={6}
          trackColor={theme.colors.notYet}
        />
      </View>

      {/* Scorecard Sections and Deeds List */}
      <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
        {uncompletedSections.map(({ section, items }) => (
          <View key={section.id} style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {section.name}
            </Text>
            {items.map(({ deed, log }) => {
              const fadeAnim = fadingDeedIds[deed.id];
              const rowElement = (
                <DeedRow
                  key={deed.id}
                  deed={deed}
                  log={log}
                  date={selected}
                  onChange={(status, value) => handleDeedChange(deed.id, status, value)}
                />
              );

              if (fadeAnim) {
                return (
                  <Animated.View key={deed.id} style={{ opacity: fadeAnim }}>
                    {rowElement}
                  </Animated.View>
                );
              }
              return rowElement;
            })}
          </View>
        ))}

        {completedCount > 0 && (
          <View style={styles.completedContainer}>
            <Pressable
              onPress={() => setCompletedExpanded(!completedExpanded)}
              style={[
                styles.completedHeader,
                {
                  backgroundColor: theme.colors.translucentBg,
                },
              ]}
            >
              <View style={styles.completedTitleBlock}>
                <Text style={[styles.completedTitleText, { color: theme.colors.muted }]}>
                  {ar.summary.completedSection}
                </Text>
                <Text style={[styles.completedCountText, { color: theme.colors.muted }]}>
                  {`(${toArabicNumeral(completedCount)})`}
                </Text>
              </View>
              <Ionicons
                name={completedExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.muted}
              />
            </Pressable>

            {completedExpanded && (
              <View style={styles.completedContent}>
                {doneItems.length > 0 && (
                  <View
                    style={{
                      marginBottom: skippedItems.length > 0 ? 16 : 0,
                    }}
                  >
                    <View style={styles.subsectionHeader}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                      <Text style={[styles.subsectionTitle, { color: theme.colors.muted }]}>
                        {`${ar.summary.doneSection} (${toArabicNumeral(doneItems.length)})`}
                      </Text>
                    </View>
                    {doneItems.map(({ deed, log }) => (
                      <DeedRow
                        key={deed.id}
                        deed={deed}
                        log={log}
                        date={selected}
                        onChange={(status, value) => handleDeedChange(deed.id, status, value)}
                      />
                    ))}
                  </View>
                )}

                {skippedItems.length > 0 && (
                  <View>
                    <View style={styles.subsectionHeader}>
                      <Ionicons name="close-circle" size={16} color={theme.colors.missed} />
                      <Text style={[styles.subsectionTitle, { color: theme.colors.muted }]}>
                        {`${ar.summary.skippedSection} (${toArabicNumeral(skippedItems.length)})`}
                      </Text>
                    </View>
                    {skippedItems.map(({ deed, log }) => (
                      <DeedRow
                        key={deed.id}
                        deed={deed}
                        log={log}
                        date={selected}
                        onChange={(status, value) => handleDeedChange(deed.id, status, value)}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

function createStyles(theme: ThemeType, insets: EdgeInsets) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
      paddingTop: insets.top,
    },
    header: {
      flexDirection: rtlRow,
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    headerTitle: {
      fontFamily: theme.fontBold,
      fontSize: 20,
      lineHeight: 30,
    },
    dateStripScroll: {
      flexGrow: 0,
    },
    dateStripContent: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 6,
      gap: 8,
    },
    dateBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 70,
    },
    dateBtnTop: {
      fontSize: 14,
      lineHeight: 18,
    },
    dateBtnSub: {
      fontFamily: theme.font,
      fontSize: 11,
      lineHeight: 15,
    },
    dateBtnPct: {
      fontFamily: theme.font,
      fontSize: 13,
      lineHeight: 16,
    },
    progressContainer: {
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 4,
    },
    progressHeader: {
      flexDirection: rtlRow,
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    progressTitle: {
      fontFamily: theme.font,
      fontSize: 13,
      lineHeight: 22,
    },
    progressValue: {
      fontFamily: theme.fontBold,
      fontSize: 15,
      lineHeight: 22,
    },
    listScroll: {
      flex: 1,
    },
    listContent: {
      padding: 16,
    },
    sectionBlock: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontFamily: theme.fontBold,
      fontSize: 16,
      textAlign: I18nManager.isRTL ? 'left' : 'right',
      marginBottom: 8,
    },
    completedContainer: {
      marginTop: 8,
      marginBottom: 16,
    },
    completedHeader: {
      flexDirection: rtlRow,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 8,
    },
    completedTitleBlock: {
      flexDirection: rtlRow,
      alignItems: 'center',
      gap: 8,
    },
    completedTitleText: {
      fontFamily: theme.fontBold,
      fontSize: 16,
    },
    completedCountText: {
      fontFamily: theme.font,
      fontSize: 14,
    },
    completedContent: {
      marginTop: 4,
    },
    subsectionHeader: {
      flexDirection: rtlRow,
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    subsectionTitle: {
      fontFamily: theme.fontBold,
      fontSize: 14,
    },
  });
}
