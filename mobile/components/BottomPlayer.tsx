// components/BottomPlayer.tsx
import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  Extrapolation,
  useDerivedValue,
  useAnimatedReaction,
  SharedValue,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useColorStore } from '@/stores/useColorStore';
import { useProgress, State } from 'react-native-track-player';
import { Music } from 'lucide-react-native';
import MarqueeText from './MarqueeText';
import { SharpPlay, SharpPause } from './SharpIcons';
import DeviceSelector, { DeviceSelectorRef, DeviceIcon } from './DeviceSelector';
import { useNativeAudioDevices } from '@/hooks/useNativeAudioDevices';
import { SaveToPlaylistButton } from './SaveToPlaylistButton';
import { resolveAssetUrl } from '@/lib/url';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DEFAULT_GRADIENT = [Colors.surface, Colors.surface, Colors.surface, Colors.background];
const ACCENT_COLOR = Colors.accent;
const SWIPE_THRESHOLD = 80;
const SWIPE_UP_THRESHOLD = -50;
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.8,
};
const COLOR_TRANSITION_DURATION = 450;

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = (hex || Colors.surface).replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16) || 26,
    g: parseInt(clean.substring(2, 4), 16) || 26,
    b: parseInt(clean.substring(4, 6), 16) || 46,
  };
}

/**
 * Spotify-style main color - lighter, less harsh
 */
function getSpotifyMainColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);

  // Use 40% brightness instead of 25% - much lighter
  const factor = 0.45;

  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}

/**
 * Top gradient - even lighter for subtle depth
 */
function getSpotifyLightColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);

  // 55% brightness for top
  const factor = 0.45;

  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}

/**
 * Get first artist name from comma-separated list
 * "Artist1, Artist2, Artist3" → "Artist1"
 */
function getFirstArtist(artist: string | undefined | null): string {
  if (!artist) return '';
  return artist.split(',')[0].trim();
}

// ─── Progress bridge: isolates useProgress re-renders ───────────────────────

function ProgressBridge({
  progressSV,
  durationSV,
}: {
  progressSV: SharedValue<number>;
  durationSV: SharedValue<number>;
}) {
  const { currentTrack } = usePlayerStore();
  const { position, duration } = useProgress(1000);

  useEffect(() => {
    // Reset immediately on track change to prevent "ghost" progress from previous song
    progressSV.value = 0;
    durationSV.value = 0;
  }, [currentTrack?.id]);

  useEffect(() => {
    progressSV.value = position;
    durationSV.value = duration;
  }, [position, duration]);

  return null;
}

const ProgressBridgeMemo = React.memo(ProgressBridge);

// ─── Smooth progress bar ────────────────────────────────────────────────────

