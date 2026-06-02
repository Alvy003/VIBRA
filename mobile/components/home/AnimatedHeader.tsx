// components/home/AnimatedHeader.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { UserProfileIcon } from '../UserProfileIcon';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/design';

interface AnimatedHeaderProps {
  scrollY: SharedValue<number>;
  userImageUrl?: string;
}

export const AnimatedHeader = React.memo(({ scrollY, userImageUrl }: AnimatedHeaderProps) => {
  const insets = useSafeAreaInsets();

  // Fade content (avatar) as user scrolls
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, 30, 60],
      [1, 0.5, 0],
      Extrapolation.CLAMP
    ),
    transform: [{
      translateY: interpolate(
        scrollY.value,
        [0, 100],
        [0, -15],
        Extrapolation.CLAMP
      ),
    }],
  }));

  // Background fades in as user scrolls
  const bgAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [20, 80],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <View
      style={styles.wrapper}
      pointerEvents="box-none"
    >
      {/* Translucent Background */}
      <Animated.View
        style={[
          styles.background,
          bgAnimatedStyle,
          { height: insets.top }
        ]}
      />

      <Animated.View
        style={[
          styles.contentWrapper,
          { paddingTop: insets.top },
          contentAnimatedStyle,
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.content} pointerEvents="box-none">
          {/* Left side - empty or logo */}
          <View style={styles.left} />

          {/* Right side - avatar */}
          <View style={styles.right}>
            <UserProfileIcon size={36} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
});

AnimatedHeader.displayName = 'AnimatedHeader';

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 9, 11, 0.85)', // We keep the explicit RGBA for the backdrop transparency
  },
  contentWrapper: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});