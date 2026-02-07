// Portify Theme Configuration - Inspired by Midas Design

export const Colors = {
  // Primary brand color
  primary: '#5D3FD3',
  primaryLight: '#8B7FE8',
  primaryDark: '#4A2FB8',

  // Light Mode
  light: {
    background: '#F5F6FA',
    surface: '#FFFFFF',
    surfaceSecondary: '#E8EAF0',
    text: '#1A1A2E',
    textPrimary: '#5D3FD3',
    textSecondary: '#6B7280',
    border: '#E0E0E8',
    success: '#00C853',
    error: '#FF3B30',
    warning: '#FF9500',
    cardShadow: 'rgba(93, 63, 211, 0.08)',
  },

  // Dark Mode - Improved contrast
  dark: {
    background: '#0F0F1E',
    surface: '#1A1A2E',
    surfaceSecondary: '#252541',
    text: '#FFFFFF',
    textPrimary: '#A78BFA',
    textSecondary: '#D1D5DB',
    border: '#2D2D44',
    success: '#34D399',
    error: '#F87171',
    warning: '#FBBF24',
    cardShadow: 'rgba(167, 139, 250, 0.15)',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};