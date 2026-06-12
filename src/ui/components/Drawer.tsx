import { Modal, View, Text, Pressable, StyleSheet, Animated, Dimensions, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/ui/theme';
import { ar } from '@/i18n/ar';
import { useEffect, useRef } from 'react';

interface DrawerProps {
  visible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;
const OFFSCREEN_TRANSLATE = I18nManager.isRTL ? -DRAWER_WIDTH : DRAWER_WIDTH;

export function Drawer({ visible, onClose }: DrawerProps) {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(OFFSCREEN_TRANSLATE)).current;

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
            <Pressable style={styles.menuItem} onPress={() => {}}>
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
          </View>

          <View style={styles.footer}>
            <Text style={styles.version}>{ar.drawer.version} 1.0.0</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: theme.colors.surface,
    height: '100%',
    paddingTop: 50,
    paddingHorizontal: 24,
  },
  header: { flexDirection: 'row-reverse', marginBottom: 32 },
  menu: { flex: 1, gap: 24 },
  menuItem: { paddingVertical: 8 },
  menuItemText: { color: theme.colors.text, fontFamily: theme.font, fontSize: 18, textAlign: 'right' },
  footer: { paddingBottom: 40 },
  version: { color: theme.colors.muted, fontFamily: theme.font, fontSize: 14, textAlign: 'right' },
});
