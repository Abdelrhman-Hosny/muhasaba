import { EDITABLE_DAYS_BACK } from '@/config';
import { editableDates, todayKey, weekdayIndex } from '@/domain/dates';
import { ar } from '@/i18n/ar';
import { toArabicNumeral } from '@/i18n/format';
import { useScorecard, setDeedLog, useDatesPercentages } from '@/state/deedStore';
import { DeedRow } from '@/ui/components/DeedRow';
import { useTheme } from '@/ui/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import { Pressable, ScrollView, Text, View, I18nManager } from 'react-native';
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
  const dates = editableDates(today, EDITABLE_DAYS_BACK); // today → oldest
  const [selected, setSelected] = useState(today);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const scorecard = useScorecard(selected);
  const datePercentages = useDatesPercentages(dates);

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
      {/* Header: ☰  App Name */}
      <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
        <Text style={{ color: theme.colors.text, fontFamily: theme.fontBold, fontSize: 20 }}>
          {ar.appName}
        </Text>
        <Pressable hitSlop={8} onPress={() => setDrawerVisible(true)}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.muted} />
        </Pressable>
      </View>

      {/* Day strip: today (right) → oldest (left) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8 }}
        style={{ maxHeight: 90 }}>
        {(I18nManager.isRTL ? dates : [...dates].reverse()).map((d) => {
          const active = d === selected;
          const lbl = dayLabel(d, today);
          const pct = datePercentages[d] ?? 0;
          const pctLabel = pct > 0 ? `${toArabicNumeral(pct)}%` : '--';
          return (
            <Pressable key={d} onPress={() => setSelected(d)}
              style={{
                paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center',
                backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                minWidth: 70
              }}>
              <Text style={{ fontFamily: active ? theme.fontBold : theme.font, fontSize: 14, color: active ? '#fff' : theme.colors.text }}>
                {lbl.top}
              </Text>
              <Text style={{ fontFamily: theme.font, fontSize: 11, color: active ? '#dfeee5' : theme.colors.muted }}>
                {lbl.sub}
              </Text>
              <Text style={{ fontFamily: theme.font, fontSize: 13, color: active ? '#dfeee5' : theme.colors.muted, marginTop: 2 }}>
                {pctLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Daily progress summary */}
      <View style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 4 }}>
        <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <Text style={{ color: theme.colors.muted, fontFamily: theme.font, fontSize: 13 }}>{ar.summary.completed}</Text>
          <Text style={{ color: theme.colors.text, fontFamily: theme.fontBold, fontSize: 15 }}>
            {`\u200E${formattedScore} / ${toArabicNumeral(totalTasks)} (${toArabicNumeral(todayPercentage)}%)`}
          </Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.notYet, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${totalTasks > 0 ? (donePoints / totalTasks) * 100 : 0}%`, backgroundColor: theme.colors.primary }} />
        </View>
      </View>

      {/* Scorecard Sections and Deeds List */}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {scorecard.map(({ section, items }) => (
          <View key={section.id} style={{ marginBottom: 16 }}>
            <Text style={{
              color: theme.colors.primary,
              fontFamily: theme.fontBold,
              fontSize: 16,
              textAlign: I18nManager.isRTL ? 'left' : 'right',
              marginBottom: 8,
            }}>
              {section.name}
            </Text>
            {items.map(({ deed, log }) => (
              <DeedRow
                key={deed.id}
                deed={deed}
                log={log}
                onChange={(status, value) => setDeedLog(selected, deed.id, status, value)}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}
