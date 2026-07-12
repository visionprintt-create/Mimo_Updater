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

// Warm Cream & Earthy Tones
const SURFACE = 'rgba(255, 255, 255, 0.65)'; // Soft translucent white
const BORDER = '#dfccb1'; // Warm Beige for borders
const BORDER_LIGHT = 'rgba(223, 204, 177, 0.5)'; // Faint Warm Beige
const TEXT_PRIMARY = '#4a4036'; // Dark warm brownish gray for text
const TEXT_SECONDARY = '#7a6f62'; // Medium warm gray
const TEXT_MUTED = '#a3988c'; // Muted earthy gray

const CREAM_BG = '#fdfbf6'; // Creamish background, not stark white

const defaultTheme: AppTheme = {
  name: 'Default',
  bg: CREAM_BG,
  surface: SURFACE,
  border: BORDER,
  borderLight: BORDER_LIGHT,
  textPrimary: TEXT_PRIMARY,
  textSecondary: TEXT_SECONDARY,
  textMuted: TEXT_MUTED,
  accent: '#c4a071', // Golden Tan
  accentGlow: 'transparent',
  radialGlow: 'transparent',
  gradient: 'linear-gradient(135deg, #c4a071 0%, #a76d5e 100%)', // Golden Tan -> Dusty Rose
  green: '#98a086', // Sage Green
  red: '#a76d5e', // Dusty Rose
  yellow: '#c4a071', // Golden Tan
  indigo: '#98a086', // Sage Green as secondary accent
};

const themes: Record<string, AppTheme> = {
  'Technical Team': {
    ...defaultTheme,
    name: 'Technical',
    accent: '#98a086', // Sage Green
    gradient: 'linear-gradient(135deg, #98a086 0%, #768063 100%)', 
  },
  'Marketing': {
    ...defaultTheme,
    name: 'Marketing',
    accent: '#a76d5e', // Dusty Rose
    gradient: 'linear-gradient(135deg, #a76d5e 0%, #875549 100%)',
  },
  'Hardware Team': {
    ...defaultTheme,
    name: 'Hardware',
    accent: '#c4a071', // Golden Tan
    gradient: 'linear-gradient(135deg, #c4a071 0%, #a68459 100%)',
  },
  'Finance': {
    ...defaultTheme,
    name: 'Finance',
    accent: '#98a086', // Sage Green
    gradient: 'linear-gradient(135deg, #768063 0%, #98a086 100%)',
  },
  'Design': {
    ...defaultTheme,
    name: 'Design',
    accent: '#dfccb1', // Warm Beige
    gradient: 'linear-gradient(135deg, #dfccb1 0%, #c4a071 100%)',
  }
};

export function getTheme(department?: Department | string | null): AppTheme {
  if (!department) return defaultTheme;
  return themes[department] || defaultTheme;
}
