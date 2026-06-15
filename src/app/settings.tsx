import { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, Pressable, Text } from 'react-native';
import { ScrollViewContainer } from 'react-native-reorderable-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '@/db/client';
import { dhikrs, sections, deeds, DeedRow, DhikrRow } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { useTheme, ThemeType, rtlRow } from '@/ui/theme';
import { ar } from '@/i18n/ar';
import { ScreenHeader } from '@/shared/components/ScreenHeader';
import { Ionicons } from '@expo/vector-icons';
import {
  deleteDeed,
  deleteDeedBundle,
  deleteDhikrCounter,
  useScorecardStructure,
  updateDeed,
  updateDeedBundle,
  addDeedBundle,
  updateDhikrCounter,
  addDhikrCounter,
  useSections,
} from '@/state/deedStore';
import { getScheduleLabel, getNextActiveDate, formatArabicDate } from '@/domain/schedule';
import { DeedsSettingsTab } from '@/features/settings/components/DeedsSettingsTab';
import { DhikrsSettingsTab } from '@/features/settings/components/DhikrsSettingsTab';
import { DeedFormModal } from '@/features/settings/components/DeedFormModal';
import { DhikrFormModal } from '@/features/settings/components/DhikrFormModal';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [activeTab, setActiveTab] = useState<'deeds' | 'dhikrs'>('deeds');

  // Modal visibility states
  const [deedModalVisible, setDeedModalVisible] = useState(false);
  const [dhikrModalVisible, setDhikrModalVisible] = useState(false);

  // Editing entity states
  const [deedToEdit, setDeedToEdit] = useState<DeedRow | null>(null);
  const [dhikrToEdit, setDhikrToEdit] = useState<DhikrRow | null>(null);

  // Scorecard / Sections database live query
  const scorecardStructure = useScorecardStructure();

  const sectionsList = useSections();

  const { data: dhikrsList = [] } = useLiveQuery(
    db.select().from(dhikrs).where(eq(dhikrs.deleted, false))
  );

  // Map to resolve dhikr names
  const dhikrNamesMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const dk of dhikrsList) {
      m.set(dk.id, dk.name);
    }
    return m;
  }, [dhikrsList]);

  // Open custom deed modal from library param
  useEffect(() => {
    if (params.openCustomDeedModal === 'true') {
      setDeedToEdit(null);
      setDeedModalVisible(true);
      router.setParams({ openCustomDeedModal: '' });
    }
  }, [params.openCustomDeedModal, router]);

  const handleCloseDeedModal = () => {
    setDeedModalVisible(false);
    if (params.returnToLibrary === 'true') {
      router.setParams({ returnToLibrary: '', openCustomDeedModal: '' });
      router.back();
    }
  };

  const handleOpenAddDeed = () => {
    router.push('/library');
  };

  const handleOpenEditDeed = (deed: DeedRow) => {
    setDeedToEdit(deed);
    setDeedModalVisible(true);
  };

  const handleSaveDeed = async (data: {
    id: string | null;
    name: string;
    sectionIds: string[];
    type: 'boolean' | 'measured';
    target: number | null;
    linkedDhikrId: string | null;
    schedule: string;
  }) => {
    try {
      if (data.id) {
        const sharedFields = {
          name: data.name,
          type: data.type,
          schedule: data.schedule,
          target: data.target,
          linkedDhikrId: data.linkedDhikrId,
        };
        const applyThisOnly = async () => {
          await updateDeed(data.id!, {
            ...sharedFields,
            sectionId: data.sectionIds[0],
            definitionId: deedToEdit?.definitionId || null,
          });
          handleCloseDeedModal();
        };

        // Bundled deed: ask whether the edit applies to this section only or the whole group
        if (deedToEdit?.bundleId) {
          Alert.alert(
            ar.settings.deeds.bundleScopeTitle,
            ar.settings.deeds.bundleEditPrompt,
            [
              { text: ar.settings.cancel, style: 'cancel' },
              { text: ar.settings.deeds.bundleThisOnly, onPress: applyThisOnly },
              {
                text: ar.settings.deeds.bundleAll,
                onPress: async () => {
                  await updateDeedBundle(deedToEdit.bundleId!, sharedFields);
                  handleCloseDeedModal();
                },
              },
            ],
            { cancelable: true }
          );
        } else {
          await applyThisOnly();
        }
      } else {
        await addDeedBundle(
          data.name,
          data.sectionIds,
          data.type,
          data.schedule,
          data.target,
          data.linkedDhikrId
        );
        const scheduleLabel = getScheduleLabel(data.schedule);
        const nextActiveDate = getNextActiveDate(data.schedule);
        const formattedDate = formatArabicDate(nextActiveDate);
        Alert.alert(
          ar.settings.deeds.saveSuccessTitle,
          ar.settings.deeds.saveSuccessBody
            .replace('{name}', data.name)
            .replace('{schedule}', scheduleLabel)
            .replace('{date}', formattedDate),
          [{
            text: 'موافق',
            onPress: () => {
              handleCloseDeedModal();
            }
          }]
        );
      }
    } catch (err) {
      console.error(err);
      Alert.alert('خطأ', 'فشل حفظ العبادة');
    }
  };

  const handleDeleteDeedConfirm = (deed: DeedRow) => {
    // Bundled deed: offer deleting this section only or the whole group
    if (deed.bundleId) {
      Alert.alert(
        ar.settings.deeds.bundleScopeTitle,
        `${ar.settings.deeds.bundleDeletePrompt}\n(${deed.name})`,
        [
          { text: ar.settings.cancel, style: 'cancel' },
          {
            text: ar.settings.deeds.bundleThisOnly,
            style: 'destructive',
            onPress: async () => {
              await deleteDeed(deed.id);
            },
          },
          {
            text: ar.settings.deeds.bundleAll,
            style: 'destructive',
            onPress: async () => {
              await deleteDeedBundle(deed.bundleId!);
            },
          },
        ],
        { cancelable: true }
      );
      return;
    }

    Alert.alert(
      ar.settings.deeds.delete,
      `${ar.settings.deeds.deleteConfirm}\n(${deed.name})`,
      [
        { text: ar.settings.cancel, style: 'cancel' },
        {
          text: ar.settings.delete,
          style: 'destructive',
          onPress: async () => {
            await deleteDeed(deed.id);
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleOpenAddDhikr = () => {
    setDhikrToEdit(null);
    setDhikrModalVisible(true);
  };

  const handleOpenEditDhikr = (dhikr: DhikrRow) => {
    setDhikrToEdit(dhikr);
    setDhikrModalVisible(true);
  };

  const handleSaveDhikr = async (data: {
    id: string | null;
    name: string;
    target: number | null;
  }) => {
    try {
      if (data.id) {
        await updateDhikrCounter(data.id, data.name, data.target);
      } else {
        await addDhikrCounter(data.name, data.target);
      }
      setDhikrModalVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert('خطأ', 'فشل حفظ الذكر');
    }
  };

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

      {/* Header using ScreenHeader */}
      <ScreenHeader
        title={ar.settings.title}
        center
        borderBottom
        leftAction={
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={28} color={theme.colors.muted} />
          </Pressable>
        }
      />

      {/* Custom Tabs */}
      <View style={[styles.tabContainer, { flexDirection: rtlRow }]}>
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
      {activeTab === 'deeds' ? (
        // ScrollViewContainer is the required parent for the NestedReorderableLists
        // rendered per prayer section inside DeedsSettingsTab.
        <ScrollViewContainer contentContainerStyle={styles.scrollContent}>
          <DeedsSettingsTab
            scorecardStructure={scorecardStructure}
            dhikrNamesMap={dhikrNamesMap}
            onEditDeed={handleOpenEditDeed}
            onDeleteDeed={handleDeleteDeedConfirm}
          />
        </ScrollViewContainer>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <DhikrsSettingsTab
            dhikrsList={dhikrsList}
            onEditDhikr={handleOpenEditDhikr}
            onDeleteDhikr={handleDeleteDhikrConfirm}
          />
        </ScrollView>
      )}

      {/* Floating Save/Add Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={[styles.primaryBtn, { flexDirection: rtlRow }]}
          onPress={activeTab === 'deeds' ? handleOpenAddDeed : handleOpenAddDhikr}
          testID={activeTab === 'deeds' ? 'btn-add-deed' : 'btn-add-dhikr'}
        >
          <Ionicons name="add" size={22} color={theme.colors.onPrimary} />
          <Text style={styles.primaryBtnText}>
            {activeTab === 'deeds' ? ar.settings.deeds.add : ar.settings.dhikrs.add}
          </Text>
        </Pressable>
      </View>

      {/* DEED MODAL */}
      <DeedFormModal
        visible={deedModalVisible}
        onClose={handleCloseDeedModal}
        onSave={handleSaveDeed}
        deed={deedToEdit}
        sectionsList={sectionsList}
        dhikrsList={dhikrsList}
      />

      {/* DHIKR MODAL */}
      <DhikrFormModal
        visible={dhikrModalVisible}
        onClose={() => setDhikrModalVisible(false)}
        onSave={handleSaveDhikr}
        dhikr={dhikrToEdit}
      />
    </View>
  );
}

function createStyles(theme: ThemeType) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    tabContainer: {
      backgroundColor: theme.colors.translucentBg,
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
      color: theme.colors.onPrimary,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
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
      borderTopColor: theme.colors.translucentBorder,
    },
    primaryBtn: {
      backgroundColor: theme.colors.primary,
      height: 52,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    primaryBtnText: {
      fontFamily: theme.fontBold,
      color: theme.colors.onPrimary,
      fontSize: 16,
    },
  });
}
