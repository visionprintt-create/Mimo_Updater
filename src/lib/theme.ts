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
const BG_SAND = '#D8C4AC'; // SAND (Main background)
const SURFACE_CREME = '#EEE4DA'; // CREME (Floating islands/cards)
const BORDER_PINK = '#C8A49F'; // DUSTY PINK
const BORDER_LIGHT = 'rgba(200, 164, 159, 0.4)';
const TEXT_BURGENDY = '#4D0E13'; // BURGENDY
const TEXT_MUTED = '#7A5B57'; // Dark dusty pink/brown

const defaultTheme: AppTheme = {
  name: 'Default',
  bg: BG_SAND,
  surface: SURFACE_CREME,
  border: BORDER_PINK,
  borderLight: BORDER_LIGHT,
  textPrimary: TEXT_BURGENDY,
  textSecondary: TEXT_MUTED,
  textMuted: TEXT_MUTED,
  accent: '#C8A49F', // DUSTY PINK
  accentGlow: 'transparent',
  radialGlow: 'transparent',
  gradient: 'linear-gradient(135deg, #C8A49F 0%, #B88B85 100%)', // Soft Pink Gradient
  green: '#8A9A86', // Sage Green
  red: '#4D0E13', // BURGENDY
  yellow: '#D8C4AC', // SAND
  indigo: '#C8A49F', // DUSTY PINK
};

const themes: Record<string, AppTheme> = {
  'Technical Team': {
    ...defaultTheme,
    name: 'Technical',
    accent: '#A86C66', // Muted dark pink
    gradient: 'linear-gradient(135deg, #A86C66 0%, #875549 100%)', 
  },
  'Marketing': {
    ...defaultTheme,
    name: 'Marketing',
    accent: '#C8A49F', // DUSTY PINK
    gradient: 'linear-gradient(135deg, #C8A49F 0%, #B88B85 100%)',
  },
  'Hardware Team': {
    ...defaultTheme,
    name: 'Hardware',
    accent: '#C8A49F', // DUSTY PINK
    gradient: 'linear-gradient(135deg, #C8A49F 0%, #B88B85 100%)',
  },
  'Finance': {
    ...defaultTheme,
    name: 'Finance',
    accent: '#B88B85', // Slightly darker pink
    gradient: 'linear-gradient(135deg, #B88B85 0%, #A86C66 100%)',
  },
  'Design': {
    ...defaultTheme,
    name: 'Design',
    accent: '#C8A49F', // DUSTY PINK
    gradient: 'linear-gradient(135deg, #C8A49F 0%, #B88B85 100%)',
  }
};

export function getTheme(department?: Department | string | null): AppTheme {
  if (!department) return defaultTheme;
  return themes[department] || defaultTheme;
}
