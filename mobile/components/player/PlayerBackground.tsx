import React, { useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useColorStore } from '@/stores/useColorStore';

interface PlayerBackgroundProps {
  gradientStyle: any;
  screenHeight: number;
  initialColors?: {
    dominant?: string;
    gradient?: readonly [string, string, string, string] | readonly [string, string, string];
  };
}

const DEFAULT_GRADIENT = [Colors.surface, Colors.surface, Colors.surface, Colors.background];

const PlayerBackground = React.memo(({
  gradientStyle,
  screenHeight,
  initialColors,
}: PlayerBackgroundProps) => {
  // Atomic Store Subscriptions
  const trackId = usePlayerStore(s => s.currentTrack?.id);
  const trackColors = useColorStore(s => s.getTrackColors(trackId ?? 'none'));

  const lastValidGradientRef = useRef<readonly [string, string, string, string] | null>(null);

  const gradientColors = useMemo(() => {
    // Priority 1: current track's confirmed gradient (not loading)
    if (trackColors.gradient && !trackColors.isLoading) {
      lastValidGradientRef.current = trackColors.gradient;
      return trackColors.gradient;
    }
    // Priority 2: current track's gradient even while loading (stale is better than default)
    if (trackColors.gradient) {
      lastValidGradientRef.current = trackColors.gradient;
      return trackColors.gradient;
    }
    // Priority 3: last valid gradient from the previous track (stale persistence)
    if (lastValidGradientRef.current) {
      return lastValidGradientRef.current;
    }
    // Priority 4: colors passed from BottomPlayer at open time
    if (initialColors?.gradient) {
      const [c0, c1, c2] = initialColors.gradient;
      const parsed = [c0, c1, c2, '#09090b'] as const;
      lastValidGradientRef.current = parsed;
      return parsed;
    }
    // Priority 5: last resort default (only on very first open with no data at all)
    return DEFAULT_GRADIENT as unknown as readonly [string, string, string, string];
  }, [trackColors.gradient, trackColors.isLoading, initialColors?.gradient]);



  return (
    <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: screenHeight }, gradientStyle]}>
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
});

PlayerBackground.displayName = 'PlayerBackground';

export default PlayerBackground;
