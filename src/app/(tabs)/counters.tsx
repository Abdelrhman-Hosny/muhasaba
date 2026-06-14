import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeType, rtlRow } from '@/ui/theme';
import { ar } from '@/i18n/ar';
import { useDhikrs, incrementDhikrCount, addDhikrCounter, deleteDhikrCounter } from '@/state/deedStore';
import { todayKey } from '@/domain/dates';
import { Ionicons } from '@expo/vector-icons';
import { Drawer } from '@/ui/components/Drawer';
import { CounterList } from '@/features/counters/components/CounterList';
import { KeypadPanel } from '@/features/counters/components/KeypadPanel';
import { AddCounterModal } from '@/features/counters/components/AddCounterModal';

export default function CountersScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const today = todayKey();
  const dhikrsList = useDhikrs(today);

  // States
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const styles = useMemo(() => createStyles(theme, insets.top), [theme, insets.top]);

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
    await incrementDhikrCount(today, selectedId, amount);
  };

  const handleReset = async () => {
    if (!selectedId || currentCount === 0) return;
    await incrementDhikrCount(today, selectedId, -currentCount);
  };

  const handleAddCounter = async (name: string, target: number | null) => {
    await addDhikrCounter(name, target);
    setModalVisible(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDhikrCounter(id);
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable testID="btn-drawer-toggle" hitSlop={8} onPress={() => setDrawerVisible(true)}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.muted} />
        </Pressable>
        <View style={styles.headerRight}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {ar.counters.title}
          </Text>
          <Pressable
            testID="btn-new-counter"
            hitSlop={8}
            onPress={() => setModalVisible(true)}
            style={styles.newCounterBtn}
          >
            <Ionicons name="add" size={20} color={theme.colors.primary} />
            <Text style={[styles.newCounterText, { color: theme.colors.primary }]}>
              جديد
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Counter List */}
      <CounterList
        dhikrsList={dhikrsList}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onDelete={handleDelete}
      />

      {/* Persistent Keypad Panel */}
      {selectedId && (
        <KeypadPanel
          onIncrement={handleIncrement}
          onReset={handleReset}
        />
      )}

      {/* Add New Counter Modal */}
      <AddCounterModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleAddCounter}
      />

      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

function createStyles(theme: ThemeType, paddingTop: number) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
      paddingTop,
    },
    header: {
      flexDirection: rtlRow,
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    headerRight: {
      flexDirection: rtlRow,
      alignItems: 'center',
      gap: 12,
    },
    headerTitle: {
      fontFamily: theme.font,
      fontSize: 20,
      fontWeight: 'bold',
    },
    newCounterBtn: {
      flexDirection: rtlRow,
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.translucentBgActive,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 12,
    },
    newCounterText: {
      fontFamily: theme.font,
      fontSize: 14,
    },
  });
}
