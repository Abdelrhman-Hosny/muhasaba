import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Modal, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createMMKV } from 'react-native-mmkv';
import { useTheme } from '@/ui/theme';
import { toArabicNumeral } from '@/i18n/format';
import { DeedRow as DeedRowType } from '@/db/schema';
import { morningAdhkar, eveningAdhkar } from '@/domain/azkarData';
import { todayKey } from '@/domain/dates';
import { ScreenHeader } from '@/shared/components/ScreenHeader';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { DhikrCard } from '@/features/adhkar/components/DhikrCard';

const adhkarStorage = createMMKV({ id: 'muhassaba-adhkar-progress' });

interface AdhkarModalProps {
  visible: boolean;
  deed: DeedRowType;
  date: string;
  onClose: () => void;
  onChange: (status: 'done' | 'not_yet' | 'not_done', value: number | null) => void;
}

export function AdhkarModal({ visible, deed, date, onClose, onChange }: AdhkarModalProps) {
  const theme = useTheme();
  const activeAdhkar = deed.definitionId === 'adhkar_morning' ? morningAdhkar : eveningAdhkar;
  const totalItems = activeAdhkar.length;
  const type = deed.definitionId === 'adhkar_morning' ? 'morning' : 'evening';

  // State for progress inside modal
  const [progress, setProgress] = useState<number[]>([]);

  useEffect(() => {
    if (visible) {
      // Clean up keys for other dates in the background so they do not accumulate
      const today = todayKey();
      try {
        const keys = adhkarStorage.getAllKeys();
        for (const key of keys) {
          if (!key.startsWith(`progress:${today}:`)) {
            adhkarStorage.remove(key);
          }
        }
      } catch (err) {
        console.error('Error cleaning up MMKV keys:', err);
      }

      const loaded: number[] = [];
      for (let i = 0; i < totalItems; i++) {
        const val = adhkarStorage.getNumber(`progress:${date}:${type}:${i}`) ?? 0;
        loaded.push(val);
      }
      setProgress(loaded);
    }
  }, [visible, date, type, totalItems]);

  // Auto-mark deed as done if all progress items are completed
  useEffect(() => {
    if (progress.length > 0 && progress.length === totalItems) {
      const allDone = progress.every((val, idx) => val >= activeAdhkar[idx].count);
      if (allDone) {
        onChange('done', null);
      }
    }
  }, [progress, totalItems, activeAdhkar, onChange]);

  const updateProgress = (index: number, nextVal: number) => {
    adhkarStorage.set(`progress:${date}:${type}:${index}`, nextVal);
    setProgress((prev) => {
      const next = [...prev];
      next[index] = nextVal;
      return next;
    });
  };

  const resetAll = () => {
    for (let i = 0; i < totalItems; i++) {
      adhkarStorage.set(`progress:${date}:${type}:${i}`, 0);
    }
    setProgress(new Array(totalItems).fill(0));
  };

  const completedCount = progress.filter((val, i) => val >= activeAdhkar[i].count).length;
  const completionPercentage = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: 40 }}>
        {/* Header using ScreenHeader */}
        <ScreenHeader
          title={deed.name}
          leftAction={
            <Pressable hitSlop={8} onPress={onClose}>
              <Ionicons name="close" size={26} color={theme.colors.muted} />
            </Pressable>
          }
          rightAction={
            <Pressable
              onPress={resetAll}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 8,
                backgroundColor: theme.colors.translucentBgActive,
              }}
              hitSlop={8}
            >
              <Ionicons name="refresh-outline" size={16} color={theme.colors.muted} />
              <Text style={{ color: theme.colors.muted, fontFamily: theme.font, fontSize: 12 }}>
                تصفير الكل
              </Text>
            </Pressable>
          }
        />

        {/* Progress Summary */}
        <View style={{ marginHorizontal: 16, marginTop: 10, marginBottom: 14 }}>
          <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ color: theme.colors.muted, fontFamily: theme.font, fontSize: 13, lineHeight: 22 }}>
              الأذكار المنجزة
            </Text>
            <Text style={{ color: theme.colors.text, fontFamily: theme.fontBold, fontSize: 15, lineHeight: 22 }}>
              {`\u200E${toArabicNumeral(completedCount)} / ${toArabicNumeral(totalItems)} (${toArabicNumeral(completionPercentage)}%)`}
            </Text>
          </View>
          {/* ProgressBar primitive */}
          <ProgressBar value={completedCount} total={totalItems} />
        </View>

        {/* Cards ScrollView */}
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {activeAdhkar.map((item, index) => {
            const currentCount = progress[index] ?? 0;
            return (
              <DhikrCard
                key={`${deed.definitionId}-${index}`}
                item={item}
                index={index}
                currentCount={currentCount}
                onIncrement={updateProgress}
                onResetItem={(idx) => updateProgress(idx, 0)}
              />
            );
          })}
        </ScrollView>

        {/* Bottom Confirm/Complete Button */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 20,
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.translucentBorder,
          }}
        >
          <Pressable
            onPress={() => {
              onChange('done', null);
              onClose();
            }}
            style={{
              height: 50,
              borderRadius: 12,
              backgroundColor: theme.colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: theme.colors.onPrimary, fontFamily: theme.fontBold, fontSize: 16 }}>
              إتمام العبادة وتسجيلها
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
