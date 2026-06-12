import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Modal, I18nManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';
import { toArabicNumeral } from '@/i18n/format';
import { useDhikrs, incrementDhikrCount, addDhikrCounter, deleteDhikrCounter } from '@/state/deedStore';
import { todayKey } from '@/domain/dates';
import { Ionicons } from '@expo/vector-icons';
import { Drawer } from '@/ui/components/Drawer';

export default function CountersScreen() {
  const insets = useSafeAreaInsets();
  const today = todayKey();
  const dhikrsList = useDhikrs(today);

  // States
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customValue, setCustomValue] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [mode, setMode] = useState<'add' | 'sub'>('add');
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');

  // Auto-select the first counter if none is selected
  useEffect(() => {
    if (dhikrsList.length > 0 && !selectedId) {
      setSelectedId(dhikrsList[0].dhikr.id);
    }
  }, [dhikrsList, selectedId]);

  const selectedItem = dhikrsList.find((item) => item.dhikr.id === selectedId);
  const currentCount = selectedItem?.log?.count ?? 0;

  const handleIncrement = async (amount: number) => {
    if (!selectedId) return;
    const finalAmount = mode === 'add' ? amount : -amount;
    await incrementDhikrCount(today, selectedId, finalAmount);
  };

  const handleCustomSubmit = async () => {
    const val = parseInt(customValue, 10);
    if (isNaN(val) || val <= 0 || !selectedId) return;
    const finalAmount = mode === 'add' ? val : -val;
    await incrementDhikrCount(today, selectedId, finalAmount);
    setCustomValue('');
  };

  const handleReset = async () => {
    if (!selectedId || currentCount === 0) return;
    await incrementDhikrCount(today, selectedId, -currentCount);
  };

  const handleAddCounter = async () => {
    if (!newName.trim()) return;
    const targetVal = newTarget ? parseInt(newTarget, 10) : null;
    await addDhikrCounter(newName.trim(), isNaN(targetVal as any) ? null : targetVal);
    setNewName('');
    setNewTarget('');
    setModalVisible(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDhikrCounter(id);
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
          <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 20, fontWeight: 'bold' }}>
            {ar.counters.title}
          </Text>
          <Pressable
            testID="btn-new-counter"
            hitSlop={8}
            onPress={() => setModalVisible(true)}
            style={{
              flexDirection: 'row-reverse',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(255,255,255,0.05)',
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 12,
            }}
          >
            <Ionicons name="add" size={20} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.primary, fontFamily: theme.font, fontSize: 14 }}>
              جديد
            </Text>
          </Pressable>
        </View>
        <Pressable testID="btn-drawer-toggle" hitSlop={8} onPress={() => setDrawerVisible(true)}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.muted} />
        </Pressable>
      </View>

      {/* Split view list (Scrollable) */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        style={{ flex: 1 }}
      >
        {dhikrsList.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: theme.colors.muted, fontFamily: theme.font, textAlign: 'center', fontSize: 16 }}>
              {ar.counters.noCounters}
            </Text>
          </View>
        ) : (
          dhikrsList.map(({ dhikr, log }) => {
            const active = dhikr.id === selectedId;
            const count = log?.count ?? 0;
            const target = dhikr.target;
            const hasTarget = target !== null && target > 0;
            const completed = hasTarget && count >= (target ?? 0);

            return (
              <Pressable
                key={dhikr.id}
                testID={`counter-row-${dhikr.id}`}
                onPress={() => setSelectedId(dhikr.id)}
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: active ? theme.colors.surfaceDone : theme.colors.surface,
                  borderWidth: 1.5,
                  borderColor: active ? theme.colors.primary : 'transparent',
                  padding: 16,
                  borderRadius: 14,
                  marginBottom: 10,
                  elevation: active ? 1 : 0,
                }}
              >
                <View style={{ flexDirection: 'column', alignItems: 'flex-end', flex: 1, paddingRight: 8 }}>
                  <Text style={{ color: theme.colors.text, fontFamily: theme.font, fontSize: 18, fontWeight: 'bold' }}>
                    {dhikr.name}
                  </Text>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Text style={{ color: completed ? theme.colors.primary : theme.colors.muted, fontFamily: theme.font, fontSize: 14 }}>
                      {`\u200E${toArabicNumeral(count)}${hasTarget ? ` / ${toArabicNumeral(target ?? 0)}` : ''}`}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {/* Delete Button */}
                  <Pressable
                    testID={`btn-delete-${dhikr.id}`}
                    onPress={() => handleDelete(dhikr.id)}
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.colors.muted} />
                  </Pressable>

                  {/* Active Indicator Icon */}
                  {active && (
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Persistent Keypad Panel */}
      {selectedId && (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: 'rgba(0,0,0,0.08)',
            padding: 16,
            paddingBottom: insets.bottom + 16,
            backgroundColor: theme.colors.surface,
          }}
        >
          {/* Keypad Grid */}
          <View style={{ flexDirection: 'row-reverse', gap: 10, marginBottom: 10 }}>
            {[1, 5, 10].map((amount) => {
              return (
                <Pressable
                  key={amount}
                  testID={`btn-keypad-${amount}`}
                  onPress={() => handleIncrement(amount)}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: theme.colors.surfaceDone,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: theme.colors.primary,
                  }}
                >
                  <Text style={{ fontFamily: theme.font, fontSize: 18, color: theme.colors.primary, fontWeight: 'bold', writingDirection: 'ltr' }}>
                    {mode === 'add' ? '+' : '-'}{toArabicNumeral(amount)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row-reverse', gap: 10, marginBottom: 12 }}>
            {[25, 50, 100].map((amount) => {
              return (
                <Pressable
                  key={amount}
                  testID={`btn-keypad-${amount}`}
                  onPress={() => handleIncrement(amount)}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: theme.colors.surfaceDone,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: theme.colors.primary,
                  }}
                >
                  <Text style={{ fontFamily: theme.font, fontSize: 18, color: theme.colors.primary, fontWeight: 'bold', writingDirection: 'ltr' }}>
                    {mode === 'add' ? '+' : '-'}{toArabicNumeral(amount)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Custom entry & Mode / Reset */}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
            {/* Custom Input */}
            <View style={{ flex: 1.8, height: 48, flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 12 }}>
              <TextInput
                testID="input-custom-count"
                placeholder={ar.counters.custom}
                keyboardType="number-pad"
                value={customValue}
                onChangeText={(text) => setCustomValue(text.replace(/[^0-9]/g, ''))}
                onSubmitEditing={handleCustomSubmit}
                returnKeyType="done"
                style={{
                  fontFamily: theme.font,
                  flex: 1,
                  fontSize: 16,
                  color: theme.colors.text,
                  textAlign: I18nManager.isRTL ? 'right' : 'left',
                  height: '100%',
                }}
              />
              {customValue.length > 0 && (
                <Pressable
                  testID="btn-custom-submit-inline"
                  onPress={handleCustomSubmit}
                  hitSlop={8}
                  style={{
                    padding: 4,
                    marginRight: 4,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                </Pressable>
              )}
            </View>

            {/* Mode Toggle Segmented */}
            <View style={{ flex: 1.2, height: 48, flexDirection: 'row-reverse', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 3 }}>
              <Pressable
                testID="btn-mode-add"
                onPress={() => setMode('add')}
                style={{
                  flex: 1,
                  borderRadius: 9,
                  backgroundColor: mode === 'add' ? theme.colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: theme.font, fontSize: 16, fontWeight: 'bold', color: mode === 'add' ? '#fff' : theme.colors.muted }}>
                  +
                </Text>
              </Pressable>
              <Pressable
                testID="btn-mode-sub"
                onPress={() => setMode('sub')}
                style={{
                  flex: 1,
                  borderRadius: 9,
                  backgroundColor: mode === 'sub' ? theme.colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: theme.font, fontSize: 16, fontWeight: 'bold', color: mode === 'sub' ? '#fff' : theme.colors.muted }}>
                  -
                </Text>
              </Pressable>
            </View>

            {/* Reset */}
            <Pressable
              testID="btn-reset"
              onPress={handleReset}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 12,
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                borderWidth: 1,
                borderColor: theme.colors.missed,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: theme.font, fontSize: 16, color: theme.colors.missed, fontWeight: 'bold' }}>
                {ar.counters.reset}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Add New Counter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <View
            style={{
              width: '85%',
              backgroundColor: theme.colors.surface,
              borderRadius: 20,
              padding: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Text
              style={{
                fontFamily: theme.font,
                fontSize: 20,
                fontWeight: 'bold',
                color: theme.colors.text,
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              {ar.counters.newCounter}
            </Text>

            {/* Name input */}
            <TextInput
              testID="input-new-name"
              placeholder={ar.counters.name}
              value={newName}
              onChangeText={setNewName}
              style={{
                fontFamily: theme.font,
                width: '100%',
                height: 48,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                paddingHorizontal: 16,
                fontSize: 16,
                textAlign: I18nManager.isRTL ? 'right' : 'left',
                color: theme.colors.text,
                marginBottom: 12,
              }}
            />

            {/* Target input */}
            <TextInput
              testID="input-new-target"
              placeholder={ar.counters.targetOptional}
              keyboardType="number-pad"
              value={newTarget}
              onChangeText={(text) => setNewTarget(text.replace(/[^0-9]/g, ''))}
              style={{
                fontFamily: theme.font,
                width: '100%',
                height: 48,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                paddingHorizontal: 16,
                fontSize: 16,
                textAlign: I18nManager.isRTL ? 'right' : 'left',
                color: theme.colors.text,
                marginBottom: 24,
              }}
            />

            {/* Modal Actions */}
            <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', gap: 12 }}>
              <Pressable
                testID="btn-modal-add"
                onPress={handleAddCounter}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: theme.colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: theme.font, fontSize: 16, color: '#fff', fontWeight: 'bold' }}>
                  {ar.counters.add}
                </Text>
              </Pressable>

              <Pressable
                testID="btn-modal-cancel"
                onPress={() => setModalVisible(false)}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: theme.font, fontSize: 16, color: theme.colors.muted }}>
                  {ar.counters.cancel}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}
