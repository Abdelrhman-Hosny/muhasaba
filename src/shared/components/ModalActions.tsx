import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme, rtlRow } from '@/ui/theme';

interface ModalActionsProps {
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  testIDSave?: string;
  testIDCancel?: string;
}

export function ModalActions({
  onSave,
  onCancel,
  saveLabel = 'حفظ',
  cancelLabel = 'إلغاء',
  testIDSave,
  testIDCancel,
}: ModalActionsProps) {
  const theme = useTheme();

  return (
    <View style={[styles.modalActions, { flexDirection: rtlRow }]}>
      <Pressable
        style={[styles.modalSaveBtn, { backgroundColor: theme.colors.primary }]}
        onPress={onSave}
        testID={testIDSave}
      >
        <Text style={[styles.modalSaveText, { color: theme.colors.onPrimary, fontFamily: theme.fontBold }]}>
          {saveLabel}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.modalCancelBtn, { backgroundColor: theme.colors.translucentBgActive }]}
        onPress={onCancel}
        testID={testIDCancel}
      >
        <Text style={[styles.modalCancelText, { color: theme.colors.text, fontFamily: theme.font }]}>
          {cancelLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  modalActions: {
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  modalSaveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
  },
});
