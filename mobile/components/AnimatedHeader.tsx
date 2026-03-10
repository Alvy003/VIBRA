// components/AnimatedHeader.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';

interface AnimatedHeaderProps {
  scrollY: SharedValue<number>;
  userImageUrl?: string;
}

export const AnimatedHeader: React.FC<AnimatedHeaderProps> = React.memo(({
  scrollY,
  userImageUrl,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Single animated style for background opacity
const backgroundStyle = useAnimatedStyle(() => {
  const opacity = interpolate(
    scrollY.value,
    [0, 80, 140],
    [0, 0.85, 1],
    Extrapolation.CLAMP
  );
  return { 
    opacity,
  };
});

  const borderOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [80, 140],
      [0, 0.08],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <View 
      style={[
        styles.headerWrapper, 
        { paddingTop: insets.top }
      ]}
    >
      {/* Background layer */}
      <Animated.View 
        style={[StyleSheet.absoluteFillObject, backgroundStyle]} 
      />

      {/* Blur (iOS only) */}
      {Platform.OS === 'ios' && (
        <BlurView
          intensity={30}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />
      )}

      {/* Bottom border */}
      <Animated.View style={[styles.borderLine, borderOpacity]} />

      {/* Header content */}
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/images/vibra.png')}
            style={styles.logo}
          />
          <Text style={styles.brandText}>VIBRA</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => router.push('/search' as any)}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <Search size={17} color="#d4d4d8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/profile' as any)}
            style={styles.avatarButton}
            activeOpacity={0.7}
          >
            <Image
              source={{
                uri: userImageUrl || 'https://avatar.iran.liara.run/public/boy',
              }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(147, 51, 234, 0.3)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  borderLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});