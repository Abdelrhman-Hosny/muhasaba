import { Modal, View, Text, Pressable, StyleSheet, Animated, Dimensions, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeType, themeMode$, setThemeMode } from '@/ui/theme';
import { ar } from '@/i18n/ar';
import { useEffect, useRef, useMemo, useSyncExternalStore } from 'react';

interface DrawerProps {
  visible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;
const OFFSCREEN_TRANSLATE = DRAWER_WIDTH;

export function Drawer({ visible, onClose }: DrawerProps) {
  const router = useRouter();
  const theme = useTheme();
  const currentThemeMode = useSyncExternalStore(themeMode$.onChange, themeMode$.get, themeMode$.get);
  const slideAnim = useRef(new Animated.Value(OFFSCREEN_TRANSLATE)).current;

  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: OFFSCREEN_TRANSLATE,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={28} color={theme.colors.muted} />
            </Pressable>
          </View>

          <View style={styles.menu}>
            <Pressable style={styles.menuItem} onPress={() => {}}>
              <Text style={styles.menuItemText}>{ar.drawer.stats}</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                onClose();
                setTimeout(() => router.push('/settings'), 100);
              }}
            >
              <Text style={styles.menuItemText}>{ar.drawer.settings}</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                onClose();
                // small delay to allow modal to close before navigation
                setTimeout(() => router.push('/account'), 100);
              }}
            >
              <Text style={styles.menuItemText}>{ar.drawer.account}</Text>
            </Pressable>

            {/* Segmented Theme Switcher */}
            <View style={styles.themeToggleContainer}>
              <Text style={styles.themeToggleLabel}>المظهر والسمات</Text>
              <View style={styles.themeRow}>
                {(['system', 'light', 'dark'] as const).map((mode) => {
                  const isActive = currentThemeMode === mode;
                  const iconName =
                    mode === 'system'
                      ? 'contrast-outline'
                      : mode === 'light'
                      ? 'sunny-outline'
                      : 'moon-outline';

                  const label =
                    mode === 'system'
                      ? 'تلقائي'
                      : mode === 'light'
                      ? 'مضيء'
                      : 'داكن';

                  return (
                    <Pressable
                      key={mode}
                      style={[
                        styles.themeButton,
                        isActive && styles.themeButtonActive,
                      ]}
                      onPress={() => setThemeMode(mode)}
                    >
                      <Ionicons
                        name={iconName}
                        size={16}
                        color={isActive ? theme.colors.primary : theme.colors.muted}
                      />
                      <Text
                        style={[
                          styles.themeButtonText,
                          isActive && styles.themeButtonTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.version}>{ar.drawer.version} 1.0.0</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(theme: ThemeType) {
  return StyleSheet.create({
    overlay: { flex: 1, flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse' },
    scrim: { ...StyleSheet.absoluteFill, backgroundColor: theme.colors.overlayBg },
    drawer: {
      width: DRAWER_WIDTH,
      backgroundColor: theme.colors.surface,
      height: '100%',
      paddingTop: 50,
      paddingHorizontal: 24,
    },
    header: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', marginBottom: 32 },
    menu: { flex: 1, gap: 24 },
    menuItem: { paddingVertical: 8 },
    menuItemText: { color: theme.colors.text, fontFamily: theme.font, fontSize: 18, textAlign: 'right' },
    themeToggleContainer: {
      marginTop: 12,
      paddingTop: 24,
      borderTopWidth: 1,
      borderTopColor: theme.colors.translucentBorder,
      width: '100%',
    },
    themeToggleLabel: {
      color: theme.colors.muted,
      fontFamily: theme.fontBold,
      fontSize: 14,
      textAlign: 'right',
      marginBottom: 12,
    },
    themeRow: {
      flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
      backgroundColor: theme.colors.translucentBg,
      borderRadius: 12,
      padding: 4,
    },
    themeButton: {
      flex: 1,
      flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 8,
    },
    themeButtonActive: {
      backgroundColor: theme.colors.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 2,
    },
    themeButtonText: {
      color: theme.colors.muted,
      fontFamily: theme.font,
      fontSize: 13,
    },
    themeButtonTextActive: {
      color: theme.colors.primary,
      fontFamily: theme.fontBold,
    },
    footer: { paddingBottom: 40 },
    version: { color: theme.colors.muted, fontFamily: theme.font, fontSize: 14, textAlign: 'right' },
  });
}
