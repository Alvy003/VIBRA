// components/home/HomeHeroSection.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeroPattern } from './HeroPattern';
import { QuickPicksGrid } from './QuickPicksGrid';

interface HomeHeroSectionProps {
  heroParallaxStyle?: any;
}

export const HomeHeroSection = React.memo(({ 
  heroParallaxStyle 
}: HomeHeroSectionProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Pattern Background */}
      <Animated.View style={[styles.patternWrapper, heroParallaxStyle]}>
        <HeroPattern height={220 + insets.top} />
      </Animated.View>

      {/* Content overlaid on pattern */}
      <View style={[styles.contentWrapper, { paddingTop: insets.top + 60 }]}>
        <QuickPicksGrid />
      </View>
    </View>
  );
});

HomeHeroSection.displayName = 'HomeHeroSection';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  patternWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  contentWrapper: {
    position: 'relative',
    zIndex: 1,
  },
});