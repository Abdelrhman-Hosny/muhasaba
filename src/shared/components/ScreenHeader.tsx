import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, rtlRow } from '@/ui/theme';

interface ScreenHeaderProps {
  title: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  center?: boolean;
  borderBottom?: boolean;
}

export function ScreenHeader({
  title,
  leftAction,
  rightAction,
  center = false,
  borderBottom = false,
}: ScreenHeaderProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          flexDirection: rtlRow,
          justifyContent: center ? 'center' : 'space-between',
        },
        borderBottom && {
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.surface,
        },
      ]}
    >
      {center ? (
        <>
          {leftAction && <View style={styles.absoluteLeft}>{leftAction}</View>}
          <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: theme.fontBold }]}>
            {title}
          </Text>
          {rightAction && <View style={styles.absoluteRight}>{rightAction}</View>}
        </>
      ) : (
        <>
          {leftAction || <View />}
          {title ? (
            <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: theme.fontBold }]}>
              {title}
            </Text>
          ) : null}
          {rightAction || <View />}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    padding: 16,
    width: '100%',
    minHeight: 56,
  },
  headerTitle: {
    fontSize: 20,
  },
  absoluteLeft: {
    position: 'absolute',
    left: 16,
  },
  absoluteRight: {
    position: 'absolute',
    right: 16,
  },
});
