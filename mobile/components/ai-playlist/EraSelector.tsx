// components/ai-playlist/EraSelector.tsx

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Sparkles, Clock, Shuffle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const ERAS = [
  { 
    id: 'latest', 
    label: 'Latest Hits', 
    description: '2020s fresh releases',
    icon: Sparkles,
    gradient: ['#22c55e', '#16a34a'],
    iconColor: '#4ade80',
  },
  { 
    id: 'classic', 
    label: 'Classics', 
    description: '90s & 2000s golden era',
    icon: Clock,
    gradient: ['#f59e0b', '#d97706'],
    iconColor: '#fbbf24',
  },
  { 
    id: 'mix', 
    label: 'Mix of Both', 
    description: 'Best of all time',
    icon: Shuffle,
    gradient: ['#a855f7', '#9333ea'],
    iconColor: '#c084fc',
  },
];

interface EraSelectorProps {
  selected?: string;
  onSelect: (era: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EraCard = React.memo(({
  era,
  index,
  isSelected,
  onSelect,
}: {
  era: typeof ERAS[0];
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const scale = useSharedValue(1);
  const Icon = era.icon;

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
            colors={(isSelected ? era.gradient : ['#18181b', '#18181b']) as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.iconContainer}>
              <Icon size={26} color="#fff" strokeWidth={2.5} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.label, styles.labelSelected]}>{era.label}</Text>
              <Text style={[styles.description, styles.descriptionSelected]}>
                {era.description}
              </Text>
            </View>
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.card, styles.cardUnselected]}>
            <View style={[styles.iconContainer, styles.iconContainerUnselected]}>
              <Icon size={26} color={era.iconColor} strokeWidth={2} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.label}>{era.label}</Text>
              <Text style={styles.description}>{era.description}</Text>
            </View>
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
});

export const EraSelector = React.memo(({ selected, onSelect }: EraSelectorProps) => {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(300)}>
        <Text style={styles.title}>Choose an era</Text>
        <Text style={styles.subtitle}>When should the songs be from?</Text>
      </Animated.View>

      <View style={styles.list}>
        {ERAS.map((era, index) => (
          <EraCard
            key={era.id}
            era={era}
            index={index}
            isSelected={selected === era.id}
            onSelect={() => onSelect(era.id)}
          />
        ))}
      </View>
    </View>
  );
});

EraSelector.displayName = 'EraSelector';

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
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 14,
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
    fontWeight: '700',
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
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
});