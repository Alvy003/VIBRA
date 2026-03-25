// components/search/CategoryCard.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
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

// Decorative pattern component
const CardPattern = React.memo(({ color }: { color: string }) => (
  <Svg width="100" height="100" style={styles.pattern}>
    <Defs>
      <LinearGradient id="fadeGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#fff" stopOpacity="0.15" />
        <Stop offset="1" stopColor="#fff" stopOpacity="0" />
      </LinearGradient>
    </Defs>
    {/* Abstract circles */}
    {/* <Circle cx="70" cy="30" r="35" fill="url(#fadeGrad)" />
    <Circle cx="85" cy="65" r="25" fill="#fff" fillOpacity="0.08" />
    <Circle cx="50" cy="80" r="15" fill="#fff" fillOpacity="0.05" /> */}
  </Svg>
));

CardPattern.displayName = 'CardPattern';

interface CategoryCardProps {
  id: string;
  label: string;
  color: string;
  onPress: () => void;
}

export const CategoryCard = React.memo(({
  id,
  label,
  color,
  onPress,
}: CategoryCardProps) => {
  const scale = useSharedValue(1);
  const IconComponent = CATEGORY_ICONS[id] || Music;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 40, stiffness: 600 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 40, stiffness: 600 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.card, { backgroundColor: color }, animatedStyle]}
    >
      {/* Background pattern */}
      <View style={styles.patternContainer}>
        <CardPattern color={color} />
      </View>

      {/* Icon container */}
      <View style={styles.iconContainer}>
        <View style={styles.iconBackground}>
          <IconComponent size={26} color="#fff" strokeWidth={2} />
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
    borderRadius: 8,
    padding: 14,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  patternContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 100,
    height: 100,
  },
  pattern: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  iconContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  iconBackground: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '8deg' }],
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    maxWidth: '70%',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});