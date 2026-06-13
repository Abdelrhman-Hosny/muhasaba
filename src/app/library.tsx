import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, I18nManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/ui/theme';
import { useDeedDefinitions, useScorecardStructure, addDeed, addDhikrCounter, DhikrRow } from '@/state/deedStore';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '@/db/client';
import { dhikrs } from '@/db/schema';
import { eq } from 'drizzle-orm';

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function DeedsLibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());

  const definitions = useDeedDefinitions();
  const scorecardStructure = useScorecardStructure();

  // Get active dhikrs to check if we need to create new ones
  const { data: rawDhikrs } = useLiveQuery(
    db.select().from(dhikrs).where(eq(dhikrs.deleted, false))
  );

  // Set of all definition IDs currently active in the user's scorecard
  const activeDefinitionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const sec of scorecardStructure) {
      for (const d of sec.deeds) {
        if (d.definitionId) ids.add(d.definitionId);
      }
    }
    return ids;
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
  const filteredBundles = useMemo(() => {
    if (!searchQuery) return bundles;
    const q = searchQuery.toLowerCase();
    const result = new Map<string, typeof definitions>();
    
    for (const [bId, items] of bundles.entries()) {
      // If any item matches the search, include the bundle
      const matches = items.filter(i => i.name.toLowerCase().includes(q));
      if (matches.length > 0) {
        result.set(bId, items);
        // Auto-expand bundle if searching
        setExpandedBundles(prev => new Set(prev).add(bId));
      }
    }
    return result;
  }, [searchQuery, bundles]);

  const filteredStandalone = useMemo(() => {
    if (!searchQuery) return standalone;
    const q = searchQuery.toLowerCase();
    return standalone.filter(i => i.name.toLowerCase().includes(q));
  }, [searchQuery, standalone]);

  const toggleBundleExpand = (bundleId: string) => {
    setExpandedBundles(prev => {
      const next = new Set(prev);
      if (next.has(bundleId)) next.delete(bundleId);
      else next.add(bundleId);
      return next;
    });
  };

  const handleAddDeed = async (def: any) => {
    let linkedDhikrId = null;

    // Check if this deed requires a linked dhikr
    if (def.linkedDhikrTemplate) {
      const template = JSON.parse(def.linkedDhikrTemplate);
      const existingDhikr = rawDhikrs?.find(d => d.name === template.name);
      
      if (existingDhikr) {
        linkedDhikrId = existingDhikr.id;
      } else {
        await addDhikrCounter(template.name, template.target);
        
        // Let's query immediately. 
        // Note: SQLite is fast, so this usually finds it.
        const newlyCreated = await db.select().from(dhikrs).where(eq(dhikrs.name, template.name)).limit(1);
        if (newlyCreated.length > 0) {
          linkedDhikrId = newlyCreated[0].id;
        }
      }
    }

    await addDeed(
      def.name,
      def.defaultSectionId,
      def.type as 'boolean' | 'measured',
      def.defaultSchedule,
      linkedDhikrId ? JSON.parse(def.linkedDhikrTemplate).target : null,
      linkedDhikrId,
      def.id
    );
  };

  const getBundleName = (bundleId: string) => {
    if (bundleId === 'bundle_rawateb') return 'السنن الرواتب (12 ركعة)';
    return bundleId;
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
        <Ionicons name="search" size={20} color="rgba(255,255,255,0.5)" />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن عبادة (مثال: الفجر)..."
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.5)" />
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
                  <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-back'} size={20} color="#fff" />
                  <Text style={styles.bundleTitle}>{getBundleName(bundleId)}</Text>
                </View>
                
                {/* Master Switch UI Simulation */}
                <Pressable 
                  style={[styles.checkbox, isAllActive && styles.checkboxActive, isPartial && styles.checkboxPartial]}
                  onPress={() => {
                    // If partial or empty, add all missing.
                    if (!isAllActive) {
                      items.forEach(item => {
                        if (!activeDefinitionIds.has(item.id)) {
                          handleAddDeed(item);
                        }
                      });
                    }
                  }}
                >
                  {isAllActive && <Ionicons name="checkmark" size={16} color="#fff" />}
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
                          style={[styles.checkbox, isActive && styles.checkboxActive]}
                          onPress={() => {
                            if (!isActive) handleAddDeed(item);
                          }}
                        >
                          {isActive && <Ionicons name="checkmark" size={16} color="#fff" />}
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
            <Text style={styles.sectionTitle}>-- عبادات فردية --</Text>
            {filteredStandalone.map(item => {
              const isActive = activeDefinitionIds.has(item.id);
              return (
                <View key={item.id} style={styles.deedItem}>
                  <Text style={styles.deedName}>{item.name}</Text>
                  <Pressable 
                    style={[styles.checkbox, isActive && styles.checkboxActive]}
                    onPress={() => {
                      if (!isActive) handleAddDeed(item);
                    }}
                  >
                    {isActive && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </Pressable>
                </View>
              );
            })}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
    color: '#fff',
    fontFamily: 'Cairo-Bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    margin: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
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
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  bundleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  bundleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bundleTitle: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'Cairo-Bold',
  },
  bundleItems: {
    paddingVertical: 8,
  },
  sectionContainer: {
    marginHorizontal: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: theme.font,
    marginBottom: 10,
    textAlign: 'center',
  },
  deedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  deedName: {
    fontSize: 15,
    color: '#fff',
    fontFamily: theme.font,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
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
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  customBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(23, 201, 100, 0.1)',
    gap: 8,
  },
  customBtnText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
  },
});
