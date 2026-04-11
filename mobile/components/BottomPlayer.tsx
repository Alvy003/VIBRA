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
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useColorStore } from '@/stores/useColorStore';
import { useProgress, State } from 'react-native-track-player';
import { Play, Pause, Music } from 'lucide-react-native';
import { resolveAssetUrl } from '@/lib/url';
import MarqueeText from './MarqueeText';
import { SharpPlay, SharpPause, SharpDevice } from './SharpIcons';
import DeviceSelector, { DeviceSelectorRef } from './DeviceSelector';
import { SaveToPlaylistButton } from './SaveToPlaylistButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const clean = (hex || '#1a1a2e').replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16) || 26,
    g: parseInt(clean.substring(2, 4), 16) || 26,
    b: parseInt(clean.substring(4, 6), 16) || 46,
  };
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

  // Initialize to current progress immediately (not 0)
  const smoothProgress = useSharedValue(0);
  const hasReceivedFirstReal = useSharedValue(0); // 0 = false, 1 = true (worklet-safe)
  const prevValue = useSharedValue(-1);

  useAnimatedReaction(
    () => progressPct.value,
    (current) => {
      // Skip zero values until we get a real position from the bridge
      if (current === 0 && hasReceivedFirstReal.value === 0) {
        return;
      }

      // First real value: snap immediately (no animation)
      if (hasReceivedFirstReal.value === 0) {
        hasReceivedFirstReal.value = 1;
        smoothProgress.value = current;
        prevValue.value = current;
        return;
      }

      // Seek or new track (jumped backwards significantly): snap
      if (current < prevValue.value - 5) {
        smoothProgress.value = current;
        prevValue.value = current;
        return;
      }

      // Normal playback: smooth transition
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
  const { currentTrack } = usePlayerStore();
  const { extractColors, getTrackColors } = useColorStore();
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);

  // Extract current track colors eagerly
  useEffect(() => {
    if (!currentTrack) return;
    const id = currentTrack.id ?? currentTrack.url ?? '';
    if (id && currentTrack.artwork) {
      extractColors(id, currentTrack.artwork as string);
    }
  }, [currentTrack?.id, currentTrack?.url, currentTrack?.artwork]);

  // Preload adjacent tracks (next + previous) so colors are ready before swipe
  useEffect(() => {
    if (!queue || queue.length === 0) return;

    const indices = [
      currentIndex - 1,
      currentIndex + 1,
      currentIndex + 2, // prefetch one further ahead
    ];

    for (const idx of indices) {
      if (idx < 0 || idx >= queue.length) continue;
      const track = queue[idx];
      if (!track) continue;
      const id = track.id ?? track.url ?? '';
      if (id && track.artwork) {
        // Fire-and-forget; the store deduplicates
        extractColors(id, track.artwork as string);
      }
    }
  }, [currentIndex, queue?.length]);

  // Return resolved colors for the current track
  const id = currentTrack?.id ?? currentTrack?.url ?? '';
  return getTrackColors(id);
}

// ─── Main component ─────────────────────────────────────────────────────────

interface BottomPlayerProps {
  onExpand: (colors?: { dominant: string; gradient: readonly [string, string, string, string] }) => void;
}

