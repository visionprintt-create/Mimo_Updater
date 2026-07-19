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

// Mint & Glass Palette
const BG_MINT = '#BAC9C5'; // Mint Background
const BG_MINT_LIGHT = '#C3D1CE'; // Secondary
const BG_MINT_CARD = '#D1DFDB'; // Cards
const BORDER_SOFT = '#9FB2AC'; 
const BORDER_LIGHT = 'rgba(159, 178, 172, 0.4)';
const TEXT_DARK_GREEN = '#2D3A37'; // Dark Mint
const TEXT_SECONDARY = '#516863';
const TEXT_MUTED = '#728A85';

const defaultTheme: AppTheme = {
  name: 'Default',
  bg: BG_MINT,
  surface: BG_MINT_CARD,
  border: BORDER_SOFT,
  borderLight: BORDER_LIGHT,
  textPrimary: TEXT_DARK_GREEN,
  textSecondary: TEXT_SECONDARY,
  textMuted: TEXT_MUTED,
  accent: '#D69B69', // Orange Accent
  accentGlow: 'transparent',
  radialGlow: 'transparent',
  gradient: 'linear-gradient(135deg, #BAC9C5 0%, #9CC2BD 100%)', // Mint Gradient
  green: '#82A29C', // Indigo/Mint Accent
  red: '#A85751', // Red
  yellow: '#D69B69', // Orange
  indigo: '#5C7080', // Slate Blue
};

const themes: Record<string, AppTheme> = {
  'Marketing': { ...defaultTheme, name: 'Marketing' },
  'Frontend': { ...defaultTheme, name: 'Frontend' },
  'Backend': { ...defaultTheme, name: 'Backend' },
  'Production': { ...defaultTheme, name: 'Production' },
  'Hardware Team': { ...defaultTheme, name: 'Hardware' },
  'Finance': { ...defaultTheme, name: 'Finance' },
  'Design': { ...defaultTheme, name: 'Design' }
};

export function getTheme(department?: Department | string | null): AppTheme {
  if (!department) return defaultTheme;
  return themes[department] || defaultTheme;
}
