import { createMMKV } from 'react-native-mmkv';
import { makeObservable } from '@/state/observable';
import { useColorScheme, I18nManager } from 'react-native';
import { useSyncExternalStore } from 'react';

export const rtlRow: 'row' | 'row-reverse' = I18nManager.isRTL ? 'row' : 'row-reverse';
export const rtlAlign: 'left' | 'right' = I18nManager.isRTL ? 'left' : 'right';

export interface AppTheme {
  dark: boolean;
  colors: {
    bg: string;
    surface: string;
    surfaceDone: string;
    primary: string;
    text: string;
    muted: string;
    onTime: string;
    late: string;
    missed: string;
    notYet: string;
    translucentBg: string;
    translucentBgActive: string;
    translucentPrimary: string;
    translucentPrimaryBorder: string;
    translucentBorder: string;
    translucentBorderStrong: string;
    placeholderText: string;
    inputPlaceholder: string;
    overlayBg: string;
    onPrimary: string;
    onPrimaryMuted: string;
    switchThumb: string;
    notDoneBg: string;
    googleBlue: string;
  };
  spacing: (n: number) => number;
  font: string;
  fontBold: string;
  statusBar: 'light' | 'dark';
}

const storage = createMMKV({ id: 'muhassaba-theme' });
const INITIAL_THEME = (storage.getString('themeMode') as 'system' | 'light' | 'dark') || 'system';

export const themeMode$ = makeObservable<'system' | 'light' | 'dark'>(INITIAL_THEME);

export function setThemeMode(mode: 'system' | 'light' | 'dark') {
  storage.set('themeMode', mode);
  themeMode$.set(mode);
}

export const darkTheme: AppTheme = {
  dark: true,
  colors: {
    bg: '#0f1a17', // Soft slate jade-teal
    surface: '#1b2723', // Sleek card background
    surfaceDone: '#1c413a', // Elegant primary tint for completed items
    primary: '#14b8a6', // Serene jade-teal accent
    text: '#f8fafc', // Crisp white text
    muted: '#aecbc4', // Brighter minty gray for subtitles/secondary text (legible on dark cards)
    onTime: '#14b8a6',
    late: '#f59e0b',
    missed: '#ef4444',
    notYet: '#2b3b38', // Soft olive-gray for uncompleted progress/backgrounds
    translucentBg: 'rgba(255, 255, 255, 0.04)',
    translucentBgActive: 'rgba(255, 255, 255, 0.1)',
    translucentPrimary: 'rgba(20, 184, 166, 0.08)',
    translucentPrimaryBorder: 'rgba(20, 184, 166, 0.15)',
    translucentBorder: 'rgba(255, 255, 255, 0.05)',
    translucentBorderStrong: 'rgba(255, 255, 255, 0.08)',
    placeholderText: 'rgba(255, 255, 255, 0.4)',
    inputPlaceholder: 'rgba(255, 255, 255, 0.3)',
    overlayBg: 'rgba(0, 0, 0, 0.6)',
    onPrimary: '#ffffff',
    onPrimaryMuted: '#dfeee5', // Soft tint for secondary text on primary backgrounds
    switchThumb: '#8a9590', // Off-state knob, visible on dark track
    notDoneBg: 'rgba(239, 68, 68, 0.08)',
    googleBlue: '#4285F4',
  },
  spacing: (n: number) => n * 8,
  font: 'Cairo',
  fontBold: 'Cairo-Bold',
  statusBar: 'light',
};

export const lightTheme: AppTheme = {
  dark: false,
  colors: {
    bg: '#eef4f2', // Soft minty/sage light background
    surface: '#ffffff', // Clean white card background
    surfaceDone: '#ccf2ec', // Soft jade-teal accent tint for completed items
    primary: '#0d9488', // Deeper jade-teal for readability on light BG
    text: '#0f172a', // Dark slate text for high contrast
    muted: '#5f7b76', // Soft minty gray/sage for subtitles/secondary text
    onTime: '#0d9488',
    late: '#d97706', // Darker amber for readability on light BG
    missed: '#dc2626', // Darker red for readability on light BG
    notYet: '#e3ece9', // Soft light sage/gray for uncompleted progress/backgrounds
    translucentBg: 'rgba(0, 0, 0, 0.04)',
    translucentBgActive: 'rgba(0, 0, 0, 0.08)',
    translucentPrimary: 'rgba(13, 148, 136, 0.08)',
    translucentPrimaryBorder: 'rgba(13, 148, 136, 0.15)',
    translucentBorder: 'rgba(0, 0, 0, 0.06)',
    translucentBorderStrong: 'rgba(0, 0, 0, 0.1)',
    placeholderText: 'rgba(0, 0, 0, 0.4)',
    inputPlaceholder: 'rgba(0, 0, 0, 0.3)',
    overlayBg: 'rgba(0, 0, 0, 0.4)',
    onPrimary: '#ffffff',
    onPrimaryMuted: '#e6f5ee', // Soft tint for secondary text on primary backgrounds
    switchThumb: '#f4f4f4', // Off-state knob, light on light track
    notDoneBg: 'rgba(239, 68, 68, 0.08)',
    googleBlue: '#4285F4',
  },
  spacing: (n: number) => n * 8,
  font: 'Cairo',
  fontBold: 'Cairo-Bold',
  statusBar: 'dark',
};

export type ThemeType = AppTheme;

// Default theme object for non-reactive/backward compatible imports
export const theme = darkTheme;

export function useTheme(): ThemeType {
  const mode = useSyncExternalStore(themeMode$.onChange, themeMode$.get, themeMode$.get);
  const systemScheme = useColorScheme();
  
  const activeMode = mode === 'system' ? (systemScheme || 'dark') : mode;
  
  return activeMode === 'light' ? lightTheme : darkTheme;
}