export const BottomPlayer = React.memo(({ onExpand }: BottomPlayerProps) => {
  const { currentTrack, isPlaying, playbackState, togglePlay, playNext, playPrevious } =
    usePlayerStore();

  // Use displayTrack to avoid metadata flash during swipe
  const [displayTrack, setDisplayTrack] = React.useState(currentTrack);
  const { getTrackColors } = useColorStore();
  const trackColors = usePreloadColors();

  // Shared values for progress bridge
  const progressSV = useSharedValue(0);
  const durationSV = useSharedValue(0);

  const deviceSelectorRef = useRef<DeviceSelectorRef>(null);

  // Sync displayTrack with currentTrack
  useEffect(() => {
    if (currentTrack) {
      if (!displayTrack || currentTrack.id !== displayTrack.id) {
        setDisplayTrack(currentTrack);
      }
    }
  }, [currentTrack?.id]);

  // ── Background color - initialize from current colors immediately ───────────
  const getInitialColor = useCallback(() => {
    const id = currentTrack?.id ?? currentTrack?.url ?? '';
    if (id) {
      const colors = getTrackColors(id);
      if (colors.dominant && !colors.isLoading) {
        return hexToRgb(colors.dominant);
      }
    }
    return { r: 26, g: 26, b: 46 };
  }, []);

  const initialColor = useRef(getInitialColor());
  const bgR = useSharedValue(initialColor.current.r);
  const bgG = useSharedValue(initialColor.current.g);
  const bgB = useSharedValue(initialColor.current.b);

  // Also update the ref when track changes but component doesn't remount
  const prevDominantRef = useRef<string>(trackColors.dominant || '#1a1a2e');

  // Animate background when dominant color changes
  useEffect(() => {
    const dominant = trackColors.dominant;
    if (!dominant || trackColors.isLoading) return;

    // Check if we're already at this color (prevents flash on remount)
    const { r, g, b } = hexToRgb(dominant);
    const currentR = Math.round(bgR.value);
    const currentG = Math.round(bgG.value);
    const currentB = Math.round(bgB.value);

    if (currentR === r && currentG === g && currentB === b) return;
    if (dominant === prevDominantRef.current) return;

    prevDominantRef.current = dominant;

    bgR.value = withTiming(r, { duration: COLOR_TRANSITION_DURATION });
    bgG.value = withTiming(g, { duration: COLOR_TRANSITION_DURATION });
    bgB.value = withTiming(b, { duration: COLOR_TRANSITION_DURATION });
  }, [trackColors.dominant, trackColors.isLoading]);

  const backgroundStyle = useAnimatedStyle(() => {
    // Darken for readability (multiply by ~0.45)
    const r = Math.max(0, Math.round(bgR.value * 0.45));
    const g = Math.max(0, Math.round(bgG.value * 0.45));
    const b = Math.max(0, Math.round(bgB.value * 0.45));
    return {
      backgroundColor: `rgba(${r},${g},${b}, 1)`,
    };
  });

  // ── Gesture shared values ─────────────────────────────────────────────────
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const swipeContentOpacity = useSharedValue(1);

  // Track-change slide/fade for artwork + text only
  const artworkSlide = useSharedValue(0);
  const textFade = useSharedValue(1);

  // Button scales
  const playButtonScale = useSharedValue(1);
  const nextButtonScale = useSharedValue(1);


  // ── Artwork + text entrance animation ONLY on actual track change ───────
  const prevTrackKeyRef = useRef<string | null>(null);
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (!currentTrack) return;
    const key = currentTrack.id ?? currentTrack.url ?? '';

    // Skip animation on first mount (returning from fullscreen)
    if (isFirstMount.current) {
      isFirstMount.current = false;
      prevTrackKeyRef.current = key;
      // Ensure values are at rest position
      artworkSlide.value = 0;
      textFade.value = 1;
      return;
    }

    // Handle entrance animation (especially after swipe)
    if (key !== prevTrackKeyRef.current) {
      prevTrackKeyRef.current = key;

      // If we were in a swipe exit state, animate from side
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

  // ── Callbacks (for runOnJS) ───────────────────────────────────────────────
  const onSwipeLeft = useCallback(() => {
    playNext();
  }, [playNext]);

  const onSwipeRight = useCallback(() => {
    playPrevious();
  }, [playPrevious]);

  const onSwipeUp = useCallback(() => {
    const id = currentTrack?.id ?? currentTrack?.url ?? '';
    const colors = getTrackColors(id);
    onExpand(colors);
  }, [onExpand, currentTrack?.id, currentTrack?.url, getTrackColors]);

  // ── Pan gesture - HORIZONTAL ONLY for track change ─────────────────────────
  const gestureDirection = useSharedValue<'none' | 'horizontal' | 'vertical'>('none');

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      gestureDirection.value = 'none';
    })
    .onUpdate((e) => {
      // Lock direction on first significant movement
      if (gestureDirection.value === 'none') {
        const absX = Math.abs(e.translationX);
        const absY = Math.abs(e.translationY);

        if (absX > absY + 8) {
          // Clearly horizontal
          gestureDirection.value = 'horizontal';
        } else if (e.translationY < -20 && absX < 25) {
          // Clearly swiping up
          gestureDirection.value = 'vertical';
        }
        return;
      }

      // Process based on locked direction
      if (gestureDirection.value === 'horizontal') {
        translateX.value = e.translationX;
        swipeContentOpacity.value = interpolate(
          Math.abs(e.translationX),
          [0, SCREEN_WIDTH * 0.35],
          [1, 0.2],
          Extrapolation.CLAMP
        );
      }
      // No visual feedback for vertical - just track for threshold
    })
    .onEnd((e) => {
      // Vertical: expand
      if (gestureDirection.value === 'vertical' && e.translationY < SWIPE_UP_THRESHOLD) {
        runOnJS(onSwipeUp)();
        gestureDirection.value = 'none';
        return;
      }

      // Horizontal: track change
      if (gestureDirection.value === 'horizontal') {
        if (e.translationX < -SWIPE_THRESHOLD) {
          // Exit left
          translateX.value = withTiming(-SCREEN_WIDTH * 0.7, { duration: 150 }, () => {
            runOnJS(onSwipeLeft)();
            // We wait for currentTrack to change in React to trigger the 'in' animation
          });
        } else if (e.translationX > SWIPE_THRESHOLD) {
          // Exit right
          translateX.value = withTiming(SCREEN_WIDTH * 0.7, { duration: 150 }, () => {
            runOnJS(onSwipeRight)();
            // We wait for currentTrack to change in React to trigger the 'in' animation
          });
        } else {
          translateX.value = withSpring(0, SPRING_CONFIG);
          swipeContentOpacity.value = withTiming(1, { duration: 150 });
        }
      }

      gestureDirection.value = 'none';
    });

  // ── Animated styles ───────────────────────────────────────────────────────

  // Only artwork + track info move with swipe; controls stay put
  const swipeableStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: swipeContentOpacity.value,
  }));

  // Artwork entrance
  const artworkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: artworkSlide.value }],
  }));

  // Text entrance
  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textFade.value,
    transform: [
      {
        translateX: interpolate(textFade.value, [0, 1], [12, 0]),
      },
    ],
  }));



  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePlayPress = useCallback(() => {
    playButtonScale.value = withTiming(0.78, { duration: 60 }, () => {
      playButtonScale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
    togglePlay();
  }, [togglePlay]);

  const handleNextPress = useCallback(() => {
    nextButtonScale.value = withTiming(0.78, { duration: 60 }, () => {
      nextButtonScale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
    playNext();
  }, [playNext]);

  const handleExpand = useCallback(() => {
    // Pass current dominant color so fullscreen doesn't flash black
    const id = currentTrack?.id ?? currentTrack?.url ?? '';
    const colors = getTrackColors(id);
    onExpand(colors);
  }, [onExpand, currentTrack?.id, currentTrack?.url, getTrackColors]);

  const handleDevicePress = useCallback(() => {
    deviceSelectorRef.current?.open();
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!currentTrack) return null;

  return (
    <>
      <ProgressBridgeMemo progressSV={progressSV} durationSV={durationSV} />

      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.container}
      >
        {/* Dominant color background */}
        <Animated.View
          style={[StyleSheet.absoluteFill, backgroundStyle, styles.bgLayer]}
        />

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.touchable]}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleExpand}
              style={styles.innerTouchable}
            >
              <View style={styles.content}>
                {/* ── Swipeable: artwork + track info ── */}
                <View style={styles.swipeableClip}>
                  <Animated.View style={[styles.swipeableRow, swipeableStyle]}>
                    {/* Artwork */}
                    <Animated.View
                      style={[styles.artworkContainer, artworkAnimStyle]}
                    >
                      {displayTrack?.artwork ? (
                        <Image
                          source={displayTrack.artwork}
                          style={styles.artwork}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={180}
                        />
                      ) : (
                        <View style={[styles.artwork, styles.placeholderContainer]}>
                          <Music size={20} color="rgba(255,255,255,0.4)" />
                        </View>
                      )}
                    </Animated.View>

                    {/* Track Info */}
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

                {/* ── Controls: stay fixed ── */}
                <View style={styles.controls}>
                  <TouchableOpacity
                    onPress={handleDevicePress}
                    style={styles.likeButton}
                    activeOpacity={0.7}
                  >
                    <SharpDevice size={24} color="#fff" />
                  </TouchableOpacity>

                  <SaveToPlaylistButton
                    track={currentTrack}
                    size={24}
                  />

                  <TouchableOpacity
                    onPress={handlePlayPress}
                    style={styles.playButton}
                    activeOpacity={1}
                  >
                    {isPlaying || playbackState === State.Buffering || playbackState === State.Loading ? (
                      <SharpPause size={26} color="#fff" />
                    ) : (
                      <SharpPlay
                        size={26}
                        color="#fff"
                        style={{ marginLeft: 2 }}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>

        {/* Progress bar */}
        <AnimatedProgressBarMemo
          progressSV={progressSV}
          durationSV={durationSV}
        />
      </Animated.View>

      <DeviceSelector ref={deviceSelectorRef} showPill={false} />
    </>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    height: 57,
    borderRadius: 5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 12,
  },
  bgLayer: {
    borderRadius: 5,
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
  // Only this row slides with the swipe gesture
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
    marginBottom: 2,
    lineHeight: 20,
  },
  artist: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  likeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,

  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 5,
    right: 5,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
});