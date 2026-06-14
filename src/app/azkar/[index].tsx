import { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/ui/theme';
import { azkarCategories } from '@/domain/azkarData';
import { ScreenHeader } from '@/shared/components/ScreenHeader';
import { AdhkarList } from '@/features/adhkar/components/AdhkarList';

export default function AzkarReaderScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ index: string }>();
  const idx = Number.parseInt(String(params.index), 10);
  const category = Number.isInteger(idx) ? azkarCategories[idx] : undefined;

  const initialCounts = useMemo(
    () => (category ? new Array(category.items.length).fill(0) : []),
    [category]
  );
  const [counts, setCounts] = useState<number[]>(initialCounts);

  const updateCount = (index: number, nextVal: number) =>
    setCounts((prev) => {
      const next = [...prev];
      next[index] = nextVal;
      return next;
    });

  const resetAll = () => setCounts(new Array(category?.items.length ?? 0).fill(0));

  if (!category) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: 40 }}>
        <ScreenHeader
          title="حصن المسلم"
          leftAction={
            <Pressable hitSlop={8} onPress={() => router.back()}>
              <Ionicons name="close" size={26} color={theme.colors.muted} />
            </Pressable>
          }
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.muted, fontFamily: theme.font }}>لم يتم العثور على هذا القسم.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: 40 }}>
      <ScreenHeader
        title={category.title}
        leftAction={
          <Pressable hitSlop={8} onPress={() => router.back()}>
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
            <Text style={{ color: theme.colors.muted, fontFamily: theme.font, fontSize: 12 }}>تصفير الكل</Text>
          </Pressable>
        }
      />
      <AdhkarList
        items={category.items}
        counts={counts}
        onIncrement={updateCount}
        onResetItem={(i) => updateCount(i, 0)}
        bottomInset={40}
      />
    </View>
  );
}
