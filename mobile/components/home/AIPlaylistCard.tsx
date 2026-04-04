// components/home/AIPlaylistCard.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
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
import { Sparkles, ArrowRight, Music2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AIPlaylistCardProps {
  index?: number;
}

export const AIPlaylistCard = React.memo(({ index = 0 }: AIPlaylistCardProps) => {
  const router = useRouter();
  const glowValue = useSharedValue(0);
  const shimmerValue = useSharedValue(-1);
 
  useEffect(() => {
    shimmerValue.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
    glowValue.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);
 
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerValue.value * (SCREEN_WIDTH * 2) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + glowValue.value * 0.4,
    transform: [{ scale: 0.9 + glowValue.value * 0.1 }],
  }));
 
  const handlePress = (query?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to the Chat Tab with optional query
    router.push({
      pathname: '/(tabs)/chat',
      params: query ? { query } : undefined
    });
  };

  const PROMPT_CHIPS = [
    { label: 'Surprise Me', query: 'Surprise me with a unique playlist' },
    { label: 'Moody Mix', query: 'Generate a moody, late-night mix' },
    { label: 'Fresh Hits', query: 'What are the freshest hits right now?' },
  ];

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 100).duration(600)}
      style={styles.container}
    >
      <TouchableOpacity
        onPress={() => handlePress()}
        activeOpacity={0.95}
        style={styles.touchable}
      >
        <View style={styles.card}>
          <LinearGradient
            colors={['#111114', '#050507']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Animated Glow Background */}
          <Animated.View style={[styles.glowLayer, glowStyle]}>
            <LinearGradient
              colors={['rgba(167, 139, 250, 0.2)', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.05)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          
          {/* Subtle "Peak Professional" Shimmer */}
          <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255, 255, 255, 0.03)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmer}
            />
          </Animated.View>

          {/* Subtle Background Logos */}
          <View style={styles.backgroundLogos}>
            <Image 
              source="https://cdn-icons-png.flaticon.com/512/174/174872.png" 
              style={[styles.bgLogo, { top: -15, right: -10, transform: [{ rotate: '-15deg' }] }]} 
              contentFit="contain"
            />
            <Image 
              source="https://cdn-icons-png.flaticon.com/512/1384/1384060.png" 
              style={[styles.bgLogo, { bottom: -20, right: 70, transform: [{ rotate: '25deg' }] }]} 
              contentFit="contain"
            />
          </View>

          <View style={styles.content}>
            <View style={styles.textContent}>
              <View style={styles.header}>
                <View style={styles.aiBadge}>
                  <Sparkles size={10} color="#fff" fill="#fff" />
                  <Text style={styles.aiBadgeText}>Vibra AI Pro</Text>
                </View>
                <Text style={styles.label}>SMART SYNC</Text>
              </View>
              
              <Text style={styles.title}>AI Music Assistant</Text>
              <Text style={styles.subtitle}>
                Build your vibe with AI. Import playlists from Spotify & YouTube.
              </Text>
            </View>

            <View style={styles.actionContainer}>
              <View style={styles.actionCircle}>
                <ArrowRight size={20} color="#000" strokeWidth={2.5} />
              </View>
            </View>
          </View>

          {/* Prompt Chips */}
          {/* <View style={styles.chipsContainer}> */}
            {/* {PROMPT_CHIPS.map((chip, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handlePress(chip.query)}
                style={styles.chip}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>{chip.label}</Text>
              </TouchableOpacity>
            ))} */}
          {/* </View> */}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

AIPlaylistCard.displayName = 'AIPlaylistCard';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  touchable: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#1f1f23',
  },
  card: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#09090b',
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -SCREEN_WIDTH,
    width: SCREEN_WIDTH * 2,
  },
  shimmer: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  textContent: {
    flex: 1,
    paddingRight: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(24, 24, 27, 0.8)',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  aiBadgeText: {
    color: '#ddd',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  label: {
    color: '#52525b',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  backgroundLogos: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  bgLogo: {
    position: 'absolute',
    width: 120,
    height: 120,
  },
  glowLayer: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    borderRadius: 100,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    zIndex: 3,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipText: {
    color: '#ddd',
    fontSize: 10,
    fontWeight: '600',
  },
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});