// components/home/AIPlaylistCard.tsx
import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AIPlaylistCardProps {
  index?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const AIPlaylistCard = React.memo(({ index = 0 }: AIPlaylistCardProps) => {
  const router = useRouter();
  const glowValue = useSharedValue(0);
  const pressedScale = useSharedValue(1);
 
  useEffect(() => {
    glowValue.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);
 
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + glowValue.value * 0.08,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressedScale.value }],
  }));

  const handlePressIn = () => {
    pressedScale.value = withTiming(0.98, { duration: 150 });
  };

  const handlePressOut = () => {
    pressedScale.value = withTiming(1, { duration: 150 });
  };
  
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(tabs)/chat'
    });
  };

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 100).duration(600)}
      style={styles.outerContainer}
    >
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.container, containerStyle]}
      >
        {/* Deep Tool Surface */}
        <View style={styles.surface} />

        {/* 1. Ultra-Subtle Interior Glow */}
        <Animated.View style={[styles.glowLayer, glowStyle]}>
            <LinearGradient
                colors={['rgba(167, 139, 250, 0.12)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
        </Animated.View>

        <View style={styles.content}>
            <View style={styles.leftSection}>
              <View style={styles.iconContainer}>
                 <Sparkles size={16} color="#7B2CF5" fill="rgba(123, 44, 245, 0.4)" />
              </View>
              <View style={styles.textStack}>
                <Text style={styles.title}>Describe your vibe...</Text>
              </View>
            </View>

            <View style={styles.rightSection}>
              <View style={styles.goButton}>
                <ArrowRight size={18} color="#fff" strokeWidth={2.5} />
              </View>
            </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
});

AIPlaylistCard.displayName = 'AIPlaylistCard';

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  container: {
    height: 72,
    borderRadius: 36, // Capsule shape
    overflow: 'hidden',
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  surface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#121214', // Slightly lighter than background
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    zIndex: 2,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
  },
  textStack: {
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: -2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  }
});