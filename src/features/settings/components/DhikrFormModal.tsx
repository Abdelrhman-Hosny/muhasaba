import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, StyleSheet, Alert, I18nManager } from 'react-native';
import { useTheme, ThemeType } from '@/ui/theme';
import { ar } from '@/i18n/ar';
import { DhikrRow } from '@/db/schema';
import { ThemedTextInput } from '@/shared/components/ThemedTextInput';
import { ModalActions } from '@/shared/components/ModalActions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DhikrFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    id: string | null;
    name: string;
    target: number | null;
  }) => void;
  dhikr: DhikrRow | null;
}

export function DhikrFormModal({
  visible,
  onClose,
  onSave,
  dhikr,
}: DhikrFormModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Form State
  const [dhikrName, setDhikrName] = useState('');
  const [dhikrTarget, setDhikrTarget] = useState('');

  // Load state when dhikr changes or visible toggles
  useEffect(() => {
    if (visible) {
      if (dhikr) {
        setDhikrName(dhikr.name);
        setDhikrTarget(dhikr.target ? String(dhikr.target) : '');
      } else {
        setDhikrName('');
        setDhikrTarget('');
      }
    }
  }, [visible, dhikr]);

  const handleSave = () => {
    if (!dhikrName.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال اسم الذكر');
      return;
    }

    const targetVal = dhikrTarget ? parseInt(dhikrTarget, 10) : null;

    onSave({
      id: dhikr ? dhikr.id : null,
      name: dhikrName.trim(),
      target: targetVal,
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.modalTitle}>
            {dhikr ? ar.settings.dhikrs.edit : ar.settings.dhikrs.add}
          </Text>

          <View style={styles.modalForm}>
            {/* Dhikr Name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{ar.settings.dhikrs.name}</Text>
              <ThemedTextInput
                testID="input-dhikr-name"
                placeholder={ar.settings.dhikrs.placeholderName}
                value={dhikrName}
                onChangeText={setDhikrName}
              />
            </View>

            {/* Target (Optional) */}
            <View style={[styles.formGroup, { marginBottom: 24 }]}>
              <Text style={styles.formLabel}>{ar.settings.dhikrs.target}</Text>
              <ThemedTextInput
                testID="input-dhikr-target"
                placeholder="مثال: 100"
                keyboardType="number-pad"
                value={dhikrTarget}
                onChangeText={(text) => setDhikrTarget(text.replace(/[^0-9]/g, ''))}
              />
            </View>
          </View>

          {/* Modal Actions */}
          <ModalActions
            onSave={handleSave}
            onCancel={onClose}
            testIDSave="btn-save-dhikr"
            testIDCancel="btn-cancel-dhikr"
          />
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: ThemeType) {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlayBg,
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: theme.colors.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 24,
    },
    modalTitle: {
      color: theme.colors.text,
      fontFamily: theme.fontBold,
      fontSize: 18,
      textAlign: 'center',
      marginBottom: 16,
    },
    modalForm: {
      paddingBottom: 24,
    },
    formGroup: {
      marginBottom: 16,
      width: '100%',
      alignItems: I18nManager.isRTL ? 'flex-start' : 'flex-end',
    },
    formLabel: {
      color: theme.colors.muted,
      fontFamily: theme.font,
      fontSize: 13,
      marginBottom: 8,
      textAlign: I18nManager.isRTL ? 'left' : 'right',
      alignSelf: 'stretch',
    },
  });
}
