import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '@/ui/theme';

interface ProgressBarProps {
  value: number;
  total: number;
  height?: number;
  animated?: boolean;
  progressAnim?: Animated.Value | Animated.AnimatedInterpolation<string | number>;
  trackColor?: string;
}

export function ProgressBar({
  value,
  total,
  height = 6,
  animated = false,
  progressAnim,
  trackColor,
}: ProgressBarProps) {
  const theme = useTheme();
  const pct = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  const resolvedTrackColor = trackColor || theme.colors.notYet;

  if (animated) {
    const localAnimRef = useRef<Animated.Value | null>(null);
    if (!progressAnim && !localAnimRef.current) {
      localAnimRef.current = new Animated.Value(total > 0 ? value / total : 0);
    }
    const finalAnim = progressAnim || localAnimRef.current!;

    useEffect(() => {
      if (!progressAnim && localAnimRef.current) {
        Animated.timing(localAnimRef.current, {
          toValue: total > 0 ? value / total : 0,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }
    }, [value, total, progressAnim]);

    const widthInterpolation = (finalAnim as Animated.Value).interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: resolvedTrackColor,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <Animated.View
          style={{
            height: '100%',
            backgroundColor: theme.colors.primary,
            width: widthInterpolation,
            borderRadius: height / 2,
          }}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: resolvedTrackColor,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <View
        style={{
          height: '100%',
          backgroundColor: theme.colors.primary,
          width: `${pct}%`,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}
