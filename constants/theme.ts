/**
 * SiiChiSei App Theme
 * Premium light theme with dark turquoise + mature orange accents
 */

export const Colors = {
  // Primary: Dark Turquoise
  primary: '#0D7377',
  primaryLight: '#14A3A8',
  primaryDark: '#095456',
  primaryFaded: '#E0F4F4',
  primarySurface: '#F0FAFA',

  // Accent: Mature Orange
  accent: '#D4762C',
  accentLight: '#E89A54',
  accentDark: '#A85A1F',
  accentFaded: '#FDF0E4',

  // Backgrounds
  background: '#FAFBFC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceHover: '#F5F7F9',

  // Text
  text: '#1A2332',
  textSecondary: '#5A6B7D',
  textTertiary: '#8E9AAD',
  textInverse: '#FFFFFF',

  // Borders & Dividers
  border: '#E2E8F0',
  borderLight: '#EDF2F7',
  divider: '#F0F3F6',

  // Status
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Chat
  bubbleSelf: '#0D7377',
  bubbleOther: '#F1F5F9',
  bubbleTextSelf: '#FFFFFF',
  bubbleTextOther: '#1A2332',

  // Call
  callActive: '#22C55E',
  callEnd: '#EF4444',
  callMuted: '#94A3B8',

  // Role badges
  roleTeacher: '#0D7377',
  roleAdmin: '#D4762C',
  roleStudent: '#6366F1',

  // Shadows
  shadowColor: '#1A2332',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  captionBold: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  small: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

export const Shadows = {
  sm: {
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};
