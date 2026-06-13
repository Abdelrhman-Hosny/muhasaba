import { useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, LayoutChangeEvent, GestureResponderEvent, I18nManager, Modal, ScrollView, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/ui/theme';
import { toArabicNumeral } from '@/i18n/format';
import { DeedRow as DeedRowType, DeedLogRow } from '@/db/schema';
import { createMMKV } from 'react-native-mmkv';
import { morningAdhkar, eveningAdhkar, DhikrItem } from '@/domain/azkarData';
import { todayKey } from '@/domain/dates';

const adhkarStorage = createMMKV({ id: 'muhassaba-adhkar-progress' });

/**
 * Custom gesture-based slider component using standard React Native touch properties.
 */
function CustomSlider({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (val: number) => void;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const trackRef = useRef<View>(null);
  const [leftOffset, setLeftOffset] = useState(0);

  const handleTouch = (evt: GestureResponderEvent) => {
    if (width === 0) return;
    const touchX = evt.nativeEvent.pageX - leftOffset;
    const pct = Math.max(0, Math.min(1, touchX / width));
    const val = Math.round(pct * max);
    onChange(val);
  };

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
    trackRef.current?.measure((x, y, w, h, pageX) => {
      setLeftOffset(pageX);
    });
  };

  const progressPct = Math.min(100, (value / max) * 100);

  return (
    <View
      testID="slider-track"
      ref={trackRef}
      onLayout={onLayout}
      onTouchStart={handleTouch}
      onTouchMove={handleTouch}
      style={{
        height: 40,
        justifyContent: 'center',
        width: '100%',
      }}
    >
      {/* Slider Track Background */}
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: theme.colors.translucentBgActive,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Active Progress Fill */}
        <View
          style={{
            height: '100%',
            width: `${progressPct}%`,
            backgroundColor: theme.colors.primary,
            borderRadius: 3,
          }}
        />

        {/* Sliding Thumb handle */}
        <View
          style={{
            position: 'absolute',
            left: `${progressPct}%`,
            top: -7, // centers thumb vertically
            marginLeft: -10, // offsets half thumb width
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: '#fff',
            borderWidth: 2,
            borderColor: theme.colors.primary,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 3,
          }}
        />
      </View>
    </View>
  );
}

interface DhikrCardProps {
  item: DhikrItem;
  index: number;
  currentCount: number;
  onIncrement: (index: number, nextVal: number) => void;
  onResetItem: (index: number) => void;
}

