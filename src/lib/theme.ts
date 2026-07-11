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

// Light Mode Premium Cream & Glass Base
const SURFACE = 'rgba(255, 255, 255, 0.4)'; // Soft translucent white
const BORDER = 'rgba(0, 0, 0, 0.08)'; // Subtle border for partitioning
const BORDER_LIGHT = 'rgba(0, 0, 0, 0.04)'; // Extremely faint border
const TEXT_PRIMARY = '#111827'; // Very dark gray for contrast
const TEXT_SECONDARY = '#4b5563'; // Medium gray
const TEXT_MUTED = '#9ca3af'; 

const defaultTheme: AppTheme = {
  name: 'Default',
  bg: '#fcfcfc', // Premium creamy white base
  surface: SURFACE,
  border: BORDER,
  borderLight: BORDER_LIGHT,
  textPrimary: TEXT_PRIMARY,
  textSecondary: TEXT_SECONDARY,
  textMuted: TEXT_MUTED,
  accent: '#374151', 
  accentGlow: 'transparent',
  radialGlow: 'transparent',
  gradient: 'linear-gradient(135deg, #4b5563 0%, #1f2937 100%)',
  green: '#10b981',
  red: '#ef4444',
  yellow: '#f59e0b',
  indigo: '#6366f1',
};

const themes: Record<string, AppTheme> = {
  'Technical Team': {
    ...defaultTheme,
    name: 'Technical',
    // Ultra smooth and soft wave fading perfectly into the cream
    bg: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(6, 182, 212, 0.03) 40%, #fcfcfc 100%)',
    accent: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  },
  'Marketing': {
    ...defaultTheme,
    name: 'Marketing',
    bg: 'linear-gradient(135deg, rgba(217, 70, 239, 0.08) 0%, rgba(217, 70, 239, 0.03) 40%, #fcfcfc 100%)',
    accent: '#d946ef',
    gradient: 'linear-gradient(135deg, #d946ef 0%, #f43f5e 100%)',
  },
  'Hardware Team': {
    ...defaultTheme,
    name: 'Hardware',
    bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.03) 40%, #fcfcfc 100%)',
    accent: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
  },
  'Finance': {
    ...defaultTheme,
    name: 'Finance',
    bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.03) 40%, #fcfcfc 100%)',
    accent: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  },
  'Design': {
    ...defaultTheme,
    name: 'Design',
    bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.03) 40%, #fcfcfc 100%)',
    accent: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
  }
};

export function getTheme(department?: Department | string | null): AppTheme {
  if (!department) return defaultTheme;
  return themes[department] || defaultTheme;
}
