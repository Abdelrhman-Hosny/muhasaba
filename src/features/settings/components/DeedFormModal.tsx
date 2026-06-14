import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, ScrollView, StyleSheet, Switch, Alert, I18nManager } from 'react-native';
import { useTheme, ThemeType } from '@/ui/theme';
import { ar } from '@/i18n/ar';
import { DeedRow, SectionRow, DhikrRow } from '@/db/schema';
import { ThemedTextInput } from '@/shared/components/ThemedTextInput';
import { ChipSelector } from '@/shared/components/ChipSelector';
import { MultiChipSelector } from '@/shared/components/MultiChipSelector';
import { DayBubblePicker } from '@/shared/components/DayBubblePicker';
import { ModalActions } from '@/shared/components/ModalActions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DeedFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    id: string | null;
    name: string;
    sectionIds: string[];
    type: 'boolean' | 'measured';
    target: number | null;
    linkedDhikrId: string | null;
    schedule: string;
  }) => void;
  deed: DeedRow | null;
  sectionsList: SectionRow[];
  dhikrsList: DhikrRow[];
}

export function DeedFormModal({
  visible,
  onClose,
  onSave,
  deed,
  sectionsList,
  dhikrsList,
}: DeedFormModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Form State
  const [deedName, setDeedName] = useState('');
  const [deedSectionIds, setDeedSectionIds] = useState<string[]>([]);
  const [deedType, setDeedType] = useState<'boolean' | 'measured'>('boolean');
  const [deedTarget, setDeedTarget] = useState('');
  const [showTargetInput, setShowTargetInput] = useState(false);
  const [deedLinkedDhikrId, setDeedLinkedDhikrId] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  // Load state when deed changes or visible toggles
  useEffect(() => {
    if (visible) {
      if (deed) {
        setDeedName(deed.name);
        setDeedSectionIds([deed.sectionId]);
        setDeedType(deed.type as 'boolean' | 'measured');
        setDeedTarget(deed.target ? String(deed.target) : '');
        setShowTargetInput(deed.type === 'measured');
        setDeedLinkedDhikrId(deed.linkedDhikrId);

        // Parse schedule property
        if (deed.schedule === 'daily' || deed.schedule === 'weekly_anytime') {
          setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
        } else if (deed.schedule === 'weekdays') {
          setSelectedDays([1, 2, 3, 4, 5]);
        } else {
          const parsed = deed.schedule.split(',').map(Number);
          setSelectedDays(parsed.length > 0 ? parsed : [0, 1, 2, 3, 4, 5, 6]);
        }
      } else {
        // Defaults for new custom deed
        setDeedName('');
        setDeedSectionIds(sectionsList[0]?.id ? [sectionsList[0].id] : []);
        setDeedType('boolean');
        setDeedTarget('');
        setShowTargetInput(false);
        setDeedLinkedDhikrId(null);
        setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
      }
    }
  }, [visible, deed, sectionsList]);

  const handleToggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      if (selectedDays.length === 1) {
        Alert.alert('تنبيه', 'يجب اختيار يوم واحد على الأقل للتكرار');
        return;
      }
      setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex].sort((a, b) => a - b));
    }
  };

  const handleToggleSection = (id: string) => {
    setDeedSectionIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (!deedName.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال اسم العبادة');
      return;
    }

    if (deedSectionIds.length === 0) {
      Alert.alert('خطأ', ar.settings.deeds.sectionRequired);
      return;
    }

    // Build schedule string
    let schedule = 'daily';
    if (selectedDays.length === 7) {
      schedule = 'daily';
    } else if (selectedDays.length > 0) {
      schedule = selectedDays.join(',');
    }

    const targetVal = showTargetInput && deedTarget ? parseInt(deedTarget, 10) : null;

    onSave({
      id: deed ? deed.id : null,
      name: deedName.trim(),
      sectionIds: deedSectionIds,
      type: deedType,
      target: targetVal,
      linkedDhikrId: showTargetInput ? deedLinkedDhikrId : null,
      schedule,
    });
  };

  // Maps sections to format required by ChipSelector
  const sectionSelectorItems = useMemo(() => {
    return sectionsList.map(s => ({ id: s.id, name: s.name }));
  }, [sectionsList]);

  // Maps dhikrs to format required by ChipSelector
  const dhikrSelectorItems = useMemo(() => {
    const list = [{ id: null as string | null, name: ar.settings.deeds.linkedDhikrNone }];
    return list.concat(dhikrsList.map(dk => ({ id: dk.id, name: dk.name })));
  }, [dhikrsList]);

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
            {deed ? ar.settings.deeds.edit : ar.settings.deeds.add}
          </Text>

          <ScrollView
            contentContainerStyle={styles.modalForm}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Deed Name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{ar.settings.deeds.name}</Text>
              <ThemedTextInput
                testID="input-deed-name"
                placeholder={ar.settings.deeds.placeholderName}
                value={deedName}
                onChangeText={setDeedName}
              />
            </View>

            {/* Section Selector — multi-select on create, single on edit */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                {deed ? ar.settings.deeds.section : ar.settings.deeds.sections}
              </Text>
              {deed ? (
                <ChipSelector
                  items={sectionSelectorItems}
                  selectedId={deedSectionIds[0] ?? null}
                  onSelect={(id) => id && setDeedSectionIds([id])}
                />
              ) : (
                <MultiChipSelector
                  items={sectionSelectorItems}
                  selectedIds={deedSectionIds}
                  onToggle={handleToggleSection}
                />
              )}
            </View>

            {/* Target Toggle Switch */}
            <View style={styles.switchFormGroup}>
              <Text style={styles.switchLabel}>{ar.settings.deeds.hasTarget}</Text>
              <Switch
                testID="switch-deed-target"
                value={showTargetInput}
                onValueChange={(val) => {
                  setShowTargetInput(val);
                  if (!val) {
                    setDeedTarget('');
                    setDeedType('boolean');
                  } else {
                    setDeedType('measured');
                  }
                }}
                trackColor={{ false: theme.colors.translucentBgActive, true: theme.colors.primary }}
                thumbColor={showTargetInput ? theme.colors.onPrimary : theme.colors.switchThumb}
              />
            </View>

            {/* Target Input */}
            {showTargetInput && (
              <View style={styles.formGroup} testID="group-deed-target">
                <Text style={styles.formLabel}>{ar.settings.deeds.target}</Text>
                <ThemedTextInput
                  testID="input-deed-target"
                  placeholder="مثال: 10"
                  keyboardType="number-pad"
                  value={deedTarget}
                  onChangeText={(text) => setDeedTarget(text.replace(/[^0-9]/g, ''))}
                />
              </View>
            )}

            {/* Schedule Selector */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{ar.settings.deeds.schedule}</Text>
              <DayBubblePicker
                selectedDays={selectedDays}
                onToggle={handleToggleDay}
              />
            </View>

            {/* Linked Dhikr Selector */}
            {showTargetInput && (
              <View style={[styles.formGroup, { marginBottom: 20 }]} testID="group-deed-linked-dhikr">
                <Text style={styles.formLabel}>{ar.settings.deeds.linkedDhikr}</Text>
                <ChipSelector
                  items={dhikrSelectorItems}
                  selectedId={deedLinkedDhikrId}
                  onSelect={setDeedLinkedDhikrId}
                />
              </View>
            )}
          </ScrollView>

          {/* Modal Actions */}
          <ModalActions
            onSave={handleSave}
            onCancel={onClose}
            testIDSave="btn-save-deed"
            testIDCancel="btn-cancel-deed"
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
      maxHeight: '85%',
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
    switchFormGroup: {
      flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.translucentBorder,
      marginBottom: 16,
      width: '100%',
    },
    switchLabel: {
      color: theme.colors.text,
      fontFamily: theme.font,
      fontSize: 15,
    },
  });
}
