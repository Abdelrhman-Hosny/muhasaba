import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeType, rtlRow, rtlAlign } from '@/ui/theme';
import { toArabicNumeral } from '@/i18n/format';
import { ar } from '@/i18n/ar';

interface KeypadPanelProps {
  onIncrement: (amount: number) => void;
  onReset: () => void;
}

export function KeypadPanel({ onIncrement, onReset }: KeypadPanelProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [customValue, setCustomValue] = useState<string>('');
  const [mode, setMode] = useState<'add' | 'sub'>('add');

  const handleIncrement = (amount: number) => {
    const finalAmount = mode === 'add' ? amount : -amount;
    onIncrement(finalAmount);
  };

  const handleCustomSubmit = () => {
    const val = parseInt(customValue, 10);
    if (isNaN(val) || val <= 0) return;
    const finalAmount = mode === 'add' ? val : -val;
    onIncrement(finalAmount);
    setCustomValue('');
  };

  return (
    <View style={styles.container}>
      {/* Keypad Grid */}
      <View style={styles.gridRow}>
        {[1, 5, 10].map((amount) => (
          <Pressable
            key={amount}
            testID={`btn-keypad-${amount}`}
            onPress={() => handleIncrement(amount)}
            style={styles.keypadBtn}
          >
            <Text style={[styles.keypadText, { color: theme.colors.primary, fontFamily: theme.fontBold }]}>
              {mode === 'add' ? '+' : '-'}{toArabicNumeral(amount)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.gridRow}>
        {[25, 50, 100].map((amount) => (
          <Pressable
            key={amount}
            testID={`btn-keypad-${amount}`}
            onPress={() => handleIncrement(amount)}
            style={styles.keypadBtn}
          >
            <Text style={[styles.keypadText, { color: theme.colors.primary, fontFamily: theme.fontBold }]}>
              {mode === 'add' ? '+' : '-'}{toArabicNumeral(amount)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Custom entry & Mode / Reset */}
      <View style={styles.actionRow}>
        {/* Custom Input */}
        <View style={styles.inputContainer}>
          <TextInput
            testID="input-custom-count"
            placeholder={ar.counters.custom}
            placeholderTextColor={theme.colors.placeholderText}
            keyboardType="number-pad"
            value={customValue}
            onChangeText={(text) => setCustomValue(text.replace(/[^0-9]/g, ''))}
            onSubmitEditing={handleCustomSubmit}
            returnKeyType="done"
            style={[
              styles.textInput,
              {
                fontFamily: theme.font,
                color: theme.colors.text,
                textAlign: rtlAlign,
              },
            ]}
          />
          {customValue.length > 0 && (
            <Pressable
              testID="btn-custom-submit-inline"
              onPress={handleCustomSubmit}
              hitSlop={8}
              style={styles.inlineSubmitBtn}
            >
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
            </Pressable>
          )}
        </View>

        {/* Mode Toggle Segmented */}
        <View style={styles.modeToggleContainer}>
          <Pressable
            testID="btn-mode-add"
            onPress={() => setMode('add')}
            style={[
              styles.modeBtn,
              {
                backgroundColor: mode === 'add' ? theme.colors.primary : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.modeText,
                {
                  fontFamily: theme.font,
                  color: mode === 'add' ? theme.colors.onPrimary : theme.colors.muted,
                },
              ]}
            >
              +
            </Text>
          </Pressable>
          <Pressable
            testID="btn-mode-sub"
            onPress={() => setMode('sub')}
            style={[
              styles.modeBtn,
              {
                backgroundColor: mode === 'sub' ? theme.colors.primary : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.modeText,
                {
                  fontFamily: theme.font,
                  color: mode === 'sub' ? theme.colors.onPrimary : theme.colors.muted,
                },
              ]}
            >
              -
            </Text>
          </Pressable>
        </View>

        {/* Reset */}
        <Pressable
          testID="btn-reset"
          onPress={onReset}
          style={[
            styles.resetBtn,
            {
              borderColor: theme.colors.missed,
            },
          ]}
        >
          <Text style={[styles.resetText, { fontFamily: theme.font, color: theme.colors.missed }]}>
            {ar.counters.reset}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: ThemeType) {
  return StyleSheet.create({
    container: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.translucentBorderStrong,
      padding: 16,
      paddingBottom: 16,
      backgroundColor: theme.colors.surface,
    },
    gridRow: {
      flexDirection: rtlRow,
      gap: 10,
      marginBottom: 10,
    },
    keypadBtn: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceDone,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    keypadText: {
      fontSize: 18,
      writingDirection: 'ltr',
    },
    actionRow: {
      flexDirection: rtlRow,
      alignItems: 'center',
      gap: 10,
    },
    inputContainer: {
      flex: 1.8,
      height: 48,
      flexDirection: rtlRow,
      alignItems: 'center',
      backgroundColor: theme.colors.translucentBgActive,
      borderRadius: 12,
      paddingHorizontal: 12,
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      height: '100%',
    },
    inlineSubmitBtn: {
      padding: 4,
      marginRight: 4,
    },
    modeToggleContainer: {
      flex: 1.2,
      height: 48,
      flexDirection: rtlRow,
      backgroundColor: theme.colors.translucentBgActive,
      borderRadius: 12,
      padding: 3,
    },
    modeBtn: {
      flex: 1,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modeText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    resetBtn: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      backgroundColor: theme.colors.notDoneBg,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
  });
}
