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

  // Fade out header as user scrolls
  const headerAnimatedStyle = useAnimatedStyle(() => ({
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
        [0, -20],
        Extrapolation.CLAMP
      ),
    }],
  }));

  return (
    <Animated.View 
      style={[
        styles.wrapper, 
        { paddingTop: insets.top },
        headerAnimatedStyle,
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
  );
});

AnimatedHeader.displayName = 'AnimatedHeader';

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
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