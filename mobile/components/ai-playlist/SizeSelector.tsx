// components/ai-playlist/SizeSelector.tsx

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Zap, Music, ListMusic } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const SIZES = [
  { 
    id: 15, 
    label: 'Quick Mix', 
    description: '15 songs • ~45 min',
    icon: Zap,
    gradient: ['#06b6d4', '#0891b2'],
    iconColor: '#22d3ee',
  },
  { 
    id: 30, 
    label: 'Standard', 
    description: '30 songs • ~1.5 hours',
    icon: Music,
    gradient: ['#8b5cf6', '#7c3aed'],
    iconColor: '#a78bfa',
    recommended: true,
  },
  { 
    id: 50, 
    label: 'Extended', 
    description: '50 songs • ~2.5 hours',
    icon: ListMusic,
    gradient: ['#f59e0b', '#d97706'],
    iconColor: '#fbbf24',
  },
];

interface SizeSelectorProps {
  selected?: number;
  onSelect: (size: number) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SizeCard = React.memo(({
  size,
  index,
  isSelected,
  onSelect,
}: {
  size: typeof SIZES[0];
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const scale = useSharedValue(1);
  const Icon = size.icon;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect();
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={animatedStyle}
      >
        {isSelected ? (
          <LinearGradient
            colors={(isSelected ? size.gradient : ['#18181b', '#18181b']) as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {size.recommended && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>Popular</Text>
              </View>
            )}
            <View style={styles.iconContainer}>
              <Icon size={24} color="#fff" strokeWidth={2.5} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.label, styles.labelSelected]}>{size.label}</Text>
              <Text style={[styles.description, styles.descriptionSelected]}>
                {size.description}
              </Text>
            </View>
            <View style={styles.sizeNumber}>
              <Text style={[styles.sizeText, styles.sizeTextSelected]}>{size.id}</Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.card, styles.cardUnselected]}>
            {size.recommended && (
              <View style={[styles.recommendedBadge, styles.recommendedBadgeUnselected]}>
                <Text style={styles.recommendedTextUnselected}>Popular</Text>
              </View>
            )}
            <View style={[styles.iconContainer, styles.iconContainerUnselected]}>
              <Icon size={24} color={size.iconColor} strokeWidth={2} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.label}>{size.label}</Text>
              <Text style={styles.description}>{size.description}</Text>
            </View>
            <View style={[styles.sizeNumber, styles.sizeNumberUnselected]}>
              <Text style={styles.sizeText}>{size.id}</Text>
            </View>
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
});

export const SizeSelector = React.memo(({ selected, onSelect }: SizeSelectorProps) => {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(300)}>
        <Text style={styles.title}>Playlist size</Text>
        <Text style={styles.subtitle}>How many songs do you want?</Text>
      </Animated.View>

      <View style={styles.list}>
        {SIZES.map((size, index) => (
          <SizeCard
            key={size.id}
            size={size}
            index={index}
            isSelected={selected === size.id}
            onSelect={() => onSelect(size.id)}
          />
        ))}
      </View>

      <Animated.View 
        entering={FadeInDown.delay(300).duration(300)}
        style={styles.hintContainer}
      >
        <Text style={styles.hint}>
          ✨ Tap any option to start generating your playlist
        </Text>
      </Animated.View>
    </View>
  );
});

SizeSelector.displayName = 'SizeSelector';

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
  list: {
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    gap: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cardUnselected: {
    backgroundColor: '#18181b',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedBadgeUnselected: {
    backgroundColor: '#27272a',
  },
  recommendedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  recommendedTextUnselected: {
    color: '#a1a1aa',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconContainerUnselected: {
    backgroundColor: '#27272a',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 3,
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
    color: 'rgba(255, 255, 255, 0.85)',
  },
  sizeNumber: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeNumberUnselected: {
    backgroundColor: '#27272a',
  },
  sizeText: {
    color: '#71717a',
    fontSize: 16,
    fontWeight: '800',
  },
  sizeTextSelected: {
    color: '#fff',
  },
  hintContainer: {
    marginTop: 32,
    alignItems: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.2)',
  },
  hint: {
    color: '#a78bfa',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
});