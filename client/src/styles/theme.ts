/**
 * Centralized Theme Configuration
 * All colors used throughout the application
 */

export const COLORS = {
  // Primary colors
  primary: {
    navy: '#1b2a6b',
    navyDark: '#162058',
    teal: '#16a085',
    tealDark: '#117a62',
  },

  // Slate colors
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Blue colors
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  // Sky colors
  sky: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
  },

  // Green colors
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },

  // Red colors
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
  },

  // Rose colors
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    500: '#f43f5e',
    600: '#e11d48',
  },

  // Violet colors
  violet: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    500: '#8b5cf6',
    600: '#7c3aed',
  },

  // Yellow colors
  yellow: {
    50: '#fefce8',
    100: '#fef9c3',
    500: '#eab308',
  },

  // Orange colors
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
  },

  // Amber colors
  amber: {
    50: '#fffbeb',
  },

  // Teal colors
  teal: {
    500: '#14b8a6',
  },

  // White
  white: '#ffffff',

  // Transparent
  transparent: 'transparent',
} as const;

/**
 * Semantic color mappings for specific use cases
 */
export const SEMANTIC_COLORS = {
  // Status colors
  status: {
    success: {
      bg: COLORS.green[50],
      border: COLORS.green[200],
      text: COLORS.green[600],
      icon: COLORS.green[600],
    },
    error: {
      bg: COLORS.red[50],
      border: COLORS.red[200],
      text: COLORS.red[600],
      icon: COLORS.red[600],
    },
    warning: {
      bg: COLORS.yellow[50],
      border: COLORS.yellow[100],
      text: COLORS.yellow[500],
      icon: COLORS.yellow[500],
    },
    info: {
      bg: COLORS.blue[50],
      border: COLORS.blue[200],
      text: COLORS.blue[600],
      icon: COLORS.blue[600],
    },
  },

  // Role colors
  role: {
    employee: {
      bg: COLORS.green[100],
      border: COLORS.green[200],
      text: COLORS.green[600],
    },
    supervisor: {
      bg: COLORS.sky[100],
      border: COLORS.sky[200],
      text: COLORS.sky[800],
    },
    hradmin: {
      bg: COLORS.violet[100],
      border: COLORS.violet[200],
      text: COLORS.violet[600],
    },
  },

  // Card/Panel colors
  card: {
    background: COLORS.white,
    border: COLORS.slate[200],
    shadow: 'rgba(0, 0, 0, 0.06)',
  },

  // Button variants
  button: {
    primary: {
      bg: COLORS.primary.navy,
      bgHover: COLORS.primary.navyDark,
      text: COLORS.white,
      border: COLORS.primary.navy,
    },
    secondary: {
      bg: COLORS.slate[100],
      bgHover: COLORS.slate[200],
      text: COLORS.slate[700],
      border: COLORS.slate[300],
    },
    danger: {
      bg: COLORS.red[600],
      bgHover: COLORS.red[700],
      text: COLORS.white,
      border: COLORS.red[600],
    },
  },

  // Action button variants
  action: {
    edit: {
      color: COLORS.primary.navy,
      bg: COLORS.blue[50],
      bgHover: COLORS.blue[100],
      border: COLORS.blue[200],
      borderHover: COLORS.blue[300],
    },
    delete: {
      color: COLORS.rose[600],
      bg: COLORS.rose[50],
      bgHover: COLORS.rose[100],
      border: COLORS.red[200],
      borderHover: COLORS.red[300],
    },
    view: {
      color: COLORS.primary.navy,
      bg: COLORS.blue[50],
      bgHover: COLORS.blue[100],
      border: COLORS.blue[200],
      borderHover: COLORS.blue[300],
    },
  },

  // Gradient backgrounds
  gradient: {
    primary: `linear-gradient(135deg, ${COLORS.primary.navy}, ${COLORS.primary.teal})`,
    primaryToBr: `linear-gradient(to bottom right, ${COLORS.primary.navy}, ${COLORS.primary.teal})`,
    card: `linear-gradient(to bottom right, ${COLORS.blue[950]}, ${COLORS.teal[500]})`,
  },

  // Text colors
  text: {
    primary: COLORS.slate[800],
    secondary: COLORS.slate[600],
    tertiary: COLORS.slate[500],
    muted: COLORS.slate[400],
    disabled: COLORS.slate[300],
  },
} as const;

/**
 * Stat card color configurations
 */
export const STAT_CARD_COLORS = {
  primary: {
    color: COLORS.primary.navy,
    bg: COLORS.blue[50],
    border: COLORS.blue[200],
  },
  success: {
    color: COLORS.green[600],
    bg: COLORS.green[50],
    border: COLORS.green[200],
  },
  info: {
    color: COLORS.sky[700],
    bg: COLORS.sky[100],
    border: COLORS.sky[200],
  },
  warning: {
    color: COLORS.violet[600],
    bg: COLORS.violet[50],
    border: COLORS.violet[200],
  },
  secondary: {
    color: COLORS.sky[800],
    bg: COLORS.sky[100],
    border: COLORS.sky[200],
  },
} as const;

/**
 * Helper function to get opacity variants
 */
export const withOpacity = (color: string, opacity: number): string => {
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
};

/**
 * Shadow configurations
 */
export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 1px 8px rgba(0, 0, 0, 0.06)',
  lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  '2xl': '0 24px 80px rgba(0, 0, 0, 0.22)',
  card: '0 2px 8px rgba(27, 42, 107, 0.08)',
  button: '0 2px 8px rgba(27, 42, 107, 0.18)',
} as const;
