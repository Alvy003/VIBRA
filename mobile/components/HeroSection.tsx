// components/HeroSection.tsx
import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  Dimensions,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Heart, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { AnimatedCard } from './AnimatedCard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.45;
const CROSSFADE_DURATION = 600;
const AUTO_ROTATE_MS = 8000;

interface SongItem {
  _id: string;
  title: string;
  artist: string;
  imageUrl: string;
}

interface HeroSectionProps {
  heroSongs: SongItem[];
  onPlay: (song: SongItem) => void;
  heroParallaxStyle: any;
}

export const HeroSection: React.FC<HeroSectionProps> = React.memo(({
  heroSongs,
  onPlay,
  heroParallaxStyle,
}) => {
  const [heroIndex, setHeroIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const currentImageOpacity = useSharedValue(1);
  const nextImageOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(1);
  const activeIndexSV = useSharedValue(0);

  const [layerA, setLayerA] = useState<SongItem | null>(heroSongs[0] || null);
  const [layerB, setLayerB] = useState<SongItem | null>(heroSongs[1] || null);
  const isLayerAActive = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performTransition = useCallback((newIndex: number) => {
    const newSong = heroSongs[newIndex];
    if (!newSong) return;

    activeIndexSV.value = newIndex;

    if (isLayerAActive.current) {
      setLayerB(newSong);
    } else {
      setLayerA(newSong);
    }

    textOpacity.value = withTiming(0, { duration: 150 });

    if (isLayerAActive.current) {
      currentImageOpacity.value = withTiming(0, { duration: CROSSFADE_DURATION });
      nextImageOpacity.value = withTiming(1, { duration: CROSSFADE_DURATION });
    } else {
      nextImageOpacity.value = withTiming(0, { duration: CROSSFADE_DURATION });
      currentImageOpacity.value = withTiming(1, { duration: CROSSFADE_DURATION });
    }

    setTimeout(() => {
      textOpacity.value = withTiming(1, { duration: 300 });
    }, CROSSFADE_DURATION * 0.4);

    isLayerAActive.current = !isLayerAActive.current;
  }, [heroSongs]);

  useEffect(() => {
    if (heroSongs.length <= 1) return;
    timerRef.current = setTimeout(() => {
      setHeroIndex((prev) => (prev + 1) % heroSongs.length);
    }, AUTO_ROTATE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [heroIndex, heroSongs.length]);

  useEffect(() => {
    if (heroSongs.length > 0) performTransition(heroIndex);
  }, [heroIndex]);

  const handleTouchStart = (e: GestureResponderEvent) => {
    setTouchStart(e.nativeEvent.pageX);
  };

  const handleTouchEnd = (e: GestureResponderEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.nativeEvent.pageX;

    if (Math.abs(diff) > 50) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (diff > 0) {
        setHeroIndex((prev) => (prev + 1) % heroSongs.length);
      } else {
        setHeroIndex((prev) => (prev - 1 + heroSongs.length) % heroSongs.length);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTouchStart(null);
  };

  const layerAStyle = useAnimatedStyle(() => ({
    opacity: currentImageOpacity.value,
  }));

  const layerBStyle = useAnimatedStyle(() => ({
    opacity: nextImageOpacity.value,
  }));

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const currentSong = heroSongs[heroIndex];
  if (!currentSong) return null;

  return (
    <View
      style={styles.heroContainer}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Animated.View style={[styles.heroImageWrapper, heroParallaxStyle]}>
        <Animated.View style={[styles.heroImageLayer, layerAStyle]}>
          {layerA && (
            <Image
              source={{ uri: layerA.imageUrl, width: 600, height: 600 }}
              style={styles.heroImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          )}
        </Animated.View>
        <Animated.View style={[styles.heroImageLayer, layerBStyle]}>
          {layerB && (
            <Image
              source={{ uri: layerB.imageUrl, width: 600, height: 600 }}
              style={styles.heroImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          )}
        </Animated.View>
      </Animated.View>

      <LinearGradient
        colors={[
          'rgba(9,9,11,0.1)',
          'rgba(9,9,11,0.4)',
          'rgba(9,9,11,0.8)',
          '#09090b',
        ]}
        locations={[0, 0.4, 0.75, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View style={styles.heroContent}>
        <Animated.View style={textAnimStyle}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Sparkles size={11} color="#c084fc" fill="#c084fc" />
              <Text style={styles.badgeText}>FEATURED</Text>
            </View>
          </View>

          <Text numberOfLines={2} style={styles.heroTitle}>
            {currentSong.title}
          </Text>
          <Text numberOfLines={1} style={styles.heroArtist}>
            {currentSong.artist}
          </Text>

          <View style={styles.controlsRow}>
            <AnimatedCard
              onPress={() => onPlay(currentSong)}
              enableHaptic
              hapticStyle="medium"
              scaleDown={0.95}
            >
              <View style={styles.playButton}>
                <Play size={16} color="#000" fill="#000" />
                <Text style={styles.playButtonText}>Play Now</Text>
              </View>
            </AnimatedCard>

            <AnimatedCard
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              scaleDown={0.92}
            >
              <View style={styles.heartButton}>
                <Heart size={18} color="#fff" />
              </View>
            </AnimatedCard>

            <View style={{ flex: 1 }} />

            {heroSongs.length > 1 && (
              <View style={styles.dotContainer}>
                {heroSongs.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        width: i === heroIndex ? 20 : 6,
                        backgroundColor: i === heroIndex
                          ? '#fff'
                          : 'rgba(255,255,255,0.3)',
                      },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  heroContainer: {
    height: HERO_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImageWrapper: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  heroImageLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeText: {
    color: '#c084fc',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 32,
    marginBottom: 3,
  },
  heroArtist: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 18,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#fff',
    paddingHorizontal: 22,
    height: 44,
    borderRadius: 22,
  },
  playButtonText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 14,
  },
  heartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});