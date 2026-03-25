// constants/design.ts
export const RADIUS = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

export const COLORS = {
  background: '#09090b',
  surface: '#18181b',
  surfaceLight: '#27272a',
  textPrimary: '#ffffff',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  border: 'rgba(255,255,255,0.08)',
};

// Time-based gradient palettes (blends into black)
export const TIME_GRADIENTS = {
  morning: {
    // 6am - 12pm: Warm oranges, soft yellows
    colors: ['#f59e0b', '#d97706', '#78350f', '#09090b'] as const,
    accent: '#f59e0b',
  },
  afternoon: {
    // 12pm - 6pm: Bright blues, teals
    colors: ['#06b6d4', '#0891b2', '#164e63', '#09090b'] as const,
    accent: '#06b6d4',
  },
  evening: {
    // 6pm - 10pm: Purples, magentas
    colors: ['#a855f7', '#7c3aed', '#3b0764', '#09090b'] as const,
    accent: '#a855f7',
  },
  night: {
    // 10pm - 6am: Deep blues, dark purples
    colors: ['#6366f1', '#4338ca', '#1e1b4b', '#09090b'] as const,
    accent: '#6366f1',
  },
};

export const getTimeOfDay = (): keyof typeof TIME_GRADIENTS => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
};


// Search Colors
export const SEARCH_COLORS = {
  background: '#09090b',
  surface: '#18181b',
  surfaceLight: '#27272a',
  input: '#1a1a1a',
  inputBorder: 'rgba(255,255,255,0.07)',
  textPrimary: '#ffffff',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  accent: '#9333ea',
  accentLight: 'rgba(147, 51, 234, 0.1)',
  divider: 'rgba(255,255,255,0.05)',
  trendingGlow: '#f97316',
};

export const MOODS = [
  {
    id: 'chill',
    label: 'Chill',
    emoji: '🌙',
    gradient: ['#0891b2', '#06b6d4', '#164e63'],
    description: 'Relax and unwind',
  },
  {
    id: 'party',
    label: 'Party',
    emoji: '🎉',
    gradient: ['#dc2626', '#f43f5e', '#881337'],
    description: 'Turn up the energy',
  },
  {
    id: 'focus',
    label: 'Focus',
    emoji: '🎯',
    gradient: ['#7c3aed', '#a855f7', '#581c87'],
    description: 'Deep concentration',
  },
  {
    id: 'workout',
    label: 'Workout',
    emoji: '💪',
    gradient: ['#16a34a', '#22c55e', '#15803d'],
    description: 'Get pumped up',
  },
  {
    id: 'romance',
    label: 'Romance',
    emoji: '💕',
    gradient: ['#db2777', '#ec4899', '#9f1239'],
    description: 'Love songs',
  },
  {
    id: 'sleep',
    label: 'Sleep',
    emoji: '😴',
    gradient: ['#4338ca', '#6366f1', '#312e81'],
    description: 'Peaceful rest',
  },
];

export const GENRE_CHIPS = [
  { id: 'pop', label: 'Pop', icon: '🎵' },
  { id: 'rock', label: 'Rock', icon: '⚡' },
  { id: 'hiphop', label: 'Hip Hop', icon: '🎤' },
  { id: 'jazz', label: 'Jazz', icon: '🎺' },
  { id: 'electronic', label: 'Electronic', icon: '🎧' },
  { id: 'classical', label: 'Classical', icon: '🎻' },
  { id: 'indie', label: 'Indie', icon: '🎸' },
  { id: 'bollywood', label: 'Bollywood', icon: '🎬' },
  { id: 'reggae', label: 'Reggae', icon: '🌴' },
  { id: 'country', label: 'Country', icon: '🤠' },
];