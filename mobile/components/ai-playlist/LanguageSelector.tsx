// components/ai-playlist/LanguageSelector.tsx

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

const LANGUAGES = [
  { 
    id: 'hindi', 
    label: 'Hindi', 
    native: 'हिंदी', 
    flag: '🇮🇳',
    gradient: ['#fb923c', '#f97316'] as const,
  },
  { 
    id: 'english', 
    label: 'English', 
    native: 'English', 
    flag: '🌍',
    gradient: ['#3b82f6', '#2563eb'] as const,
  },
  { 
    id: 'punjabi', 
    label: 'Punjabi', 
    native: 'ਪੰਜਾਬੀ', 
    flag: '🇮🇳',
    gradient: ['#eab308', '#ca8a04'] as const,
  },
  { 
    id: 'tamil', 
    label: 'Tamil', 
    native: 'தமிழ்', 
    flag: '🇮🇳',
    gradient: ['#ec4899', '#db2777'] as const,
  },
  { 
    id: 'telugu', 
    label: 'Telugu', 
    native: 'తెలుగు', 
    flag: '🇮🇳',
    gradient: ['#8b5cf6', '#7c3aed'] as const,
  },
  { 
    id: 'multi', 
    label: 'Mix', 
    native: 'Multi-language', 
    flag: '🎵',
    gradient: ['#14b8a6', '#0d9488'] as const,
  },
] as const;

type Language = typeof LANGUAGES[number];

interface LanguageSelectorProps {
  selected?: string;
  onSelect: (language: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const LanguageCard = React.memo(({
  language,
  index,
  isSelected,
  onSelect,
}: {
  language: Language;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect();
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(350)}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.card, animatedStyle]}
      >
        {isSelected ? (
          <LinearGradient
            colors={language.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardInner}
          >
            <Text style={styles.flag}>{language.flag}</Text>
            <View style={styles.textContainer}>
              <Text style={[styles.label, styles.labelSelected]}>{language.label}</Text>
              <Text style={[styles.native, styles.nativeSelected]}>{language.native}</Text>
            </View>
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.cardInner, styles.cardInnerUnselected]}>
            <Text style={styles.flag}>{language.flag}</Text>
            <View style={styles.textContainer}>
              <Text style={styles.label}>{language.label}</Text>
              <Text style={styles.native}>{language.native}</Text>
            </View>
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
});

export const LanguageSelector = React.memo(({ selected, onSelect }: LanguageSelectorProps) => {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(300)}>
        <Text style={styles.title}>Pick a language</Text>
        <Text style={styles.subtitle}>Select your preferred music language</Text>
      </Animated.View>

      <View style={styles.grid}>
        {LANGUAGES.map((language, index) => (
          <LanguageCard
            key={language.id}
            language={language}
            index={index}
            isSelected={selected === language.id}
            onSelect={() => onSelect(language.id)}
          />
        ))}
      </View>
    </View>
  );
});

LanguageSelector.displayName = 'LanguageSelector';

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
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardInnerUnselected: {
    backgroundColor: '#18181b',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  flag: {
    fontSize: 28,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  labelSelected: {
    color: '#fff',
  },
  native: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  nativeSelected: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  checkmark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});