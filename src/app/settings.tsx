import { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  I18nManager,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '@/db/client';
import { dhikrs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';
import { toArabicNumeral } from '@/i18n/format';
import {
  addDeed,
  updateDeed,
  deleteDeed,
  addDhikrCounter,
  updateDhikrCounter,
  deleteDhikrCounter,
  useSections,
  useScorecardStructure,
  useDeedDefinitions,
} from '@/state/deedStore';

type DeedType = 'boolean' | 'measured';

function getScheduleLabel(schedule: string): string {
  if (!schedule || schedule === 'daily') return ar.settings.deeds.scheduleDaily;
  if (schedule === 'weekly_anytime') return ar.settings.deeds.scheduleWeekly;
  if (schedule === 'weekdays') return ar.settings.deeds.scheduleWeekdays;

  const activeDays = schedule.split(',').map(Number);
  if (activeDays.length === 7) return ar.settings.deeds.scheduleDaily;

  const names = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const shortDays = activeDays.map((d) => names[d]);
  return `مخصص: ${shortDays.join('، ')}`;
}

function getPresetSectionId(presetId: string): string {
  if (['fajr', 'sunnah_fajr', 'adhkar_morning'].includes(presetId)) return 'sec_morning';
  if (['dhuhr', 'duha'].includes(presetId)) return 'sec_dhuhr';
  if (['asr'].includes(presetId)) return 'sec_asr';
  if (['maghrib', 'adhkar_evening'].includes(presetId)) return 'sec_maghrib';
  if (['isha', 'witr'].includes(presetId)) return 'sec_isha_night';
  if (['quran_reading'].includes(presetId)) return 'sec_quran';
  return 'sec_morning';
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Active Tab: deeds (العبادات) or dhikrs (الأذكار)
  const [activeTab, setActiveTab] = useState<'deeds' | 'dhikrs'>('deeds');

  // Reactive DB queries
  const sectionsList = useSections();
  const scorecardStructure = useScorecardStructure();
  const deedDefinitions = useDeedDefinitions();

  const { data: rawDhikrs } = useLiveQuery(
    db.select().from(dhikrs).where(eq(dhikrs.deleted, false))
  );

  const dhikrsList = useMemo(() => {
    if (!rawDhikrs) return [];
    return [...rawDhikrs].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [rawDhikrs]);

  // Map of dhikr ID to name for easy lookup
  const dhikrNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const dk of dhikrsList) {
      map.set(dk.id, dk.name);
    }
    return map;
  }, [dhikrsList]);

  // Modal States - Deeds
  const [deedModalVisible, setDeedModalVisible] = useState(false);
  const [deedEditId, setDeedEditId] = useState<string | null>(null);
  const [deedName, setDeedName] = useState('');
  const [deedSectionId, setDeedSectionId] = useState('');
  const [deedType, setDeedType] = useState<DeedType>('boolean');
  const [deedTarget, setDeedTarget] = useState('');
  const [deedLinkedDhikrId, setDeedLinkedDhikrId] = useState<string | null>(null);
  const [deedDefinitionId, setDeedDefinitionId] = useState<string | null>(null);
  const [showTargetInput, setShowTargetInput] = useState(false);

  // Week schedule bubbles states:
  // Day indices: 0 = Sun, 1 = Mon ... 6 = Sat
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const activeDefinitionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const sec of scorecardStructure) {
      for (const d of sec.deeds) {
        if (d.definitionId) ids.add(d.definitionId);
      }
    }
    return ids;
  }, [scorecardStructure]);

  const suggestedPresets = useMemo(() => {
    return deedDefinitions.filter((def) => !activeDefinitionIds.has(def.id));
  }, [deedDefinitions, activeDefinitionIds]);

  // Modal States - Dhikrs
  const [dhikrModalVisible, setDhikrModalVisible] = useState(false);
  const [dhikrEditId, setDhikrEditId] = useState<string | null>(null);
  const [dhikrName, setDhikrName] = useState('');
  const [dhikrTarget, setDhikrTarget] = useState('');

  // Day toggle handler
  const handleToggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      const next = selectedDays.filter((d) => d !== dayIndex);
      setSelectedDays(next);
    } else {
      const next = [...selectedDays, dayIndex].sort((a, b) => a - b);
      setSelectedDays(next);
    }
  };

  // Open Add Deed Modal
  const handleOpenAddDeed = () => {
    setDeedEditId(null);
    setDeedName('');
    setDeedSectionId(sectionsList[0]?.id || 'sec_morning');
    setDeedType('boolean');
    setDeedTarget('');
    setShowTargetInput(false);
    setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    setDeedLinkedDhikrId(null);
    setDeedDefinitionId(null);
    setDeedModalVisible(true);
  };

  // Open Edit Deed Modal
  const handleOpenEditDeed = (deed: any) => {
    setDeedEditId(deed.id);
    setDeedName(deed.name);
    setDeedSectionId(deed.sectionId);
    setDeedType(deed.type as DeedType);
    setDeedTarget(deed.target ? String(deed.target) : '');
    setShowTargetInput(deed.type === 'measured');
    setDeedLinkedDhikrId(deed.linkedDhikrId);
    setDeedDefinitionId(deed.definitionId);

    // Parse schedule property
    if (deed.schedule === 'daily' || deed.schedule === 'weekly_anytime') {
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    } else if (deed.schedule === 'weekdays') {
      setSelectedDays([1, 2, 3, 4, 5]);
    } else {
      const parsed = deed.schedule.split(',').map(Number);
      setSelectedDays(parsed.length > 0 ? parsed : [0, 1, 2, 3, 4, 5, 6]);
    }

    setDeedModalVisible(true);
  };

  // Save Deed (Add/Edit)
  const handleSaveDeed = async () => {
    if (!deedName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم العبادة');
      return;
    }

    let finalType: DeedType = 'boolean';
    let targetVal: number | null = null;

    if (showTargetInput) {
      finalType = 'measured';
      const parsed = deedTarget.trim() ? parseInt(deedTarget, 10) : null;
      if (parsed === null || isNaN(parsed) || parsed <= 0) {
        Alert.alert('خطأ', 'يرجى إدخال قيمة صحيحة للهدف اليومي');
        return;
      }
      targetVal = parsed;
    }

    // Serialize weekly day bubbles schedule
    let finalSchedule = 'daily';
    if (selectedDays.length === 0) {
      Alert.alert('خطأ', 'يرجى اختيار يوم واحد على الأقل للعبادة');
      return;
    }
    if (selectedDays.length === 7) {
      finalSchedule = 'daily';
    } else {
      finalSchedule = [...selectedDays].sort((a, b) => a - b).join(',');
    }

    try {
      if (deedEditId) {
        await updateDeed(deedEditId, {
          name: deedName.trim(),
          sectionId: deedSectionId,
          type: finalType,
          schedule: finalSchedule,
          target: targetVal,
          linkedDhikrId: deedLinkedDhikrId,
          definitionId: deedDefinitionId,
        });
      } else {
        await addDeed(
          deedName.trim(),
          deedSectionId,
          finalType,
          finalSchedule,
          targetVal,
          deedLinkedDhikrId,
          deedDefinitionId
        );
      }
      setDeedModalVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert('خطأ', 'فشل حفظ العبادة');
    }
  };

  // Delete Deed
  const handleDeleteDeedConfirm = (id: string, name: string) => {
    Alert.alert(
      ar.settings.deeds.delete,
      `${ar.settings.deeds.deleteConfirm}\n(${name})`,
      [
        { text: ar.settings.cancel, style: 'cancel' },
        {
          text: ar.settings.delete,
          style: 'destructive',
          onPress: async () => {
            await deleteDeed(id);
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Open Add Dhikr Modal
  const handleOpenAddDhikr = () => {
    setDhikrEditId(null);
    setDhikrName('');
    setDhikrTarget('');
    setDhikrModalVisible(true);
  };

  // Open Edit Dhikr Modal
  const handleOpenEditDhikr = (dhikr: any) => {
    setDhikrEditId(dhikr.id);
    setDhikrName(dhikr.name);
    setDhikrTarget(dhikr.target ? String(dhikr.target) : '');
    setDhikrModalVisible(true);
  };

  // Save Dhikr (Add/Edit)
  const handleSaveDhikr = async () => {
    if (!dhikrName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الذكر');
      return;
    }

    const targetVal = dhikrTarget ? parseInt(dhikrTarget, 10) : null;
    if (dhikrTarget && (isNaN(targetVal as number) || (targetVal as number) <= 0)) {
      Alert.alert('خطأ', 'يرجى إدخال قيمة صحيحة للهدف');
      return;
    }

    try {
      if (dhikrEditId) {
        await updateDhikrCounter(dhikrEditId, dhikrName.trim(), targetVal);
      } else {
        await addDhikrCounter(dhikrName.trim(), targetVal);
      }
      setDhikrModalVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert('خطأ', 'فشل حفظ الذكر');
    }
  };

  // Delete Dhikr
  const handleDeleteDhikrConfirm = (id: string, name: string) => {
    Alert.alert(
      ar.counters.reset,
      `${ar.settings.dhikrs.deleteConfirm}\n(${name})`,
      [
        { text: ar.settings.cancel, style: 'cancel' },
        {
          text: ar.settings.delete,
          style: 'destructive',
          onPress: async () => {
            await deleteDhikrCounter(id);
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{ar.settings.title}</Text>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="close" size={28} color={theme.colors.muted} />
        </Pressable>
      </View>

      {/* Custom Tabs */}
      <View style={styles.tabContainer}>
        <Pressable
          onPress={() => setActiveTab('deeds')}
          style={[styles.tab, activeTab === 'deeds' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'deeds' && styles.activeTabText]}>
            {ar.settings.tabs.deeds}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('dhikrs')}
          style={[styles.tab, activeTab === 'dhikrs' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'dhikrs' && styles.activeTabText]}>
            {ar.settings.tabs.dhikrs}
          </Text>
        </Pressable>
      </View>

      {/* Content List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'deeds' ? (
          // DEEDS TAB
          scorecardStructure.map(({ section, deeds }) => (
            <View key={section.id} style={styles.sectionBlock}>
              <Text style={styles.sectionHeader}>{section.name}</Text>
              
              {deeds.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>{ar.settings.deeds.noDeeds}</Text>
                </View>
              ) : (
                deeds.map((deed) => {
                  const scheduleLabel = getScheduleLabel(deed.schedule);

                  const typeLabel =
                    deed.type === 'boolean'
                      ? ar.settings.deeds.typeBoolean
                      : `${ar.settings.deeds.typeMeasured} (هدف: ${toArabicNumeral(deed.target ?? 0)})`;

                  const linkedDhikrName = deed.linkedDhikrId ? dhikrNamesMap.get(deed.linkedDhikrId) : null;

                  return (
                    <View key={deed.id} style={styles.deedCard} testID={`deed-card-${deed.id}`}>
                      <View style={styles.deedInfo}>
                        <Text style={styles.deedName}>{deed.name}</Text>
                        
                        <View style={styles.metaRow}>
                          <View style={styles.metaBadge}>
                            <Text style={styles.metaText}>{scheduleLabel}</Text>
                          </View>
                          <View style={styles.metaBadge}>
                            <Text style={styles.metaText}>{typeLabel}</Text>
                          </View>
                        </View>

                        {linkedDhikrName && (
                          <View style={styles.linkedBadge}>
                            <Ionicons name="link-outline" size={12} color={theme.colors.primary} />
                            <Text style={styles.linkedText}>
                              {`${ar.settings.deeds.linkedDhikr}: ${linkedDhikrName}`}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Card Actions */}
                      <View style={styles.cardActions}>
                        <Pressable
                          testID={`btn-edit-deed-${deed.id}`}
                          onPress={() => handleOpenEditDeed(deed)}
                          hitSlop={8}
                          style={styles.actionBtn}
                        >
                          <Ionicons name="pencil-outline" size={20} color={theme.colors.muted} />
                        </Pressable>
                        <Pressable
                          testID={`btn-delete-deed-${deed.id}`}
                          onPress={() => handleDeleteDeedConfirm(deed.id, deed.name)}
                          hitSlop={8}
                          style={styles.actionBtn}
                        >
                          <Ionicons name="trash-outline" size={20} color={theme.colors.missed} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          ))
        ) : (
          // DHIKRS TAB
          <View style={styles.dhikrsBlock}>
            {dhikrsList.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>{ar.settings.dhikrs.noCounters}</Text>
              </View>
            ) : (
              dhikrsList.map((dk) => (
                <View key={dk.id} style={styles.deedCard} testID={`dhikr-card-${dk.id}`}>
                  <View style={styles.deedInfo}>
                    <Text style={styles.deedName}>{dk.name}</Text>
                    {dk.target && (
                      <View style={styles.metaRow}>
                        <View style={styles.metaBadge}>
                          <Text style={styles.metaText}>
                            {`${ar.counters.target}: ${toArabicNumeral(dk.target)}`}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardActions}>
                    <Pressable
                      testID={`btn-edit-dhikr-${dk.id}`}
                      onPress={() => handleOpenEditDhikr(dk)}
                      hitSlop={8}
                      style={styles.actionBtn}
                    >
                      <Ionicons name="pencil-outline" size={20} color={theme.colors.muted} />
                    </Pressable>
                    <Pressable
                      testID={`btn-delete-dhikr-${dk.id}`}
                      onPress={() => handleDeleteDhikrConfirm(dk.id, dk.name)}
                      hitSlop={8}
                      style={styles.actionBtn}
                    >
                      <Ionicons name="trash-outline" size={20} color={theme.colors.missed} />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Save/Add Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {activeTab === 'deeds' ? (
          <Pressable style={styles.primaryBtn} onPress={handleOpenAddDeed} testID="btn-add-deed">
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.primaryBtnText}>{ar.settings.deeds.add}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryBtn} onPress={handleOpenAddDhikr} testID="btn-add-dhikr">
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.primaryBtnText}>{ar.settings.dhikrs.add}</Text>
          </Pressable>
        )}
      </View>

      {/* DEED MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={deedModalVisible}
        onRequestClose={() => setDeedModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 24 }]}>
            <Text style={styles.modalTitle}>
              {deedEditId ? ar.settings.deeds.edit : ar.settings.deeds.add}
            </Text>

            <ScrollView 
              contentContainerStyle={styles.modalForm} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Suggested Presets */}
              {!deedEditId && suggestedPresets.length > 0 && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>عبادات مقترحة</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips} style={{ width: '100%', alignSelf: 'stretch' }}>
                    {suggestedPresets.map((preset) => (
                      <Pressable
                        key={preset.id}
                        testID={`preset-chip-${preset.id}`}
                        onPress={() => {
                          setDeedName(preset.name);
                          setDeedType(preset.type as DeedType);
                          setDeedSectionId(getPresetSectionId(preset.id));
                          setDeedDefinitionId(preset.id);
                          if (preset.type === 'measured') {
                            setDeedTarget(preset.id === 'quran_reading' ? '10' : '100');
                            setShowTargetInput(true);
                          } else {
                            setDeedTarget('');
                            setShowTargetInput(false);
                          }
                        }}
                        style={styles.chip}
                      >
                        <Text style={styles.chipText}>{preset.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Deed Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{ar.settings.deeds.name}</Text>
                <TextInput
                  testID="input-deed-name"
                  placeholder={ar.settings.deeds.placeholderName}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={deedName}
                  onChangeText={setDeedName}
                  style={styles.input}
                />
              </View>

              {/* Section Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{ar.settings.deeds.section}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips} style={{ width: '100%', alignSelf: 'stretch' }}>
                  {sectionsList.map((sec) => {
                    const selected = deedSectionId === sec.id;
                    return (
                      <Pressable
                        key={sec.id}
                        onPress={() => setDeedSectionId(sec.id)}
                        style={[styles.chip, selected && styles.activeChip]}
                      >
                        <Text style={[styles.chipText, selected && styles.activeChipText]}>
                          {sec.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Target Toggle Switch */}
              <View style={styles.switchFormGroup}>
                <Text style={styles.switchLabel}>{(ar.settings.deeds as any).hasTarget}</Text>
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
                  trackColor={{ false: 'rgba(255,255,255,0.08)', true: theme.colors.primary }}
                  thumbColor={showTargetInput ? '#fff' : '#888'}
                />
              </View>

              {/* Target (Only shown if target switch is ON) */}
              {showTargetInput && (
                <View style={styles.formGroup} testID="group-deed-target">
                  <Text style={styles.formLabel}>{ar.settings.deeds.target}</Text>
                  <TextInput
                    testID="input-deed-target"
                    placeholder="مثال: 10"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="number-pad"
                    value={deedTarget}
                    onChangeText={(text) => {
                      const cleanText = text.replace(/[^0-9]/g, '');
                      setDeedTarget(cleanText);
                    }}
                    style={styles.input}
                  />
                </View>
              )}

              {/* Schedule Selector with S M T W T F S day bubbles */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{ar.settings.deeds.schedule}</Text>

                {/* Day Bubbles (ح = Sun, ن = Mon, ث = Tue, ر = Wed, خ = Thu, ج = Fri, س = Sat) */}
                <View style={styles.dayBubblesRow}>
                  {[
                    { idx: 0, label: 'ح', name: 'أحد' },
                    { idx: 1, label: 'ن', name: 'إثنين' },
                    { idx: 2, label: 'ث', name: 'ثلاثاء' },
                    { idx: 3, label: 'ر', name: 'أربعاء' },
                    { idx: 4, label: 'خ', name: 'خميس' },
                    { idx: 5, label: 'ج', name: 'جمعة' },
                    { idx: 6, label: 'س', name: 'سبت' },
                  ].map((day) => {
                    const isSelected = selectedDays.includes(day.idx);
                    return (
                      <View key={day.idx} style={styles.dayColumn}>
                        <Pressable
                          testID={`btn-day-bubble-${day.idx}`}
                          onPress={() => handleToggleDay(day.idx)}
                          style={[
                            styles.dayBubble,
                            isSelected && styles.dayBubbleSelected,
                          ]}
                        >
                          <Text style={[
                            styles.dayBubbleText,
                            isSelected && styles.dayBubbleTextSelected,
                          ]}>
                            {day.label}
                          </Text>
                        </Pressable>
                        <Text style={styles.dayNameLabel}>
                          {day.name}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Linked Dhikr Selector (Only shown if target switch is ON) */}
              {showTargetInput && (
                <View style={[styles.formGroup, { marginBottom: 20 }]} testID="group-deed-linked-dhikr">
                  <Text style={styles.formLabel}>{ar.settings.deeds.linkedDhikr}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips} style={{ width: '100%', alignSelf: 'stretch' }}>
                    <Pressable
                      onPress={() => setDeedLinkedDhikrId(null)}
                      style={[styles.chip, deedLinkedDhikrId === null && styles.activeChip]}
                    >
                      <Text style={[styles.chipText, deedLinkedDhikrId === null && styles.activeChipText]}>
                        {ar.settings.deeds.linkedDhikrNone}
                      </Text>
                    </Pressable>
                    {dhikrsList.map((dk) => {
                      const selected = deedLinkedDhikrId === dk.id;
                      return (
                        <Pressable
                          key={dk.id}
                          onPress={() => setDeedLinkedDhikrId(dk.id)}
                          style={[styles.chip, selected && styles.activeChip]}
                        >
                          <Text style={[styles.chipText, selected && styles.activeChipText]}>
                            {dk.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalSaveBtn} onPress={handleSaveDeed} testID="btn-save-deed">
                <Text style={styles.modalSaveText}>{ar.settings.save}</Text>
              </Pressable>
              <Pressable style={styles.modalCancelBtn} onPress={() => setDeedModalVisible(false)} testID="btn-cancel-deed">
                <Text style={styles.modalCancelText}>{ar.settings.cancel}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* DHIKR MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={dhikrModalVisible}
        onRequestClose={() => setDhikrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 24 }]}>
            <Text style={styles.modalTitle}>
              {dhikrEditId ? ar.settings.dhikrs.edit : ar.settings.dhikrs.add}
            </Text>

            <View style={styles.modalForm}>
              {/* Dhikr Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{ar.settings.dhikrs.name}</Text>
                <TextInput
                  testID="input-dhikr-name"
                  placeholder={ar.settings.dhikrs.placeholderName}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={dhikrName}
                  onChangeText={setDhikrName}
                  style={styles.input}
                />
              </View>

              {/* Target (Optional) */}
              <View style={[styles.formGroup, { marginBottom: 24 }]}>
                <Text style={styles.formLabel}>{ar.settings.dhikrs.target}</Text>
                <TextInput
                  testID="input-dhikr-target"
                  placeholder="مثال: 100"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="number-pad"
                  value={dhikrTarget}
                  onChangeText={(text) => setDhikrTarget(text.replace(/[^0-9]/g, ''))}
                  style={styles.input}
                />
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalSaveBtn} onPress={handleSaveDhikr} testID="btn-save-dhikr">
                <Text style={styles.modalSaveText}>{ar.settings.save}</Text>
              </Pressable>
              <Pressable style={styles.modalCancelBtn} onPress={() => setDhikrModalVisible(false)} testID="btn-cancel-dhikr">
                <Text style={styles.modalCancelText}>{ar.settings.cancel}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  headerTitle: {
    color: theme.colors.text,
    fontFamily: theme.fontBold,
    fontSize: 20,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
  },
  tabContainer: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontFamily: theme.font,
    color: theme.colors.muted,
    fontSize: 15,
  },
  activeTabText: {
    fontFamily: theme.fontBold,
    color: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // extra spacing for bottom button
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeader: {
    color: theme.colors.primary,
    fontFamily: theme.fontBold,
    fontSize: 16,
    textAlign: 'right',
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.muted,
    fontFamily: theme.font,
    fontSize: 14,
  },
  deedCard: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  deedInfo: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  deedName: {
    color: theme.colors.text,
    fontFamily: theme.fontBold,
    fontSize: 16,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  metaRow: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  metaBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  metaText: {
    color: theme.colors.muted,
    fontFamily: theme.font,
    fontSize: 11,
  },
  linkedBadge: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  linkedText: {
    color: theme.colors.primary,
    fontFamily: theme.font,
    fontSize: 11,
  },
  cardActions: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    padding: 4,
  },
  dhikrsBlock: {
    gap: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: theme.colors.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    height: 52,
    borderRadius: 14,
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: theme.fontBold,
    color: '#fff',
    fontSize: 16,
  },

  // MODALS
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontFamily: theme.fontBold,
    fontSize: 20,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalForm: {
    paddingBottom: 24,
    width: '100%',
    alignItems: 'stretch',
  },
  formGroup: {
    marginBottom: 16,
    width: '100%',
    alignItems: I18nManager.isRTL ? 'flex-start' : 'flex-end',
  },
  formLabel: {
    fontFamily: theme.fontBold,
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'right',
    marginBottom: 8,
    width: '100%',
    alignSelf: 'stretch',
  },
  input: {
    fontFamily: theme.font,
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  switchFormGroup: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  switchLabel: {
    fontFamily: theme.fontBold,
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'right',
  },
  horizontalChips: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
  },
  activeChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontFamily: theme.font,
    color: theme.colors.muted,
    fontSize: 14,
  },
  activeChipText: {
    fontFamily: theme.fontBold,
    color: theme.colors.primary,
  },
  segmentedControl: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 3,
    width: '100%',
    alignSelf: 'stretch',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  activeSegmentBtn: {
    backgroundColor: theme.colors.primary,
  },
  segmentText: {
    fontFamily: theme.font,
    color: theme.colors.muted,
    fontSize: 13,
  },
  activeSegmentText: {
    fontFamily: theme.fontBold,
    color: '#fff',
  },
  modalActions: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    gap: 12,
    marginVertical: 20,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontFamily: theme.font,
    color: theme.colors.muted,
    fontSize: 15,
  },
  modalSaveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontFamily: theme.fontBold,
    color: '#fff',
    fontSize: 15,
  },
  dayBubblesRow: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
    width: '100%',
    alignSelf: 'stretch',
  },
  dayBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBubbleSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayBubbleText: {
    fontFamily: theme.font,
    color: theme.colors.muted,
    fontSize: 14,
  },
  dayBubbleTextSelected: {
    fontFamily: theme.fontBold,
    color: '#fff',
  },
  dayColumn: {
    alignItems: 'center',
  },
  dayNameLabel: {
    fontFamily: theme.font,
    color: theme.colors.muted,
    fontSize: 10,
    marginTop: 4,
  },
});
