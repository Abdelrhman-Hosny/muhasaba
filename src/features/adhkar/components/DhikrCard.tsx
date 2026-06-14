import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeType } from '@/ui/theme';
import { toArabicNumeral } from '@/i18n/format';
import { DhikrItem } from '@/domain/azkarData';
import { ProgressBar } from '@/shared/components/ProgressBar';

export interface DhikrCardProps {
  item: DhikrItem;
  index: number;
  currentCount: number;
  onIncrement: (index: number, nextVal: number) => void;
  onResetItem: (index: number) => void;
}

export function DhikrCard({ item, index, currentCount, onIncrement, onResetItem }: DhikrCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
        <Text style={[styles.dhikrText, { color: theme.colors.text }]}>{item.dhikr}</Text>
      </View>
      <View style={styles.countTextContainer}>
        <Text style={[styles.counterText, { color: isCompleted ? theme.colors.primary : theme.colors.text, fontFamily: theme.fontBold }]}>
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
          styles.card,
          {
            backgroundColor: isCompleted ? theme.colors.surfaceDone : theme.colors.surface,
            borderColor: isCompleted ? theme.colors.primary : theme.colors.translucentBorder,
          },
        ]}
      >
        <View style={styles.cardContent}>
          {textContainer}

          {item.description ? (
            <View style={[styles.descriptionBox, { backgroundColor: theme.colors.translucentPrimary }]}>
              {I18nManager.isRTL ? (
                <>
                  <Text style={[styles.descriptionText, { color: theme.colors.muted }]}>{item.description}</Text>
                  <Ionicons name="sparkles-outline" size={14} color={theme.colors.primary} style={styles.descIcon} />
                </>
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={14} color={theme.colors.primary} style={styles.descIcon} />
                  <Text style={[styles.descriptionText, { color: theme.colors.muted }]}>{item.description}</Text>
                </>
              )}
            </View>
          ) : null}

          <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
            {item.reference ? (
              <Text style={[styles.referenceText, { color: theme.colors.placeholderText, flex: 1 }]}>{item.reference}</Text>
            ) : <View style={{ flex: 1 }} />}

            {currentCount > 0 && !isCompleted ? (
              <Pressable
                onPress={(e) => {
                  e?.stopPropagation?.();
                  onResetItem(index);
                }}
                style={styles.cardResetButton}
                hitSlop={8}
              >
                <Text style={{ color: theme.colors.missed, fontFamily: theme.font, fontSize: 11 }}>تصفير</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Horizontal Progress Bar */}
          <ProgressBar
            value={currentCount}
            total={item.count}
            animated
            progressAnim={progressAnim}
            trackColor={theme.colors.translucentBorder}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(theme: ThemeType) {
  return StyleSheet.create({
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
  });
}
