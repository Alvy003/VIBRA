// components/ai-playlist/GeneratingView.tsx

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Wand2, Music2, Sparkles } from 'lucide-react-native';

interface GeneratingViewProps {
  params: {
    vibe?: string;
    language?: string;
    era?: string;
    size?: number;
  };
  progressMessage?: string;
}

const FloatingIcon = ({ 
  Icon, 
  delay, 
  color,
  position,
}: { 
  Icon: any; 
  delay: number; 
  color: string;
  position: { top?: number; bottom?: number; left?: number; right?: number };
}) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 2000 + delay, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000 + delay, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500 + delay, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1500 + delay, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.floatingIcon, position, animatedStyle]}>
      <Icon size={24} color={color} strokeWidth={2} />
    </Animated.View>
  );
};

export const GeneratingView = React.memo(({ params, progressMessage }: GeneratingViewProps) => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Safe label formatting with fallbacks
  const vibeLabel = params.vibe 
    ? params.vibe.charAt(0).toUpperCase() + params.vibe.slice(1) 
    : '';
  const languageLabel = params.language 
    ? params.language.charAt(0).toUpperCase() + params.language.slice(1) 
    : '';

  return (
    <View style={styles.container}>
      {/* Background floating icons */}
      <FloatingIcon 
        Icon={Music2} 
        delay={0} 
        color="#9333ea" 
        position={{ top: 100, left: 40 }}
      />
      <FloatingIcon 
        Icon={Sparkles} 
        delay={500} 
        color="#ec4899" 
        position={{ top: 150, right: 50 }}
      />
      <FloatingIcon 
        Icon={Music2} 
        delay={1000} 
        color="#3b82f6" 
        position={{ bottom: 200, left: 60 }}
      />

      <View style={styles.content}>
        {/* Main animation */}
        <Animated.View style={[styles.iconWrapper, scaleStyle]}>
          <LinearGradient
            colors={['rgba(147, 51, 234, 0.3)', 'rgba(236, 72, 153, 0.3)'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconOuter}
          >
            <Animated.View style={[styles.iconRing, rotateStyle]} />
            <LinearGradient
              colors={['#9333ea', '#ec4899'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconInner}
            >
              <Wand2 size={36} color="#fff" strokeWidth={2.5} />
            </LinearGradient>
          </LinearGradient>
        </Animated.View>

        {/* Status text */}
        <Animated.View 
          key={progressMessage}
          entering={FadeIn.duration(400)}
          style={styles.textContainer}
        >
          <Text style={styles.title}>Creating your playlist</Text>
          <Text style={styles.message}>{progressMessage || 'Just a moment...'}</Text>
        </Animated.View>

        {/* Params summary */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.summary}>
          {vibeLabel ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{vibeLabel}</Text>
            </View>
          ) : null}
          {languageLabel ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{languageLabel}</Text>
            </View>
          ) : null}
          {params.size ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{params.size} songs</Text>
            </View>
          ) : null}
        </Animated.View>

        {/* AI Badge */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.aiBadge}>
          <Sparkles size={14} color="#fbbf24" strokeWidth={2.5} />
          <Text style={styles.aiBadgeText}>Powered by AI</Text>
        </Animated.View>
      </View>
    </View>
  );
});

GeneratingView.displayName = 'GeneratingView';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    position: 'relative',
  },
  floatingIcon: {
    position: 'absolute',
  },
  content: {
    alignItems: 'center',
    gap: 28,
  },
  iconWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOuter: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 60,
    position: 'relative',
  },
  iconRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#9333ea',
    borderStyle: 'dashed',
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  textContainer: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    color: '#a1a1aa',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  summary: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#27272a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tagText: {
    color: '#d4d4d8',
    fontSize: 13,
    fontWeight: '600',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  aiBadgeText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});