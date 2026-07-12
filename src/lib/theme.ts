import { Department } from '@/types';

export interface AppTheme {
  name: string;
  bg: string;
  surface: string;
  border: string;
  borderLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentGlow: string; 
  radialGlow: string;
  gradient: string;
  
  // Status Colors
  green: string;
  red: string;
  yellow: string;
  indigo: string;
}

// Nomiki Palette
const SURFACE = '#D8C4AC'; // SAND
const BORDER = '#C8A49F'; // DUSTY PINK
const BORDER_LIGHT = 'rgba(200, 164, 159, 0.5)'; // DUSTY PINK faint
const TEXT_PRIMARY = '#4D0E13'; // BURGENDY
const TEXT_SECONDARY = '#7A5B57'; // Dark dusty pink/brown
const TEXT_MUTED = '#A38C88'; // Muted dusty pink/brown

const CREAM_BG = '#EEE4DA'; // CREME

const defaultTheme: AppTheme = {
  name: 'Default',
  bg: CREAM_BG,
  surface: SURFACE,
  border: BORDER,
  borderLight: BORDER_LIGHT,
  textPrimary: TEXT_PRIMARY,
  textSecondary: TEXT_SECONDARY,
  textMuted: TEXT_MUTED,
  accent: '#C8A49F', // DUSTY PINK
  accentGlow: 'transparent',
  radialGlow: 'transparent',
  gradient: 'linear-gradient(135deg, #C8A49F 0%, #4D0E13 100%)', // DUSTY PINK -> BURGENDY
  green: '#8A9A86', // Sage Green (kept for status)
  red: '#4D0E13', // BURGENDY
  yellow: '#D8C4AC', // SAND
  indigo: '#C8A49F', // DUSTY PINK
};

const themes: Record<string, AppTheme> = {
  'Technical Team': {
    ...defaultTheme,
    name: 'Technical',
    accent: '#4D0E13', // BURGENDY
    gradient: 'linear-gradient(135deg, #4D0E13 0%, #2A0508 100%)', 
  },
  'Marketing': {
    ...defaultTheme,
    name: 'Marketing',
    accent: '#C8A49F', // DUSTY PINK
    gradient: 'linear-gradient(135deg, #C8A49F 0%, #7A5B57 100%)',
  },
  'Hardware Team': {
    ...defaultTheme,
    name: 'Hardware',
    accent: '#D8C4AC', // SAND
    gradient: 'linear-gradient(135deg, #D8C4AC 0%, #C8A49F 100%)',
  },
  'Finance': {
    ...defaultTheme,
    name: 'Finance',
    accent: '#C8A49F', // DUSTY PINK
    gradient: 'linear-gradient(135deg, #C8A49F 0%, #7A5B57 100%)',
  },
  'Design': {
    ...defaultTheme,
    name: 'Design',
    accent: '#D8C4AC', // SAND
    gradient: 'linear-gradient(135deg, #D8C4AC 0%, #C8A49F 100%)',
  }
};

export function getTheme(department?: Department | string | null): AppTheme {
  if (!department) return defaultTheme;
  return themes[department] || defaultTheme;
}
