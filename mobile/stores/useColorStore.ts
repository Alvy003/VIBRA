// stores/useColorStore.ts
import { create } from 'zustand';
import { getColors } from 'react-native-image-colors';
import { Platform } from 'react-native';

// Define gradient as a tuple type
type GradientColors = readonly [string, string, string, string];

interface TrackColors {
  gradient: GradientColors;
  dominant: string;
  isLoading: boolean;
}

interface ColorState {
  trackColors: Record<string, TrackColors>;
  extractColors: (trackId: string, artworkUri: string) => Promise<void>;
  getTrackColors: (trackId: string) => TrackColors;
}

// Default neutral gradient - typed as const to make it a tuple
const DEFAULT_GRADIENT: GradientColors = ['#1a1a2e', '#16213e', '#0f0f1a', '#000000'] as const;

const DEFAULT_COLORS: TrackColors = {
  gradient: DEFAULT_GRADIENT,
  dominant: '#1a1a2e',
  isLoading: false,
};

function getSaturationScore(hex: string): number {
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16) / 255;
  const g = parseInt(color.substring(2, 4), 16) / 255;
  const b = parseInt(color.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  return max === 0 ? 0 : (max - min) / max;
}

function lightenColor(hex: string, amount: number): string {
  const color = hex.replace('#', '');

  let r = parseInt(color.substring(0, 2), 16);
  let g = parseInt(color.substring(2, 4), 16);
  let b = parseInt(color.substring(4, 6), 16);

  r = Math.min(255, Math.floor(r + (255 - r) * amount));
  g = Math.min(255, Math.floor(g + (255 - g) * amount));
  b = Math.min(255, Math.floor(b + (255 - b) * amount));

  return `#${r.toString(16).padStart(2, '0')}${g
    .toString(16)
    .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getVibrantColor(hex: string): string {
  const color = hex.replace('#', '');

  let r = parseInt(color.substring(0, 2), 16);
  let g = parseInt(color.substring(2, 4), 16);
  let b = parseInt(color.substring(4, 6), 16);

  const gray = (r + g + b) / 3;
  const boost = 1.3;

  r = Math.min(255, Math.max(0, Math.floor(gray + (r - gray) * boost)));
  g = Math.min(255, Math.max(0, Math.floor(gray + (g - gray) * boost)));
  b = Math.min(255, Math.max(0, Math.floor(gray + (b - gray) * boost)));

  return `#${r.toString(16).padStart(2, '0')}${g
    .toString(16)
    .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getLuminance(hex: string): number {
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16) / 255;
  const g = parseInt(color.substring(2, 4), 16) / 255;
  const b = parseInt(color.substring(4, 6), 16) / 255;

  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function normalizeColor(hex: string): string {
  let color = hex;
  const luminance = getLuminance(color);
  const saturation = getSaturationScore(color);

  // Too dark (< 18% luminance) → lighten
  if (luminance < 0.18) {
    color = lightenColor(color, 0.3);
  }

  // Too bright (> 85% luminance) → darken
  if (luminance > 0.85) {
    color = darkenColor(color, 0.35);
  }

  // Too desaturated (< 20% saturation) → boost
  if (saturation < 0.20) {
    color = getVibrantColor(color);
  }

  // Re-check after adjustments - if still gray, shift toward blue-tint default
  const finalSat = getSaturationScore(color);
  if (finalSat < 0.15) {
    // Blend with a subtle blue to avoid pure gray
    return blendColors(color, '#2d4a7c', 0.3);
  }

  return color;
}

// Helper: blend two hex colors
function blendColors(hex1: string, hex2: string, ratio: number): string {
  const c1 = hex1.replace('#', '');
  const c2 = hex2.replace('#', '');
  
  const r1 = parseInt(c1.substring(0, 2), 16);
  const g1 = parseInt(c1.substring(2, 4), 16);
  const b1 = parseInt(c1.substring(4, 6), 16);
  
  const r2 = parseInt(c2.substring(0, 2), 16);
  const g2 = parseInt(c2.substring(2, 4), 16);
  const b2 = parseInt(c2.substring(4, 6), 16);
  
  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Darken a hex color by a percentage
function darkenColor(hex: string, amount: number): string {
  const color = hex.replace('#', '');
  
  let r = parseInt(color.substring(0, 2), 16);
  let g = parseInt(color.substring(2, 4), 16);
  let b = parseInt(color.substring(4, 6), 16);
  
  r = Math.max(0, Math.floor(r * (1 - amount)));
  g = Math.max(0, Math.floor(g * (1 - amount)));
  b = Math.max(0, Math.floor(b * (1 - amount)));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Adjust saturation (reduce for more muted look)
function adjustSaturation(hex: string, amount: number): string {
  const color = hex.replace('#', '');
  let r = parseInt(color.substring(0, 2), 16);
  let g = parseInt(color.substring(2, 4), 16);
  let b = parseInt(color.substring(4, 6), 16);
  
  const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
  
  r = Math.round(r * amount + gray * (1 - amount));
  g = Math.round(g * amount + gray * (1 - amount));
  b = Math.round(b * amount + gray * (1 - amount));
  
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function generateGradient(dominantColor: string): GradientColors {
  const baseColor = adjustSaturation(dominantColor, 0.9);

  return [
    darkenColor(baseColor, 0.05),
    darkenColor(baseColor, 0.25),
    darkenColor(baseColor, 0.45),
    // darkenColor(baseColor, 0.95),
    '#000000',
  ] as const;
}

// Validate hex color
function isValidHex(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

// Ensure color is valid hex, fallback to default
function sanitizeColor(color: string | undefined | null, fallback: string): string {
  if (!color) return fallback;
  const sanitized = color.startsWith('#') ? color : `#${color}`;
  return isValidHex(sanitized) ? sanitized : fallback;
}

export const useColorStore = create<ColorState>((set, get) => ({
  trackColors: {},

  getTrackColors: (trackId: string): TrackColors => {
    const colors = get().trackColors[trackId];
    if (colors) return colors;

    // Return last used gradient instead of default
    const lastTrack = Object.values(get().trackColors).slice(-1)[0];
    return lastTrack || DEFAULT_COLORS;
  },

  extractColors: async (trackId: string, artworkUri: string) => {
    // Check if already cached or loading
    const existing = get().trackColors[trackId];
    if (existing?.isLoading) return;

    // Set loading state
    set((state) => ({
      trackColors: {
        ...state.trackColors,
        [trackId]: {
          ...(state.trackColors[trackId] || DEFAULT_COLORS),
          isLoading: true,
        },
      },
    }));

    try {
      const result = await getColors(artworkUri, {
        fallback: '#1a1a2e',
        cache: true,
        key: trackId,
      });

      let dominant: string = '#1a1a2e';
      // console.log('Color result for', trackId, result);

      if (Platform.OS === 'ios') {
        // iOS returns different color properties
        const iosResult = result as {
          background?: string;
          primary?: string;
          secondary?: string;
          detail?: string;
        };
        dominant = sanitizeColor(
          iosResult.background || iosResult.primary || iosResult.secondary,
          '#1a1a2e'
        );
      } else {
        // Android
        const androidResult = result as {
          vibrant?: string;
          darkVibrant?: string;
          dominant?: string;
          muted?: string;
          lightVibrant?: string;
          darkMuted?: string;
          lightMuted?: string;
          average?: string;
        };
// Replace the Android color selection logic:
const candidates = [
  { color: androidResult.vibrant, weight: 1.0 },
  { color: androidResult.lightVibrant, weight: 0.85 },
  { color: androidResult.darkVibrant, weight: 0.9 },
  { color: androidResult.dominant, weight: 0.7 },
  { color: androidResult.muted, weight: 0.4 },
  { color: androidResult.average, weight: 0.3 },
].filter(c => c.color);

let bestColor = '#1a1a2e';
let bestScore = 0;

for (const { color, weight } of candidates) {
  const sanitized = sanitizeColor(color, '#1a1a2e');
  const saturation = getSaturationScore(sanitized);
  const luminance = getLuminance(sanitized);

  // Reject very dark colors (< 8% luminance)
  if (luminance < 0.08) continue;

  // Reject very bright/washed out colors (> 92% luminance)
  if (luminance > 0.92) continue;

  // Reject grays (saturation < 12%)
  if (saturation < 0.12) continue;

  // Spotify-style scoring:
  // 1. Prioritize saturation (vivid colors)
  // 2. Prefer mid-range luminance (not too dark/bright)
  // 3. Apply candidate weight (vibrant > dominant > muted)
  const saturationScore = saturation; // 0-1
  const luminanceScore = 1 - Math.abs(luminance - 0.45); // peak at 45% luminance
  
  const score = (saturationScore * 0.65 + luminanceScore * 0.35) * weight;

  if (score > bestScore) {
    bestScore = score;
    bestColor = sanitized;
  }
}

// Fallback: if no good color found (all rejected), use dominant with normalization
if (bestScore === 0 && androidResult.dominant) {
  bestColor = sanitizeColor(androidResult.dominant, '#1a1a2e');
}

dominant = bestColor;
      }

const normalized = normalizeColor(dominant);
const gradient = generateGradient(normalized);

      set((state) => ({
        trackColors: {
          ...state.trackColors,
          [trackId]: {
            gradient,
            dominant: normalized,
            isLoading: false,
          },
        },
      }));
    } catch (error) {
      console.warn('Color extraction failed:', error);
      // Set default colors on failure
      set((state) => ({
        trackColors: {
          ...state.trackColors,
          [trackId]: DEFAULT_COLORS,
        },
      }));
    }
  },
}));