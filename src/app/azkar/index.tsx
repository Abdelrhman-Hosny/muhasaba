import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, I18nManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeType, rtlRow } from '@/ui/theme';
import { azkarCategories, AdhkarCategory } from '@/domain/azkarData';
import { toArabicNumeral } from '@/i18n/format';

const FAVORITE_TITLES = [
  'أذكار الصباح',
  'أذكار المساء',
  'أذكار النوم',
  'الأذكار بعد السلام من الصلاة',
  'أذكار الاستيقاظ من النوم',
];

export default function AzkarLibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [searchQuery, setSearchQuery] = useState('');

  const favorites = useMemo(
    () =>
      FAVORITE_TITLES
        .map((t) => azkarCategories.find((c) => c.title === t))
        .filter((c): c is AdhkarCategory => Boolean(c)),
    []
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return azkarCategories;
    return azkarCategories.filter((c) => c.title.includes(q) || c.search.includes(q));
  }, [searchQuery]);

  const open = (category: AdhkarCategory) =>
    router.push({ pathname: '/azkar/[index]', params: { index: String(category.index) } });

  const Row = ({ category }: { category: AdhkarCategory }) => (
    <Pressable style={styles.row} onPress={() => open(category)}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{category.title}</Text>
        <Text style={styles.rowCount}>{toArabicNumeral(category.items.length)}</Text>
      </View>
      <Ionicons name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.colors.placeholderText} />
    </Pressable>
  );

  const showSections = searchQuery.trim().length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeText}>تم</Text>
        </Pressable>
        <Text style={styles.title}>حصن المسلم</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.placeholderText} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن ذكر أو دعاء..."
          placeholderTextColor={theme.colors.placeholderText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.colors.placeholderText} />
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {showSections && favorites.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>المفضلة</Text>
            <View style={styles.card}>
              {favorites.map((c) => <Row key={`fav-${c.index}`} category={c} />)}
            </View>
          </View>
        )}

        <View style={styles.section}>
          {showSections && <Text style={styles.sectionTitle}>كل الأذكار والأدعية</Text>}
          <View style={styles.card}>
            {filtered.map((c) => <Row key={c.index} category={c} />)}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(theme: ThemeType) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
      flexDirection: rtlRow,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.translucentBorder,
    },
    closeButton: { padding: 8 },
    closeText: { color: theme.colors.primary, fontSize: 16, fontFamily: theme.font },
    title: { fontSize: 18, color: theme.colors.text, fontFamily: theme.fontBold },
    searchContainer: {
      flexDirection: rtlRow,
      alignItems: 'center',
      backgroundColor: theme.colors.translucentBg,
      margin: 20,
      paddingHorizontal: 16,
      borderRadius: 12,
      height: 48,
    },
    searchInput: {
      flex: 1,
      color: theme.colors.text,
      fontFamily: theme.font,
      fontSize: 15,
      marginHorizontal: 10,
      textAlign: I18nManager.isRTL ? 'right' : 'left',
    },
    content: { flex: 1 },
    section: { marginHorizontal: 20, marginBottom: 24 },
    sectionTitle: {
      fontSize: 16,
      color: theme.colors.primary,
      fontFamily: theme.fontBold,
      marginBottom: 10,
      marginHorizontal: 4,
      textAlign: I18nManager.isRTL ? 'left' : 'right',
    },
    card: {
      backgroundColor: theme.colors.translucentBg,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.translucentBorder,
    },
    row: {
      flexDirection: rtlRow,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.translucentBorder,
    },
    rowText: { flexDirection: rtlRow, alignItems: 'center', gap: 10, flex: 1 },
    rowTitle: { fontSize: 15, color: theme.colors.text, fontFamily: theme.font },
    rowCount: { fontSize: 12, color: theme.colors.placeholderText, fontFamily: theme.font },
  });
}
