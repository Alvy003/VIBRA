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
import { Sparkles, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AIPlaylistCardProps {
  index?: number;
}

export const AIPlaylistCard = React.memo(({ index = 0 }: AIPlaylistCardProps) => {
  const router = useRouter();
  const shimmerValue = useSharedValue(-1);

  useEffect(() => {
    shimmerValue.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerValue.value * (SCREEN_WIDTH * 2) }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to the Chat Tab
    router.push('/(tabs)/chat');
  };

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 100).duration(600)}
      style={styles.container}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.95}
        style={styles.touchable}
      >
        <View style={styles.card}>
          <LinearGradient
            colors={['#18181b', '#09090b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
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

          <View style={styles.content}>
            <View style={styles.textContent}>
              <View style={styles.header}>
                <View style={styles.aiBadge}>
                  <Sparkles size={10} color="#fff" fill="#fff" />
                  <Text style={styles.aiBadgeText}>Pro</Text>
                </View>
                <Text style={styles.label}>SMART CURATION</Text>
              </View>
              
              <Text style={styles.title}>AI Music Assistant</Text>
              <Text style={styles.subtitle}>
                A personalized mix curated for your moments, powered by advanced artificial intelligence.
              </Text>
            </View>

            <View style={styles.actionContainer}>
              <View style={styles.actionCircle}>
                <ArrowRight size={20} color="#000" strokeWidth={2.5} />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

AIPlaylistCard.displayName = 'AIPlaylistCard';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  touchable: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  card: {
    padding: 24,
    minHeight: 140,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
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
  },
  textContent: {
    flex: 1,
    paddingRight: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#3f3f46',
    gap: 4,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  label: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});