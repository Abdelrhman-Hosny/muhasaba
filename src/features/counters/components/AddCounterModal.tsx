import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { useTheme, ThemeType } from '@/ui/theme';
import { ar } from '@/i18n/ar';
import { ThemedTextInput } from '@/shared/components/ThemedTextInput';
import { ModalActions } from '@/shared/components/ModalActions';

interface AddCounterModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, target: number | null) => void;
}

export function AddCounterModal({ visible, onClose, onSave }: AddCounterModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');

  // Reset inputs when modal closes or opens
  useEffect(() => {
    if (!visible) {
      setNewName('');
      setNewTarget('');
    }
  }, [visible]);

  const handleSave = () => {
    if (!newName.trim()) return;
    const targetVal = newTarget ? parseInt(newTarget, 10) : null;
    onSave(newName.trim(), isNaN(targetVal as any) ? null : targetVal);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {ar.counters.newCounter}
          </Text>

          {/* Name input */}
          <ThemedTextInput
            testID="input-new-name"
            placeholder={ar.counters.name}
            value={newName}
            onChangeText={setNewName}
            style={styles.nameInput}
          />

          {/* Target input */}
          <ThemedTextInput
            testID="input-new-target"
            placeholder={ar.counters.targetOptional}
            keyboardType="number-pad"
            value={newTarget}
            onChangeText={(text) => setNewTarget(text.replace(/[^0-9]/g, ''))}
            style={styles.targetInput}
          />

          {/* Modal Actions */}
          <ModalActions
            onSave={handleSave}
            onCancel={onClose}
            saveLabel={ar.counters.add}
            cancelLabel={ar.counters.cancel}
            testIDSave="btn-modal-add"
            testIDCancel="btn-modal-cancel"
          />
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: ThemeType) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.overlayBg,
    },
    modalContent: {
      width: '85%',
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    title: {
      fontFamily: theme.font,
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 20,
    },
    nameInput: {
      marginBottom: 12,
    },
    targetInput: {
      marginBottom: 24,
    },
  });
}
