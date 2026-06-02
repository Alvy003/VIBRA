// components/search/CategoryCard.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import {
  Music,
  Sparkles,
  Disc3,
  Languages,
  Flame,
  Guitar,
  Headphones,
  Heart,
  Moon,
  Dumbbell,
  PartyPopper,
  Radio,
  Mic2,
  Zap,
  Clock,
  Star,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_GAP) / 2;
const CARD_HEIGHT = 100;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Map category IDs to icons
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'music': Music,
  'made-for-you': Sparkles,
  'new-releases': Disc3,
  'hindi': Languages,
  'punjabi': Languages,
  'tamil': Languages,
  'telugu': Languages,
  'pop': Star,
  'hiphop': Mic2,
  'rock': Guitar,
  'indie': Radio,
  'chill': Headphones,
  'party': PartyPopper,
  'romance': Heart,
  'workout': Dumbbell,
  'sleep': Moon,
  '2000s': Clock,
  '90s': Clock,
};

interface CategoryCardProps {
  id: string;
  label: string;
  gradient: readonly [string, string, ...string[]];
  onPress: () => void;
}

export const CategoryCard = React.memo(({
  id,
  label,
  gradient,
  onPress,
}: CategoryCardProps) => {
  const scale = useSharedValue(1);
  const IconComponent = CATEGORY_ICONS[id] || Music;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 40, stiffness: 600 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 40, stiffness: 600 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.card, animatedStyle]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Grain Texture Overflow */}
      <Image
        source={require('@/assets/images/grain.jpg')}
        style={styles.grain}
        contentFit="cover"
      />

      {/* Decorative top highlight */}
      <View style={styles.topHighlight} />

      {/* Icon container */}
      <View style={styles.iconContainer}>
        <View style={styles.iconBackground}>
          <IconComponent size={26} color="#fff" strokeWidth={2.4} />
        </View>
      </View>

      {/* Label */}
      <Text style={styles.label}>{label}</Text>
    </AnimatedPressable>
  );
});

CategoryCard.displayName = 'CategoryCard';

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 6,
    padding: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1c1c1c',
  },
  grain: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
    mixBlendMode: 'overlay',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  iconContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  iconBackground: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '8deg' }],
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    maxWidth: '70%',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});