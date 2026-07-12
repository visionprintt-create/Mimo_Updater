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

// Olive & Rose Palette
const BG_WARM_BEIGE = '#E8DECE'; // Warm Beige (Main background)
const BG_LIGHT_BEIGE = '#F5F0E6'; // Light Beige (Floating islands)
const BORDER_SOFT = '#D3CABC'; 
const BORDER_LIGHT = 'rgba(211, 202, 188, 0.4)';
const TEXT_OLIVE_DARK = '#3F4238'; // Dark Olive/Charcoal
const TEXT_MUTED = '#9BA38C';

const defaultTheme: AppTheme = {
  name: 'Default',
  bg: BG_WARM_BEIGE,
  surface: BG_LIGHT_BEIGE,
  border: BORDER_SOFT,
  borderLight: BORDER_LIGHT,
  textPrimary: TEXT_OLIVE_DARK,
  textSecondary: '#768063', // Olive
  textMuted: TEXT_MUTED,
  accent: '#B5838D', // Rose
  accentGlow: 'transparent',
  radialGlow: 'transparent',
  gradient: 'linear-gradient(135deg, #B5838D 0%, #A2727C 100%)', // Soft Rose Gradient
  green: '#8A9A86', // Sage Green
  red: '#B5838D', // Rose
  yellow: '#D3CABC', // Beige
  indigo: '#768063', // Olive
};

const themes: Record<string, AppTheme> = {
  'Marketing': {
    ...defaultTheme,
    name: 'Marketing',
    accent: '#B5838D', // Rose
    gradient: 'linear-gradient(135deg, #B5838D 0%, #A2727C 100%)',
  },
  'Frontend': {
    ...defaultTheme,
    name: 'Frontend',
    accent: '#768063', // Olive
    gradient: 'linear-gradient(135deg, #768063 0%, #5E664E 100%)', 
  },
  'Backend': {
    ...defaultTheme,
    name: 'Backend',
    accent: '#C9A66B', // Gold
    gradient: 'linear-gradient(135deg, #C9A66B 0%, #B08D55 100%)', 
  },
  'Production': {
    ...defaultTheme,
    name: 'Production',
    accent: '#B5838D', // Rose
    gradient: 'linear-gradient(135deg, #B5838D 0%, #A2727C 100%)', 
  },
  'Hardware Team': {
    ...defaultTheme,
    name: 'Hardware',
    accent: '#768063', // Olive
    gradient: 'linear-gradient(135deg, #768063 0%, #5E664E 100%)',
  },
  'Finance': {
    ...defaultTheme,
    name: 'Finance',
    accent: '#C9A66B', // Gold
    gradient: 'linear-gradient(135deg, #C9A66B 0%, #B08D55 100%)',
  },
  'Design': {
    ...defaultTheme,
    name: 'Design',
    accent: '#B5838D', // Rose
    gradient: 'linear-gradient(135deg, #B5838D 0%, #A2727C 100%)',
  }
};

export function getTheme(department?: Department | string | null): AppTheme {
  if (!department) return defaultTheme;
  return themes[department] || defaultTheme;
}
