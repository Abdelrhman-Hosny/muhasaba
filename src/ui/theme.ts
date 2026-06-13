import { createMMKV } from 'react-native-mmkv';
import { makeObservable } from '@/state/observable';
import { useColorScheme } from 'react-native';
import { useSyncExternalStore } from 'react';

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
    bg: '#080d0a', // Deep slate jade-green
    surface: '#111a15', // Sleek card background
    surfaceDone: '#173528', // Elegant primary tint for completed items
    primary: '#10b981', // Vibrant emerald green accent
    text: '#f8fafc', // Crisp white text
    muted: '#7ea18f', // Soft minty gray for subtitles/secondary text
    onTime: '#10b981',
    late: '#f59e0b',
    missed: '#ef4444',
    notYet: '#23322a', // Dark olive-gray for uncompleted progress/backgrounds
    translucentBg: 'rgba(255, 255, 255, 0.04)',
    translucentBgActive: 'rgba(255, 255, 255, 0.1)',
    translucentPrimary: 'rgba(16, 185, 129, 0.08)',
    translucentPrimaryBorder: 'rgba(16, 185, 129, 0.15)',
    translucentBorder: 'rgba(255, 255, 255, 0.05)',
    translucentBorderStrong: 'rgba(255, 255, 255, 0.08)',
    placeholderText: 'rgba(255, 255, 255, 0.4)',
    inputPlaceholder: 'rgba(255, 255, 255, 0.3)',
    overlayBg: 'rgba(0, 0, 0, 0.6)',
  },
  spacing: (n: number) => n * 8,
  font: 'Cairo',
  fontBold: 'Cairo-Bold',
  statusBar: 'light',
};

export const lightTheme: AppTheme = {
  dark: false,
  colors: {
    bg: '#f2f7f4', // Soft minty/sage light background
    surface: '#ffffff', // Clean white card background
    surfaceDone: '#d1fae5', // Soft green accent tint for completed items
    primary: '#10b981', // Vibrant emerald green accent
    text: '#0f172a', // Dark slate text for high contrast
    muted: '#5f7b6d', // Soft minty gray/sage for subtitles/secondary text
    onTime: '#10b981',
    late: '#d97706', // Darker amber for readability on light BG
    missed: '#dc2626', // Darker red for readability on light BG
    notYet: '#e6ede9', // Soft light sage/gray for uncompleted progress/backgrounds
    translucentBg: 'rgba(0, 0, 0, 0.04)',
    translucentBgActive: 'rgba(0, 0, 0, 0.08)',
    translucentPrimary: 'rgba(16, 185, 129, 0.08)',
    translucentPrimaryBorder: 'rgba(16, 185, 129, 0.15)',
    translucentBorder: 'rgba(0, 0, 0, 0.06)',
    translucentBorderStrong: 'rgba(0, 0, 0, 0.1)',
    placeholderText: 'rgba(0, 0, 0, 0.4)',
    inputPlaceholder: 'rgba(0, 0, 0, 0.3)',
    overlayBg: 'rgba(0, 0, 0, 0.4)',
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
