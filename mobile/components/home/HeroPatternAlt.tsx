// components/home/HeroPatternAlt.tsx
import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, Pattern, Circle, Line, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { TIME_GRADIENTS, getTimeOfDay } from '@/constants/design';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HeroPatternProps {
  height?: number;
}

export const HeroPatternAlt = React.memo(({ height = 260 }: HeroPatternProps) => {
  const timeOfDay = useMemo(() => getTimeOfDay(), []);
  const { colors, accent } = TIME_GRADIENTS[timeOfDay];

  return (
    <View style={[styles.container, { height }]}>
      {/* Minimal dot grid pattern */}
      <Svg width={SCREEN_WIDTH} height={height} style={styles.svgLayer}>
        <Defs>
          <Pattern
            id="dotGrid"
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <Circle cx="12" cy="12" r="1" fill={accent} opacity={0.5} />
          </Pattern>
        </Defs>
        
        <Rect
          x="0"
          y="0"
          width={SCREEN_WIDTH}
          height={height}
          fill="url(#dotGrid)"
          opacity={0.12}
        />
      </Svg>

      {/* Main color gradient */}
      <LinearGradient
        colors={[`${accent}40`, `${accent}20`, 'transparent']}
        locations={[0, 0.3, 0.6]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.colorWash}
      />

      {/* Fade to black */}
      <LinearGradient
        colors={['transparent', 'rgba(9,9,11,0.6)', '#09090b']}
        locations={[0.2, 0.6, 1]}
        style={styles.gradient}
      />

      {/* Subtle top edge line */}
      <View style={[styles.topLine, { backgroundColor: accent }]} />
    </View>
  );
});

HeroPatternAlt.displayName = 'HeroPatternAlt';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#09090b',
  },
  svgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  colorWash: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.4,
  },
});