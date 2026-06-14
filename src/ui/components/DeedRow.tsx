import { useState } from 'react';
import { View, Text, Pressable, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, rtlRow } from '@/ui/theme';
import { toArabicNumeral } from '@/i18n/format';
import { DeedRow as DeedRowType, DeedLogRow } from '@/db/schema';
import { CustomSlider } from '@/shared/components/CustomSlider';
import { AdhkarModal } from '@/features/adhkar/components/AdhkarModal';
import { hasDeedAdhkar } from '@/domain/deedAdhkar';

export function DeedRow({
  deed,
  log,
  date,
  onChange,
}: {
  deed: DeedRowType;
  log: DeedLogRow | null;
  date: string;
  onChange: (status: 'done' | 'not_yet' | 'not_done', value: number | null) => void;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const done = log?.status === 'done';
  const notDone = log?.status === 'not_done';

  const isAdhkarDeed = hasDeedAdhkar(deed.definitionId);
  const [modalVisible, setModalVisible] = useState(false);

  // Boolean checkbox deed
  if (deed.type === 'boolean') {
    return (
      <>
        <Pressable
          testID="btn-row-press"
          onPress={() => {
            if (notDone) {
              onChange('done', null);
            } else {
              onChange(done ? 'not_yet' : 'done', null);
            }
          }}
          onLongPress={() => {
            onChange(notDone ? 'not_yet' : 'not_done', null);
          }}
          delayLongPress={300}
          style={{
            flexDirection: rtlRow,
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: done ? theme.colors.surfaceDone : (notDone ? theme.colors.notDoneBg : theme.colors.surface),
            borderWidth: 1,
            borderColor: done ? theme.colors.primary : (notDone ? theme.colors.missed : theme.colors.translucentBorder),
            padding: 16,
            borderRadius: 12,
            marginBottom: 8,
          }}
        >
          <View style={{ flexDirection: rtlRow, alignItems: 'center', gap: 12 }}>
            {isAdhkarDeed && (
              <Pressable
                testID="btn-book"
                onPress={(e) => {
                  e?.stopPropagation?.();
                  setModalVisible(true);
                }}
                style={{
                  backgroundColor: theme.colors.translucentBgActive,
                  padding: 8,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name="book-outline"
                  size={20}
                  color={theme.colors.primary}
                />
              </Pressable>
            )}
            <Text style={{
              color: notDone ? theme.colors.muted : theme.colors.text,
              textDecorationLine: notDone ? 'line-through' : 'none',
              fontFamily: theme.font,
              fontSize: 18
            }}>
              {deed.name}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              testID="btn-not-done"
              onPress={(e) => {
                e?.stopPropagation?.();
                onChange(notDone ? 'not_yet' : 'not_done', null);
              }}
              style={{ padding: 4 }}
              hitSlop={8}
            >
              <Ionicons
                name={notDone ? 'close-circle' : 'close-circle-outline'}
                size={26}
                color={notDone ? theme.colors.missed : theme.colors.muted}
              />
            </Pressable>
            <Pressable
              testID="btn-toggle"
              onPress={(e) => {
                e?.stopPropagation?.();
                if (notDone) {
                  onChange('done', null);
                } else {
                  onChange(done ? 'not_yet' : 'done', null);
                }
              }}
              onLongPress={(e) => {
                e?.stopPropagation?.();
                onChange(notDone ? 'not_yet' : 'not_done', null);
              }}
              delayLongPress={300}
              style={{ padding: 4 }}
              hitSlop={8}
            >
              <Ionicons
                name={done ? 'checkbox' : 'square-outline'}
                size={26}
                color={done ? theme.colors.primary : theme.colors.muted}
              />
            </Pressable>
          </View>
        </Pressable>

        {isAdhkarDeed && (
          <AdhkarModal
            visible={modalVisible}
            deed={deed}
            date={date}
            onClose={() => setModalVisible(false)}
            onChange={onChange}
          />
        )}
      </>
    );
  }

  // Measured deed (e.g. pages count, target-based slider/stepper)
  const target = deed.target ?? 1;
  const currentValue = log?.value ?? 0;
  const progressPct = Math.min(100, (currentValue / target) * 100);

  const handleIncrement = (amount: number) => {
    const nextVal = Math.max(0, Math.min(target, currentValue + amount));
    const nextStatus = nextVal >= target ? 'done' : 'not_yet';
    onChange(nextStatus, nextVal);
  };

  const isLargeCounter = target >= 15 || deed.linkedDhikrId !== null;

  return (
    <View
      style={{
        backgroundColor: done ? theme.colors.surfaceDone : (notDone ? theme.colors.notDoneBg : theme.colors.surface),
        borderWidth: 1,
        borderColor: done ? theme.colors.primary : (notDone ? theme.colors.missed : theme.colors.translucentBorder),
        borderRadius: 12,
        marginBottom: 8,
        overflow: 'hidden',
      }}
    >
      <Pressable
        testID="btn-expand"
        onPress={() => setExpanded(!expanded)}
        onLongPress={() => {
          onChange(notDone ? 'not_yet' : 'not_done', notDone ? 0 : null);
        }}
        delayLongPress={300}
        style={{
          flexDirection: rtlRow,
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
        }}
      >
        <View style={{ flexDirection: rtlRow, alignItems: 'center', gap: 8 }}>
          <Text style={{
            color: notDone ? theme.colors.muted : theme.colors.text,
            textDecorationLine: notDone ? 'line-through' : 'none',
            fontFamily: theme.font,
            fontSize: 18
          }}>
            {deed.name}
          </Text>
          <Text style={{ color: theme.colors.muted, fontFamily: theme.font, fontSize: 18 }}>
            {`\u200E(${toArabicNumeral(currentValue)}/${toArabicNumeral(target)})`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            testID="btn-not-done"
            onPress={(e) => {
              e?.stopPropagation?.();
              onChange(notDone ? 'not_yet' : 'not_done', notDone ? 0 : null);
            }}
            style={{ padding: 4 }}
            hitSlop={8}
          >
            <Ionicons
              name={notDone ? 'close-circle' : 'close-circle-outline'}
              size={26}
              color={notDone ? theme.colors.missed : theme.colors.muted}
            />
          </Pressable>
          <Pressable
            testID="btn-quick-toggle"
            onPress={(e) => {
              e?.stopPropagation?.();
              if (notDone) {
                onChange('done', target);
              } else {
                const nextVal = done ? 0 : target;
                const nextStatus = done ? 'not_yet' : 'done';
                onChange(nextStatus, nextVal);
              }
            }}
            onLongPress={(e) => {
              e?.stopPropagation?.();
              onChange(notDone ? 'not_yet' : 'not_done', notDone ? 0 : null);
            }}
            delayLongPress={300}
            style={{ padding: 4 }}
            hitSlop={12}
          >
            <Ionicons
              name={done ? 'checkbox' : 'square-outline'}
              size={26}
              color={done ? theme.colors.primary : theme.colors.muted}
            />
          </Pressable>
        </View>
      </Pressable>

      {/* Embedded Progress bar only visible when collapsed */}
      {!expanded && (
        <View style={{ height: 3, backgroundColor: theme.colors.translucentBorder, width: '100%' }}>
          <View style={{ height: '100%', width: `${progressPct}%`, backgroundColor: theme.colors.primary }} />
        </View>
      )}

      {/* Gesture slider or increment chips visible when expanded */}
      {expanded && (
        <View
          style={{
            paddingVertical: 14,
            paddingHorizontal: 20,
            backgroundColor: theme.colors.translucentBg,
          }}
        >
          {isLargeCounter ? (
            <View style={{ flexDirection: rtlRow, flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              {/* +1 */}
              <Pressable
                testID="btn-chip-1"
                onPress={() => handleIncrement(1)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                }}
              >
                <Text style={{ fontFamily: theme.font, color: theme.colors.primary, fontSize: 15 }}>+1</Text>
              </Pressable>

              {/* +5 */}
              <Pressable
                testID="btn-chip-5"
                onPress={() => handleIncrement(5)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                }}
              >
                <Text style={{ fontFamily: theme.font, color: theme.colors.primary, fontSize: 15 }}>+5</Text>
              </Pressable>

              {/* +10 */}
              <Pressable
                testID="btn-chip-10"
                onPress={() => handleIncrement(10)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                }}
              >
                <Text style={{ fontFamily: theme.font, color: theme.colors.primary, fontSize: 15 }}>+10</Text>
              </Pressable>

              {/* +50 */}
              <Pressable
                testID="btn-chip-50"
                onPress={() => handleIncrement(50)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                }}
              >
                <Text style={{ fontFamily: theme.font, color: theme.colors.primary, fontSize: 15 }}>+50</Text>
              </Pressable>

              {/* -10 (Correction) */}
              <Pressable
                testID="btn-chip-dec"
                onPress={() => handleIncrement(-10)}
                disabled={currentValue === 0}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: currentValue === 0 ? theme.colors.translucentBorderStrong : theme.colors.text,
                  opacity: currentValue === 0 ? 0.5 : 1,
                }}
              >
                <Text style={{ fontFamily: theme.font, color: currentValue === 0 ? theme.colors.inputPlaceholder : theme.colors.text, fontSize: 15 }}>-10</Text>
              </Pressable>

              {/* Reset (تصفير) */}
              <Pressable
                testID="btn-chip-reset"
                onPress={() => handleIncrement(-currentValue)}
                disabled={currentValue === 0}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: currentValue === 0 ? theme.colors.translucentBorderStrong : theme.colors.missed,
                  opacity: currentValue === 0 ? 0.5 : 1,
                }}
              >
                <Text style={{ fontFamily: theme.font, color: currentValue === 0 ? theme.colors.inputPlaceholder : theme.colors.missed, fontSize: 15 }}>تصفير</Text>
              </Pressable>
            </View>
          ) : (
            <CustomSlider
              value={currentValue}
              max={target}
              onChange={(val) => {
                const nextStatus = val >= target ? 'done' : 'not_yet';
                onChange(nextStatus, val);
              }}
            />
          )}
        </View>
      )}
    </View>
  );
}
