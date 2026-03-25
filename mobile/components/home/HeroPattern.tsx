// components/home/HeroPattern.tsx
import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, Pattern, Rect, Circle, Path, G, Mask } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { TIME_GRADIENTS, getTimeOfDay } from '@/constants/design';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HeroPatternProps {
  height?: number;
  patternOpacity?: number;
}

export const HeroPattern = React.memo(({ 
  height = 280,
  patternOpacity = 0.08,
}: HeroPatternProps) => {
  const timeOfDay = useMemo(() => getTimeOfDay(), []);
  const { colors, accent } = TIME_GRADIENTS[timeOfDay];

  return (
    <View style={[styles.container, { height }]}>
      {/* SVG Pattern Layer */}
      <Svg
        width={SCREEN_WIDTH}
        height={height}
        style={styles.svgLayer}
      >
        <Defs>
          {/* Geometric Pattern Definition */}
          <Pattern
            id="heroPattern"
            x="0"
            y="0"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            {/* Dots grid */}
            <Circle cx="30" cy="30" r="1.5" fill={accent} opacity={0.6} />
            <Circle cx="0" cy="0" r="1" fill={accent} opacity={0.4} />
            <Circle cx="60" cy="0" r="1" fill={accent} opacity={0.4} />
            <Circle cx="0" cy="60" r="1" fill={accent} opacity={0.4} />
            <Circle cx="60" cy="60" r="1" fill={accent} opacity={0.4} />
            
            {/* Subtle connecting lines */}
            <Path
              d="M30 0 L30 15 M30 45 L30 60 M0 30 L15 30 M45 30 L60 30"
              stroke={accent}
              strokeWidth="0.5"
              opacity={0.3}
            />
            
            {/* Corner accents */}
            <Path
              d="M0 0 L8 0 M0 0 L0 8"
              stroke={accent}
              strokeWidth="0.5"
              opacity={0.2}
            />
            <Path
              d="M60 0 L52 0 M60 0 L60 8"
              stroke={accent}
              strokeWidth="0.5"
              opacity={0.2}
            />
          </Pattern>

          {/* Radial fade mask */}
          <Mask id="fadeMask">
            <Rect x="0" y="0" width={SCREEN_WIDTH} height={height} fill="white" />
          </Mask>
        </Defs>

        {/* Pattern fill */}
        <Rect
          x="0"
          y="0"
          width={SCREEN_WIDTH}
          height={height}
          fill="url(#heroPattern)"
          opacity={patternOpacity}
        />
      </Svg>

      {/* Gradient Overlay - blends to black */}
      <LinearGradient
        colors={colors}
        locations={[0, 0.25, 0.6, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.gradient, { opacity: 0.6 }]}
      />

      {/* Secondary gradient for smoother blend */}
      <LinearGradient
        colors={['transparent', 'rgba(9,9,11,0.4)', 'rgba(9,9,11,0.8)', '#09090b']}
        locations={[0, 0.4, 0.7, 1]}
        style={styles.gradient}
      />

      {/* Accent glow at top */}
      <View style={[styles.accentGlow, { backgroundColor: accent }]} />
    </View>
  );
});

HeroPattern.displayName = 'HeroPattern';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  svgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  accentGlow: {
    position: 'absolute',
    top: -50,
    left: '25%',
    width: '50%',
    height: 100,
    borderRadius: 100,
    opacity: 0.15,
    transform: [{ scaleX: 2 }],
  },
});