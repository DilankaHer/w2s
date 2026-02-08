/**
 * Central dark theme for W2S mobile app.
 * Single source of truth for all UI colors.
 */
export const colors = {
  // Backgrounds
  background: '#121212',
  screen: '#1A1A1A',
  card: '#252525',
  cardElevated: '#2D2D2D',

  // Text
  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',

  // Borders
  border: '#374151',
  borderLight: '#4B5563',

  // Primary accent (blue)
  primary: '#3B82F6',
  primaryText: '#FFFFFF',

  // Semantic
  success: '#10B981',
  successText: '#FFFFFF',
  successBgDark: '#064E3B',
  error: '#EF4444',
  errorBg: '#7F1D1D',
  errorBorder: '#B91C1C',
  errorText: '#FEE2E2',
  warning: '#F59E0B',
  warningBg: '#78350F',
  warningBorder: '#FCD34D',
  warningText: '#FEF3C7',

  // Disabled / muted interactive
  disabled: '#6B7280',
  disabledBg: '#374151',

  // Overlay / modal
  overlay: 'rgba(0,0,0,0.5)',
  modal: '#252525',

  // Header (dark bar for nav)
  header: '#1A1A1A',
  headerText: '#F3F4F6',

  // Tab bar
  tabBar: '#1A1A1A',
  tabBarBorder: '#374151',
  tabActive: '#3B82F6',
  tabInactive: '#6B7280',

  // Input
  inputBg: '#252525',
  inputBorder: '#374151',
  placeholder: '#9CA3AF',
} as const

export type ThemeColors = typeof colors
