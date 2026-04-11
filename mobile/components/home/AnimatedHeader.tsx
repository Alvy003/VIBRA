// components/home/AnimatedHeader.tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/design';

interface AnimatedHeaderProps {
  scrollY: SharedValue<number>;
  userImageUrl?: string;
}

export const AnimatedHeader = React.memo(({ scrollY, userImageUrl }: AnimatedHeaderProps) => {
  const router = useRouter();
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
            <TouchableOpacity
              onPress={() => router.push('/profile' as any)}
              style={styles.avatarButton}
              activeOpacity={0.7}
            >
              <Image
                source={{
                  uri: userImageUrl || 'https://avatar.iran.liara.run/public/boy',
                  width: 100,
                  height: 100
                }}
                style={styles.avatar}
                cachePolicy="memory-disk"
                transition={200}
              />
            </TouchableOpacity>
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
    backgroundColor: 'rgba(9, 9, 11, 0.85)', // Same as COLORS.background but translucent
  },
  contentWrapper: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
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
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
});