function DhikrCard({ item, index, currentCount, onIncrement, onResetItem }: DhikrCardProps) {
  const theme = useTheme();
  const isCompleted = currentCount >= item.count;
  const [scaleAnim] = useState(new Animated.Value(1));
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: Math.min(1, currentCount / item.count),
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [currentCount, item.count]);

  const handlePress = () => {
    if (isCompleted) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.98, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onIncrement(index, currentCount + 1);
  };

  const textContainer = (
    <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={[cardStyles.dhikrText, { color: theme.colors.text }]}>{item.dhikr}</Text>
      </View>
      <View style={cardStyles.countTextContainer}>
        <Text style={[cardStyles.counterText, { color: isCompleted ? theme.colors.primary : theme.colors.text, fontFamily: theme.fontBold }]}>
          {`\u200E${toArabicNumeral(currentCount)} / ${toArabicNumeral(item.count)}`}
        </Text>
      </View>
    </View>
  );

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        testID={`dhikr-card-${index}`}
        onPress={handlePress}
        style={[
          cardStyles.card,
          {
            backgroundColor: isCompleted ? theme.colors.surfaceDone : theme.colors.surface,
            borderColor: isCompleted ? theme.colors.primary : theme.colors.translucentBorder,
          },
        ]}
      >
        <View style={cardStyles.cardContent}>
          {textContainer}

          {item.description ? (
            <View style={[cardStyles.descriptionBox, { backgroundColor: theme.colors.translucentPrimary }]}>
              {I18nManager.isRTL ? (
                <>
                  <Text style={[cardStyles.descriptionText, { color: theme.colors.muted }]}>{item.description}</Text>
                  <Ionicons name="sparkles-outline" size={14} color={theme.colors.primary} style={cardStyles.descIcon} />
                </>
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={14} color={theme.colors.primary} style={cardStyles.descIcon} />
                  <Text style={[cardStyles.descriptionText, { color: theme.colors.muted }]}>{item.description}</Text>
                </>
              )}
            </View>
          ) : null}

          <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
            {item.reference ? (
              <Text style={[cardStyles.referenceText, { color: theme.colors.placeholderText, flex: 1 }]}>{item.reference}</Text>
            ) : <View style={{ flex: 1 }} />}

            {currentCount > 0 && !isCompleted ? (
              <Pressable
                onPress={(e) => {
                  e?.stopPropagation?.();
                  onResetItem(index);
                }}
                style={cardStyles.cardResetButton}
                hitSlop={8}
              >
                <Text style={{ color: theme.colors.missed, fontFamily: theme.font, fontSize: 11 }}>تصفير</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Horizontal Progress Bar */}
          <View style={[cardStyles.progressBarTrack, { backgroundColor: theme.colors.translucentBorder }]}>
            <Animated.View
              style={[
                cardStyles.progressBarFill,
                {
                  backgroundColor: theme.colors.primary,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
    gap: 10,
  },
  textContainer: {
    flex: 1,
    gap: 8,
  },
  dhikrText: {
    fontSize: 17,
    lineHeight: 28,
    textAlign: I18nManager.isRTL ? 'left' : 'right',
  },
  descriptionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    marginTop: 2,
  },
  descIcon: {
    marginTop: 2,
  },
  descriptionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    textAlign: I18nManager.isRTL ? 'left' : 'right',
  },
  referenceText: {
    fontSize: 11,
    textAlign: I18nManager.isRTL ? 'left' : 'right',
  },
  countTextContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  counterText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardResetButton: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});

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

  const isAdhkarDeed = deed.definitionId === 'adhkar_morning' || deed.definitionId === 'adhkar_evening';
  const [modalVisible, setModalVisible] = useState(false);
  const activeAdhkar = deed.definitionId === 'adhkar_morning' ? morningAdhkar : eveningAdhkar;
  const totalItems = activeAdhkar.length;
  const type = deed.definitionId === 'adhkar_morning' ? 'morning' : 'evening';

  // State for progress inside modal
  const [progress, setProgress] = useState<number[]>([]);

  useEffect(() => {
    if (modalVisible && isAdhkarDeed) {
      // Clean up keys for other dates in the background so they do not accumulate
      const today = todayKey();
      try {
        const keys = adhkarStorage.getAllKeys();
        for (const key of keys) {
          if (!key.startsWith(`progress:${today}:`)) {
            adhkarStorage.remove(key);
          }
        }
      } catch (err) {
        console.error('Error cleaning up MMKV keys:', err);
      }

      const loaded: number[] = [];
      for (let i = 0; i < totalItems; i++) {
        const val = adhkarStorage.getNumber(`progress:${date}:${type}:${i}`) ?? 0;
        loaded.push(val);
      }
      setProgress(loaded);
    }
  }, [modalVisible, date, type, totalItems, isAdhkarDeed]);

  const updateProgress = (index: number, nextVal: number) => {
    adhkarStorage.set(`progress:${date}:${type}:${index}`, nextVal);
    setProgress((prev) => {
      const next = [...prev];
      next[index] = nextVal;
      return next;
    });
  };

  const resetAll = () => {
    for (let i = 0; i < totalItems; i++) {
      adhkarStorage.remove(`progress:${date}:${type}:${i}`);
    }
    setProgress(new Array(totalItems).fill(0));
  };

  const completedCount = useMemo(() => {
    if (progress.length === 0) return 0;
    return activeAdhkar.reduce((acc, item, index) => {
      const current = progress[index] ?? 0;
      return acc + (current >= item.count ? 1 : 0);
    }, 0);
  }, [progress, activeAdhkar]);

  const completionPercentage = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  // Auto-mark deed as done if all progress items are completed
  useEffect(() => {
    if (isAdhkarDeed && progress.length > 0 && progress.length === totalItems) {
      const allDone = progress.every((val, idx) => val >= activeAdhkar[idx].count);
      if (allDone && !done) {
        onChange('done', null);
      }
    }
  }, [progress, isAdhkarDeed, totalItems, activeAdhkar, done, onChange]);

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
            flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: done ? theme.colors.surfaceDone : (notDone ? 'rgba(239, 68, 68, 0.08)' : theme.colors.surface),
            borderWidth: 1,
            borderColor: done ? theme.colors.primary : (notDone ? theme.colors.missed : theme.colors.translucentBorder),
            padding: 16,
            borderRadius: 12,
            marginBottom: 8,
          }}
        >
          <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 12 }}>
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
          <Modal
            animationType="slide"
            transparent={false}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: 40 }}>
              {/* Header */}
              <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
                <Pressable hitSlop={8} onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={26} color={theme.colors.muted} />
                </Pressable>
                <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 8 }}>
                  <Ionicons
                    name="book-outline"
                    size={22}
                    color={theme.colors.primary}
                  />
                  <Text style={{ color: theme.colors.text, fontFamily: theme.fontBold, fontSize: 20 }}>
                    {deed.name}
                  </Text>
                </View>
                <Pressable
                  onPress={resetAll}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: theme.colors.translucentBgActive }}
                  hitSlop={8}
                >
                  <Ionicons name="refresh-outline" size={16} color={theme.colors.muted} />
                  <Text style={{ color: theme.colors.muted, fontFamily: theme.font, fontSize: 12 }}>
                    تصفير الكل
                  </Text>
                </Pressable>
              </View>

              {/* Progress Summary */}
              <View style={{ marginHorizontal: 16, marginTop: 10, marginBottom: 14 }}>
                <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ color: theme.colors.muted, fontFamily: theme.font, fontSize: 13, lineHeight: 22 }}>
                    الأذكار المنجزة
                  </Text>
                  <Text style={{ color: theme.colors.text, fontFamily: theme.fontBold, fontSize: 15, lineHeight: 22 }}>
                    {`\u200E${toArabicNumeral(completedCount)} / ${toArabicNumeral(totalItems)} (${toArabicNumeral(completionPercentage)}%)`}
                  </Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: theme.colors.notYet }}>
                  <View
                    style={{
                      height: '100%',
                      width: `${totalItems > 0 ? (completedCount / totalItems) * 100 : 0}%`,
                      backgroundColor: theme.colors.primary,
                    }}
                  />
                </View>
              </View>

              {/* Cards ScrollView */}
              <ScrollView
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
              >
                {activeAdhkar.map((item, index) => {
                  const currentCount = progress[index] ?? 0;
                  return (
                    <DhikrCard
                      key={`${deed.definitionId}-${index}`}
                      item={item}
                      index={index}
                      currentCount={currentCount}
                      onIncrement={updateProgress}
                      onResetItem={(idx) => updateProgress(idx, 0)}
                    />
                  );
                })}
              </ScrollView>

              {/* Bottom Confirm/Complete Button */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: 20,
                  backgroundColor: theme.colors.surface,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.translucentBorder,
                }}
              >
                <Pressable
                  onPress={() => {
                    onChange('done', null);
                    setModalVisible(false);
                  }}
                  style={{
                    height: 50,
                    borderRadius: 12,
                    backgroundColor: theme.colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: theme.colors.onPrimary, fontFamily: theme.fontBold, fontSize: 16 }}>
                    إتمام العبادة وتسجيلها
                  </Text>
                </Pressable>
              </View>
            </View>
          </Modal>
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
        backgroundColor: done ? theme.colors.surfaceDone : (notDone ? 'rgba(239, 68, 68, 0.08)' : theme.colors.surface),
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
          flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
        }}
      >
        <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', gap: 8 }}>
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
            <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
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
