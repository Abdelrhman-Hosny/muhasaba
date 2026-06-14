import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, I18nManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeType, rtlRow } from '@/ui/theme';
import { useDeedDefinitions, useScorecardStructure, addDeed, deleteDeed, addDhikrCounter } from '@/state/deedStore';
import { useActiveDefinitionIds } from '@/shared/hooks/useActiveDefinitionIds';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '@/db/client';
import { dhikrs, DhikrRow } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default function DeedsLibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const definitions = useDeedDefinitions();
  const scorecardStructure = useScorecardStructure();

  // Get active dhikrs to check if we need to create new ones
  const { data: rawDhikrs } = useLiveQuery(
    db.select().from(dhikrs).where(eq(dhikrs.deleted, false))
  );

  // Set of all definition IDs currently active in the user's scorecard
  const activeDefinitionIds = useActiveDefinitionIds(scorecardStructure);

  // Map definition ID -> active scorecard deed IDs (for removal)
  const deedIdsByDefinition = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const { deeds } of scorecardStructure) {
      for (const deed of deeds) {
        if (deed.definitionId) {
          if (!m.has(deed.definitionId)) m.set(deed.definitionId, []);
          m.get(deed.definitionId)!.push(deed.id);
        }
      }
    }
    return m;
  }, [scorecardStructure]);

  // Group definitions by bundle
  const { bundles, standalone } = useMemo(() => {
    const bMap = new Map<string, typeof definitions>();
    const stand: typeof definitions = [];

    for (const def of definitions) {
      if (def.bundleId) {
        if (!bMap.has(def.bundleId)) bMap.set(def.bundleId, []);
        bMap.get(def.bundleId)!.push(def);
      } else {
        stand.push(def);
      }
    }

    return { bundles: bMap, standalone: stand };
  }, [definitions]);

  // Search filtering logic
  const { filteredBundles, filteredStandalone } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return { filteredBundles: bundles, filteredStandalone: standalone };

    const fBundles = new Map<string, typeof definitions>();
    const fStandalone: typeof definitions = [];

    for (const [bundleId, items] of bundles.entries()) {
      const filteredItems = items.filter(item => item.name.toLowerCase().includes(query));
      if (filteredItems.length > 0) {
        fBundles.set(bundleId, filteredItems);
      }
    }

    const filteredStand = standalone.filter(item => item.name.toLowerCase().includes(query));

    return { filteredBundles: fBundles, filteredStandalone: filteredStand };
  }, [searchQuery, bundles, standalone]);

  const toggleBundleExpand = (bundleId: string) => {
    const next = new Set(expandedBundles);
    if (next.has(bundleId)) {
      next.delete(bundleId);
    } else {
      next.add(bundleId);
    }
    setExpandedBundles(next);
  };

  const getBundleName = (bundleId: string) => {
    if (bundleId === 'rawateb' || bundleId === 'bundle_rawateb') return 'سنن الرواتب';
    if (bundleId === 'prayers' || bundleId === 'bundle_prayers') return 'الصلوات الخمس';
    if (bundleId === 'bundle_adhkar_salah') return 'أذكار الصلاة';
    if (bundleId === 'bundle_friday') return 'وظائف يوم الجمعة';
    if (bundleId === 'bundle_adhkar_muqayyada') return 'الأذكار المقيدة اليومية';
    if (bundleId === 'bundle_adhkar_mutlaqa') return 'الأذكار المطلقة';
    return bundleId;
  };

  const handleAddDeed = async (item: typeof definitions[0]) => {
    // 1. If definition has linkedDhikrTemplate, check if we need to create/activate a dhikr
    let linkedDhikrId: string | undefined = undefined;

    if (item.linkedDhikrTemplate) {
      try {
        const template = JSON.parse(item.linkedDhikrTemplate) as { name: string; target: number };
        
        // Find existing non-deleted dhikr with same name
        const existing = (rawDhikrs as DhikrRow[] | undefined)?.find(
          d => d.name === template.name
        );

        if (existing) {
          linkedDhikrId = existing.id;
        } else {
          // Create new dhikr counter
          linkedDhikrId = await addDhikrCounter(template.name, template.target);
        }
      } catch (err) {
        console.error('Failed to parse linkedDhikrTemplate', err);
      }
    }

    // 2. Add deed to the database scorecard
    const targetVal = item.linkedDhikrTemplate
      ? (JSON.parse(item.linkedDhikrTemplate) as { target: number }).target
      : null;

    await addDeed(
      item.name,
      item.defaultSectionId,
      item.type as 'boolean' | 'measured',
      item.defaultSchedule,
      targetVal,
      linkedDhikrId ?? null,
      item.id
    );
  };

  // Soft-deletes every active scorecard deed created from this definition.
  const handleRemoveDeed = async (item: typeof definitions[0]) => {
    const ids = deedIdsByDefinition.get(item.id) ?? [];
    for (const id of ids) {
      await deleteDeed(id);
    }
  };

  const handleToggleDeed = (item: typeof definitions[0], isActive: boolean) => {
    if (isActive) {
      handleRemoveDeed(item);
    } else {
      handleAddDeed(item);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeText}>تم</Text>
        </Pressable>
        <Text style={styles.title}>مكتبة العبادات</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.placeholderText} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن عبادة (مثال: الفجر)..."
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

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Bundles */}
        {Array.from(filteredBundles.entries()).map(([bundleId, items]) => {
          const isExpanded = expandedBundles.has(bundleId);
          const activeCount = items.filter(i => activeDefinitionIds.has(i.id)).length;
          const isAllActive = activeCount === items.length;
          const isPartial = activeCount > 0 && !isAllActive;

          return (
            <View key={bundleId} style={styles.bundleContainer}>
              <Pressable style={styles.bundleHeader} onPress={() => toggleBundleExpand(bundleId)}>
                <View style={styles.bundleTitleRow}>
                  <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-back'} size={20} color={theme.colors.text} />
                  <Text style={styles.bundleTitle}>{getBundleName(bundleId)}</Text>
                </View>
                
                {/* Master Switch UI Simulation */}
                <Pressable
                  testID={`lib-checkbox-bundle-${bundleId}`}
                  style={[styles.checkbox, isAllActive && styles.checkboxActive, isPartial && styles.checkboxPartial]}
                  onPress={() => {
                    if (isAllActive) {
                      // All active -> remove the whole bundle.
                      items.forEach(item => handleRemoveDeed(item));
                    } else {
                      // Partial or empty -> add all missing.
                      items.forEach(item => {
                        if (!activeDefinitionIds.has(item.id)) {
                          handleAddDeed(item);
                        }
                      });
                    }
                  }}
                >
                  {isAllActive && <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />}
                  {isPartial && <View style={styles.partialDash} />}
                </Pressable>
              </Pressable>

              {isExpanded && (
                <View style={styles.bundleItems}>
                  {items.map(item => {
                    const isActive = activeDefinitionIds.has(item.id);
                    return (
                      <View key={item.id} style={styles.deedItem}>
                        <Text style={styles.deedName}>{item.name}</Text>
                        <Pressable
                          testID={`lib-checkbox-${item.id}`}
                          style={[styles.checkbox, isActive && styles.checkboxActive]}
                          onPress={() => handleToggleDeed(item, isActive)}
                        >
                          {isActive && <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />}
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* Standalone Deeds */}
        {filteredStandalone.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>عبادات فردية</Text>
            <View style={styles.standaloneCard}>
              {filteredStandalone.map((item, index) => {
                const isActive = activeDefinitionIds.has(item.id);
                const isLast = index === filteredStandalone.length - 1;
                return (
                  <View key={item.id} style={[styles.deedItem, isLast && { borderBottomWidth: 0 }]}>
                    <Text style={styles.deedName}>{item.name}</Text>
                    <Pressable
                      testID={`lib-checkbox-${item.id}`}
                      style={[styles.checkbox, isActive && styles.checkboxActive]}
                      onPress={() => handleToggleDeed(item, isActive)}
                    >
                      {isActive && <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Fallback Custom Deed Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 20 }]}>
        <Pressable 
          style={styles.customBtn}
          onPress={() => {
            router.push({ pathname: '/settings', params: { openCustomDeedModal: 'true', returnToLibrary: 'true' }});
          }}
        >
          <Ionicons name="add" size={20} color={theme.colors.primary} />
          <Text style={styles.customBtnText}>إضافة عبادة مخصصة</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: ThemeType) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    header: {
      flexDirection: rtlRow,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.translucentBorder,
    },
    closeButton: {
      padding: 8,
    },
    closeText: {
      color: theme.colors.primary,
      fontSize: 16,
      fontFamily: theme.font,
    },
    title: {
      fontSize: 18,
      color: theme.colors.text,
      fontFamily: theme.fontBold,
    },
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
    content: {
      flex: 1,
    },
    bundleContainer: {
      marginBottom: 16,
      marginHorizontal: 20,
      backgroundColor: theme.colors.translucentBg,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.translucentBorder,
    },
    bundleHeader: {
      flexDirection: rtlRow,
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: theme.colors.translucentBgActive,
    },
    bundleTitleRow: {
      flexDirection: rtlRow,
      alignItems: 'center',
      gap: 10,
    },
    bundleTitle: {
      fontSize: 16,
      color: theme.colors.text,
      fontFamily: theme.fontBold,
    },
    bundleItems: {
      paddingVertical: 8,
    },
    sectionContainer: {
      marginHorizontal: 20,
      marginTop: 10,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      color: theme.colors.primary,
      fontFamily: theme.fontBold,
      marginBottom: 10,
      marginHorizontal: 4,
      textAlign: I18nManager.isRTL ? 'left' : 'right',
    },
    standaloneCard: {
      backgroundColor: theme.colors.translucentBg,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.translucentBorder,
    },
    deedItem: {
      flexDirection: rtlRow,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.translucentBorder,
    },
    deedName: {
      fontSize: 15,
      color: theme.colors.text,
      fontFamily: theme.font,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.colors.translucentBorderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    checkboxPartial: {
      borderColor: theme.colors.primary,
    },
    partialDash: {
      width: 10,
      height: 2,
      backgroundColor: theme.colors.primary,
      borderRadius: 1,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 20,
      backgroundColor: theme.colors.bg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.translucentBorder,
    },
    customBtn: {
      flexDirection: rtlRow,
      alignItems: 'center',
      justifyContent: 'center',
      height: 50,
      borderRadius: 12,
      backgroundColor: theme.colors.translucentPrimary,
      gap: 8,
    },
    customBtnText: {
      color: theme.colors.primary,
      fontSize: 16,
      fontFamily: theme.fontBold,
    },
  });
}