function AnimatedProgressBar({
  progressSV,
  durationSV,
}: {
  progressSV: SharedValue<number>;
  durationSV: SharedValue<number>;
}) {
  const progressPct = useDerivedValue(() => {
    if (durationSV.value <= 0) return 0;
    return Math.min((progressSV.value / durationSV.value) * 100, 100);
  });

  const smoothProgress = useSharedValue(0);
  const hasReceivedFirstReal = useSharedValue(0);
  const prevValue = useSharedValue(-1);

  useAnimatedReaction(
    () => progressPct.value,
    (current) => {
      if (current === 0 && hasReceivedFirstReal.value === 0) {
        return;
      }

      if (hasReceivedFirstReal.value === 0) {
        hasReceivedFirstReal.value = 1;
        smoothProgress.value = current;
        prevValue.value = current;
        return;
      }

      if (current < prevValue.value - 5) {
        smoothProgress.value = current;
        prevValue.value = current;
        return;
      }

      prevValue.value = current;
      smoothProgress.value = withTiming(current, {
        duration: 1050,
        easing: Easing.linear,
      });
    },
    []
  );

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, smoothProgress.value)}%` as unknown as number,
  }));

  return (
    <View style={styles.progressContainer}>
      <Animated.View style={[styles.progressFill, barStyle]} />
    </View>
  );
}

const AnimatedProgressBarMemo = React.memo(AnimatedProgressBar);

// ─── Color preloader: extracts colors for current, next, and previous ───────

function usePreloadColors() {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const { extractColors, getTrackColors } = useColorStore();
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);

  useEffect(() => {
    if (!currentTrack) return;
    const id = currentTrack.id ?? currentTrack.url ?? '';
    if (id && currentTrack.artwork) {
      extractColors(id, currentTrack.artwork as string);
    }
  }, [currentTrack?.id, currentTrack?.url, currentTrack?.artwork]);

  useEffect(() => {
    if (!queue || queue.length === 0) return;

    const indices = [
      currentIndex - 1,
      currentIndex + 1,
      currentIndex + 2,
    ];

    for (const idx of indices) {
      if (idx < 0 || idx >= queue.length) continue;
      const track = queue[idx];
      if (!track) continue;
      const id = track.id ?? track.url ?? '';
      if (id && track.artwork) {
        extractColors(id, track.artwork as string);
      }
    }
  }, [currentIndex, queue?.length]);

  const id = currentTrack?.id ?? currentTrack?.url ?? '';
  return getTrackColors(id);
}

// ─── Main component ─────────────────────────────────────────────────────────

interface BottomPlayerProps {
  onExpand: (colors?: { dominant: string; gradient: readonly [string, string, string, string] }) => void;
}

export const BottomPlayer = React.memo(({ onExpand }: BottomPlayerProps) => {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const playbackState = usePlayerStore(s => s.playbackState);

  const togglePlay = usePlayerStore(s => s.togglePlay);
  const playNext = usePlayerStore(s => s.playNext);
  const playPrevious = usePlayerStore(s => s.playPrevious);

  const [displayTrack, setDisplayTrack] = React.useState(currentTrack);
  const { getTrackColors } = useColorStore();
  const trackColors = usePreloadColors();

  const progressSV = useSharedValue(0);
  const durationSV = useSharedValue(0);

  const deviceSelectorRef = useRef<DeviceSelectorRef>(null);
  const { currentDevice } = useNativeAudioDevices();

  // ✅ Store the background color for SaveToPlaylistButton
  const [backgroundColor, setBackgroundColor] = React.useState<string>(Colors.background);

  useEffect(() => {
    if (currentTrack) {
      if (!displayTrack || currentTrack.id !== displayTrack.id) {
        setDisplayTrack(currentTrack);
      }
    }
  }, [currentTrack?.id]);

  // ✅ Animate background color Spotify-style
  useEffect(() => {
    const dominant = trackColors.dominant;
    if (!dominant || trackColors.isLoading) return;

    // Update background color for SaveToPlaylistButton
    const mainColor = getSpotifyMainColor(dominant);
    setBackgroundColor(mainColor);
  }, [trackColors.dominant, trackColors.isLoading]);

  // Gesture shared values
  const translateX = useSharedValue(0);
  const swipeContentOpacity = useSharedValue(1);
  const artworkSlide = useSharedValue(0);
  const textFade = useSharedValue(1);
  const playButtonScale = useSharedValue(1);
  const nextButtonScale = useSharedValue(1);

  const prevTrackKeyRef = useRef<string | null>(null);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (!currentTrack) return;
    const key = currentTrack.id ?? currentTrack.url ?? '';

    if (isFirstMount.current) {
      isFirstMount.current = false;
      prevTrackKeyRef.current = key;
      artworkSlide.value = 0;
      textFade.value = 1;
      return;
    }

    if (key !== prevTrackKeyRef.current) {
      prevTrackKeyRef.current = key;

      if (Math.abs(translateX.value) > 20 || swipeContentOpacity.value < 0.5) {
        const fromRight = translateX.value < 0;
        translateX.value = fromRight ? SCREEN_WIDTH * 0.5 : -SCREEN_WIDTH * 0.5;
        swipeContentOpacity.value = 0;

        translateX.value = withSpring(0, SPRING_CONFIG);
        swipeContentOpacity.value = withTiming(1, { duration: 250 });
      }

      artworkSlide.value = 40;
      textFade.value = 0;
      artworkSlide.value = withSpring(0, SPRING_CONFIG);
      textFade.value = withTiming(1, { duration: 280 });
    }
  }, [currentTrack?.id, currentTrack?.url]);

  // Callbacks
  const onSwipeLeft = useCallback(() => playNext(), [playNext]);
  const onSwipeRight = useCallback(() => playPrevious(), [playPrevious]);
  const onSwipeUp = useCallback(() => {
    const id = currentTrack?.id ?? currentTrack?.url ?? '';
    const colors = getTrackColors(id);
    onExpand(colors);
  }, [onExpand, currentTrack?.id, currentTrack?.url, getTrackColors]);

  // Gesture
  const gestureDirection = useSharedValue<'none' | 'horizontal' | 'vertical'>('none');

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      gestureDirection.value = 'none';
    })
    .onUpdate((e) => {
      if (gestureDirection.value === 'none') {
        const absX = Math.abs(e.translationX);
        const absY = Math.abs(e.translationY);

        if (absX > absY + 8) {
          gestureDirection.value = 'horizontal';
        } else if (e.translationY < -20 && absX < 25) {
          gestureDirection.value = 'vertical';
        }
        return;
      }

      if (gestureDirection.value === 'horizontal') {
        translateX.value = e.translationX;
        swipeContentOpacity.value = interpolate(
          Math.abs(e.translationX),
          [0, SCREEN_WIDTH * 0.35],
          [1, 0.2],
          Extrapolation.CLAMP
        );
      }
    })
    .onEnd((e) => {
      if (gestureDirection.value === 'vertical' && e.translationY < SWIPE_UP_THRESHOLD) {
        runOnJS(onSwipeUp)();
        gestureDirection.value = 'none';
        return;
      }

      if (gestureDirection.value === 'horizontal') {
        if (e.translationX < -SWIPE_THRESHOLD) {
          translateX.value = withTiming(-SCREEN_WIDTH * 0.7, { duration: 150 }, () => {
            runOnJS(onSwipeLeft)();
          });
        } else if (e.translationX > SWIPE_THRESHOLD) {
          translateX.value = withTiming(SCREEN_WIDTH * 0.7, { duration: 150 }, () => {
            runOnJS(onSwipeRight)();
          });
        } else {
          translateX.value = withSpring(0, SPRING_CONFIG);
          swipeContentOpacity.value = withTiming(1, { duration: 150 });
        }
      }

      gestureDirection.value = 'none';
    });

  // Animated styles
  const swipeableStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: swipeContentOpacity.value,
  }));

  const artworkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: artworkSlide.value }],
  }));

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textFade.value,
    transform: [{ translateX: interpolate(textFade.value, [0, 1], [12, 0]) }],
  }));

  // Handlers
  const handlePlayPress = useCallback(() => {
    playButtonScale.value = withTiming(0.78, { duration: 60 }, () => {
      playButtonScale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
    togglePlay();
  }, [togglePlay]);

  const handleExpand = useCallback(() => {
    const id = currentTrack?.id ?? currentTrack?.url ?? '';
    const colors = getTrackColors(id);
    onExpand(colors);
  }, [onExpand, currentTrack?.id, currentTrack?.url, getTrackColors]);

  const handleDevicePress = useCallback(() => {
    deviceSelectorRef.current?.open();
  }, []);

  if (!currentTrack) return null;

  // ✅ Get Spotify-style colors
  const dominant = trackColors.dominant || Colors.surface;
  const mainColor = getSpotifyMainColor(dominant);
  const lightColor = getSpotifyLightColor(dominant);

  return (
    <>
      <ProgressBridgeMemo progressSV={progressSV} durationSV={durationSV} />

      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.container}
      >
        {/* ✅ Spotify-style subtle gradient background */}
        <LinearGradient
          colors={[lightColor, mainColor]}
          locations={[0, 1]}
          style={StyleSheet.absoluteFill}
        />

        <GestureDetector gesture={panGesture}>
          <Animated.View style={styles.touchable}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleExpand}
              style={styles.innerTouchable}
            >
              <View style={styles.content}>
                <View style={styles.swipeableClip}>
                  <Animated.View style={[styles.swipeableRow, swipeableStyle]}>
                    <Animated.View style={[styles.artworkContainer, artworkAnimStyle]}>
                      {displayTrack?.artwork ? (
                        <Image
                          source={typeof displayTrack.artwork === 'string' ? { uri: resolveAssetUrl(displayTrack.artwork), width: 86, height: 86 } : displayTrack.artwork}
                          style={styles.artwork}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={180}
                        />
                      ) : (
                        <View style={[styles.artwork, styles.placeholderContainer]}>
                          <Music size={20} color={Colors.whiteAlpha40} />
                        </View>
                      )}
                    </Animated.View>

                    <Animated.View style={[styles.trackInfo, textAnimStyle]}>
                      <MarqueeText
                        text={displayTrack?.title || ''}
                        style={styles.title}
                        delay={2000}
                      />
                      <Text style={styles.artist} numberOfLines={1}>
                        {getFirstArtist(displayTrack?.artist)}
                      </Text>
                    </Animated.View>
                  </Animated.View>
                </View>

                <View style={styles.controls}>
                  <TouchableOpacity
                    onPress={handleDevicePress}
                    style={styles.controlButton}
                    activeOpacity={0.7}
                  >
                    <DeviceIcon
                      type={currentDevice?.type || 'local'}
                      size={25}
                      color={currentDevice?.type === 'local' || !currentDevice ? Colors.textPrimary : Colors.accent}
                    />
                  </TouchableOpacity>

                  {/* ✅ Pass background color to SaveToPlaylistButton */}
                  <SaveToPlaylistButton
                    track={currentTrack}
                    size={24}
                    checkmarkColor={backgroundColor}
                  />

                  <TouchableOpacity
                    onPress={handlePlayPress}
                    style={styles.controlButton}
                    activeOpacity={1}
                  >
                    {isPlaying || playbackState === State.Buffering || playbackState === State.Loading ? (
                      <SharpPause size={24} color={Colors.textPrimary} />
                    ) : (
                      <SharpPlay size={24} color={Colors.textPrimary} style={{ marginLeft: 2 }} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>

        <AnimatedProgressBarMemo progressSV={progressSV} durationSV={durationSV} />
      </Animated.View>

      <DeviceSelector ref={deviceSelectorRef} showPill={false} />
    </>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    height: 57,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 12,
  },
  touchable: {
    flex: 1,
  },
  innerTouchable: {
    flex: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 7,
  },
  swipeableClip: {
    flex: 1,
    overflow: 'hidden',
  },
  swipeableRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  artworkContainer: {
    width: 43,
    height: 42,
    borderRadius: 5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  artwork: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  placeholderContainer: {
    backgroundColor: Colors.surfaceLighter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
    marginBottom: 2,
    lineHeight: 20,
  },
  artist: {
    color: Colors.whiteAlpha60,
    fontSize: 12,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 5,
    right: 5,
    height: 2,
    backgroundColor: Colors.whiteAlpha15,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.textPrimary,
  },
});