// components/ai-playlist/VibeSelector.tsx

import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - CARD_GAP) / 2;

const VIBES = [
  {
    id: 'chill',
    label: 'Chill',
    emoji: '😌',
    gradient: ['#06b6d4', '#0891b2'] as const,
    description: 'Relaxed & calm',
  },
  {
    id: 'party',
    label: 'Party',
    emoji: '🎉',
    gradient: ['#f43f5e', '#dc2626'] as const,
    description: 'High energy',
  },
  {
    id: 'focus',
    label: 'Focus',
    emoji: '🎯',
    gradient: ['#8b5cf6', '#7c3aed'] as const,
    description: 'Concentration',
  },
  {
    id: 'workout',
    label: 'Workout',
    emoji: '💪',
    gradient: ['#22c55e', '#16a34a'] as const,
    description: 'Pump it up',
  },
  {
    id: 'romantic',
    label: 'Romantic',
    emoji: '💕',
    gradient: ['#ec4899', '#db2777'] as const,
    description: 'Love songs',
  },
  {
    id: 'sad',
    label: 'Sad',
    emoji: '💔',
    gradient: ['#6366f1', '#4f46e5'] as const,
    description: 'Emotional',
  },
] as const;

type Vibe = typeof VIBES[number];

interface VibeSelectorProps {
  selected?: string;
  onSelect: (vibe: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const VibeCard = React.memo(({
  vibe,
  index,
  isSelected,
  onSelect,
}: {
  vibe: Vibe;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect();
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.card, animatedStyle]}
      >
        <LinearGradient
          colors={isSelected ? vibe.gradient : (['#18181b', '#18181b'] as const)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.cardGradient,
            isSelected && styles.cardGradientSelected,
          ]}
        >
          <Text style={styles.emoji}>{vibe.emoji}</Text>
          <Text style={[styles.label, isSelected && styles.labelSelected]}>
            {vibe.label}
          </Text>
          <Text style={[styles.description, isSelected && styles.descriptionSelected]}>
            {vibe.description}
          </Text>
          
          {isSelected && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              style={styles.checkmark}
            >
              <Text style={styles.checkmarkText}>✓</Text>
            </Animated.View>
          )}
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
});

export const VibeSelector = React.memo(({ selected, onSelect }: VibeSelectorProps) => {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(300)}>
        <Text style={styles.title}>What's your vibe?</Text>
        <Text style={styles.subtitle}>Choose the mood for your playlist</Text>
      </Animated.View>

      <View style={styles.grid}>
        {VIBES.map((vibe, index) => (
          <VibeCard
            key={vibe.id}
            vibe={vibe}
            index={index}
            isSelected={selected === vibe.id}
            onSelect={() => onSelect(vibe.id)}
          />
        ))}
      </View>
    </View>
  );
});

VibeSelector.displayName = 'VibeSelector';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  subtitle: {
    color: '#71717a',
    fontSize: 16,
    marginBottom: 32,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
  },
  cardGradient: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  cardGradientSelected: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  label: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelSelected: {
    color: '#fff',
  },
  description: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: '500',
  },
  descriptionSelected: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  checkmark: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});