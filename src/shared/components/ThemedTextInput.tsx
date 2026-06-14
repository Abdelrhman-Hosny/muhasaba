import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useTheme, rtlAlign } from '@/ui/theme';

interface ThemedTextInputProps extends TextInputProps {
  // Can add custom props here
}

export function ThemedTextInput(props: ThemedTextInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      placeholderTextColor={theme.colors.inputPlaceholder}
      {...props}
      style={[
        styles.input,
        {
          backgroundColor: theme.colors.translucentBgActive,
          color: theme.colors.text,
          fontFamily: theme.font,
          textAlign: rtlAlign,
          borderColor: theme.colors.translucentBorder,
        },
        props.style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    width: '100%',
  },
});
