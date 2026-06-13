import { EDITABLE_DAYS_BACK } from '@/config';
import { editableDates, todayKey, weekdayIndex } from '@/domain/dates';
import { ar } from '@/i18n/ar';
import { toArabicNumeral } from '@/i18n/format';
import { useScorecard, setDeedLog, useDatesPercentages, useOldestLogDate } from '@/state/deedStore';
import { DeedRow } from '@/ui/components/DeedRow';
import { useTheme } from '@/ui/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Pressable, ScrollView, Text, View, I18nManager, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Drawer } from '@/ui/components/Drawer';

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

  // Split scorecard into uncompleted sections and completed items
  const { uncompletedSections, completedItems } = useMemo(() => {
    const uncompleted: typeof scorecard = [];
    const completed: typeof scorecard[0]['items'] = [];

    for (const sec of scorecard) {
      const uncompletedItemsInSec: typeof sec.items = [];
      const completedItemsInSec: typeof sec.items = [];

      for (const item of sec.items) {
        const isFading = fadingDeedIds[item.deed.id] !== undefined;
        const isDone = item.log?.status === 'done';
        const isNotDone = item.log?.status === 'not_done';

        if ((isDone || isNotDone) && !isFading) {
          completedItemsInSec.push(item);
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
      completed.push(...completedItemsInSec);
    }

    return { uncompletedSections: uncompleted, completedItems: completed };
  }, [scorecard, fadingDeedIds]);

  // Compute total points and total active tasks for the selected date
  const { totalTasks, donePoints } = useMemo(() => {
    let total = 0;
    let score = 0;
    for (const sec of scorecard) {
      for (const item of sec.items) {
        total += 1;
        const log = item.log;
        if (log) {
          if (item.deed.type === 'boolean') {
            if (log.status === 'done') {
              score += 1;
            }
          } else if (item.deed.type === 'measured' && item.deed.target) {
            const val = log.value ?? 0;
            score += Math.min(1.0, val / item.deed.target);
          }
        }
      }
    }
    return { totalTasks: total, donePoints: score };
  }, [scorecard]);

  const todayPercentage = totalTasks > 0 ? Math.round((donePoints / totalTasks) * 100) : 0;
  const formattedScore = toArabicNumeral(Math.round(donePoints * 10) / 10);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      {/* Header: App Name  ☰ */}
      <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
        <Pressable hitSlop={8} onPress={() => setDrawerVisible(true)}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.muted} />
        </Pressable>
        <Text style={{ color: theme.colors.text, fontFamily: theme.fontBold, fontSize: 20, lineHeight: 30, writingDirection: 'rtl' }}>
          {ar.appName}
        </Text>
      </View>

      {/* Day strip: today (right) → oldest (left) */}
      <ScrollView ref={dateStripRef} horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 6, gap: 8 }}
        style={{ flexGrow: 0 }}>
        {(I18nManager.isRTL ? dates : [...dates].reverse()).map((d) => {
          const active = d === selected;
          const lbl = dayLabel(d, today);
          const pct = datePercentages[d] ?? 0;
          const pctLabel = pct > 0 ? `${toArabicNumeral(pct)}%` : '--';
          return (
            <Pressable key={d} onPress={() => setSelected(d)}
              style={{
                paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                minWidth: 70
              }}>
              <Text style={{ fontFamily: active ? theme.fontBold : theme.font, fontSize: 14, lineHeight: 18, writingDirection: 'rtl', color: active ? theme.colors.onPrimary : theme.colors.text }}>
                {lbl.top}
              </Text>
              <Text style={{ fontFamily: theme.font, fontSize: 11, lineHeight: 15, color: active ? theme.colors.onPrimaryMuted : theme.colors.muted }}>
                {lbl.sub}
              </Text>
              <Text style={{ fontFamily: theme.font, fontSize: 13, lineHeight: 16, color: active ? theme.colors.onPrimaryMuted : theme.colors.muted }}>
                {pctLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Daily progress summary */}
      <View style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 4 }}>
        <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: theme.colors.muted, fontFamily: theme.font, fontSize: 13, lineHeight: 22 }}>{ar.summary.completed}</Text>
          <Text style={{ color: theme.colors.text, fontFamily: theme.fontBold, fontSize: 15, lineHeight: 22 }}>
            {`\u200E${formattedScore} / ${toArabicNumeral(totalTasks)} (${toArabicNumeral(todayPercentage)}%)`}
          </Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.notYet, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${totalTasks > 0 ? (donePoints / totalTasks) * 100 : 0}%`, backgroundColor: theme.colors.primary }} />
        </View>
      </View>

      {/* Scorecard Sections and Deeds List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {uncompletedSections.map(({ section, items }) => (
          <View key={section.id} style={{ marginBottom: 16 }}>
            <Text style={{
              color: theme.colors.text,
              fontFamily: theme.fontBold,
              fontSize: 16,
              textAlign: I18nManager.isRTL ? 'left' : 'right',
              marginBottom: 8,
            }}>
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

        {completedItems.length > 0 && (
          <View style={{ marginTop: 8, marginBottom: 16 }}>
            <Pressable
              onPress={() => setCompletedExpanded(!completedExpanded)}
              style={{
                flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: theme.colors.translucentBg,
                borderRadius: 12,
                marginBottom: 8,
              }}
            >
              <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 8 }}>
                <Text style={{
                  color: theme.colors.muted,
                  fontFamily: theme.fontBold,
                  fontSize: 16,
                }}>
                  {ar.summary.completedSection}
                </Text>
                <Text style={{
                  color: theme.colors.muted,
                  fontFamily: theme.font,
                  fontSize: 14,
                }}>
                  {`(${toArabicNumeral(completedItems.length)})`}
                </Text>
              </View>
              <Ionicons
                name={completedExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.muted}
              />
            </Pressable>

            {completedExpanded && (
              <View style={{ marginTop: 4 }}>
                {completedItems.map(({ deed, log }) => (
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
      </ScrollView>

      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}
