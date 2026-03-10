import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import {
  ChevronDown,
  MoreVertical,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  CirclePlus,
  Share2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DeviceSelector from './DeviceSelector';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLyricsStore } from '@/stores/useLyricsStore';
import { useColorStore } from '@/stores/useColorStore';
import { usePlayerUIStore } from '@/stores/usePlayerUIStore';
import { useArtistStore } from '@/stores/useArtistStore';

import TrackProgressObserver from './TrackProgressObserver';
import TimeDisplay from './TimeDisplay';
import LyricsPreviewCard from './player/LyricsPreviewCard';
import ArtistModal from './player/ArtistModal';
import LyricsModal from './player/LyricsModal';
import ProgressBar from './ProgressBar';
import ControlButton from './ControlButton';
import Svg, { Path } from 'react-native-svg';
import TrackPlayer, { Event, useTrackPlayerEvents } from 'react-native-track-player';

const DEFAULT_GRADIENT = ['#1a1a2e', '#16213e', '#0f3460', '#121212'];

// Mini player height for transition calculation
const MINI_PLAYER_HEIGHT = 57;
const TAB_BAR_HEIGHT = 56;

function darkenColor(hex: string, factor: number = 0.5): string {
  if (!hex) return '#000000';
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  const newR = Math.floor(r * (1 - factor));
  const newG = Math.floor(g * (1 - factor));
  const newB = Math.floor(b * (1 - factor));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

const QueueIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size * 0.9} viewBox="0 0 51 46">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M48.095 41.0054C48.095 40.8239 47.9421 40.6878 47.7513 40.6878C43.7911 40.6878 6.28846 40.6878 2.32826 40.6878C2.14695 40.6878 1.99426 40.8239 1.99426 41.0054C1.99426 41.9491 1.99426 44.7077 1.99426 45.6604C1.99426 45.8328 2.14695 45.978 2.32826 45.978C6.28846 45.978 43.7911 45.978 47.7513 45.978C47.9421 45.978 48.095 45.8328 48.095 45.6604V41.0054ZM48.095 26.6141C48.095 26.4417 47.9421 26.2965 47.7513 26.2965C43.7911 26.2965 6.28846 26.2965 2.32826 26.2965C2.14695 26.2965 1.99426 26.4417 1.99426 26.6141C1.99426 27.5669 1.99426 30.3254 1.99426 31.2691C1.99426 31.4415 2.14695 31.5867 2.32826 31.5867C6.28846 31.5867 43.7911 31.5867 47.7513 31.5867C47.9421 31.5867 48.095 31.4415 48.095 31.2691V26.6141ZM0 8.31192C0 3.72048 3.91249 0 8.73152 0H41.3957C46.2148 0 50.175 3.72048 50.175 8.31192C50.175 12.8943 46.2148 16.6146 41.3957 16.6146H8.73152C3.91249 16.6146 0 12.8943 0 8.31192ZM5.56307 8.31192C5.56307 6.6423 6.98522 5.29925 8.73152 5.29925H41.3957C43.142 5.29925 44.5642 6.6423 44.5642 8.31192C44.5642 9.97246 43.142 11.3244 41.3957 11.3244H8.73152C6.98522 11.3244 5.56307 9.97246 5.56307 8.31192Z"
      fill={color}
    />
  </Svg>
);

const ArtistCard = React.memo(
  ({
    artist,
    artwork,
    onSeeMore,
  }: {
    artist: string;
    artwork: string;
    onSeeMore: () => void;
  }) => {
    const { artistCache, fetchArtistInfo, isLoading } = useArtistStore();

    useEffect(() => {
      if (artist) {
        fetchArtistInfo(artist);
      }
    }, [artist, fetchArtistInfo]);

    const artistInfo = artistCache[artist];
    const loading = isLoading(artist);

    if (!artistInfo && !loading) return null;
    const imageToUse = artistInfo?.imageUrl || artwork;

    const formatListeners = (count?: number) => {
      if (!count) return null;
      if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M monthly listeners`;
      }
      if (count >= 1000) {
        return `${(count / 1000).toFixed(0)}K monthly listeners`;
      }
      return `${count} monthly listeners`;
    };

    return (
      <View style={styles.artistCardWrapper}>
        {imageToUse && (
          <View style={styles.artistImageContainer}>
            <Image source={imageToUse} style={styles.artistImage} contentFit="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              locations={[0.5, 1]}
              style={styles.artistImageGradient}
            />
            <Text style={styles.artistImageLabel}>About the artist</Text>
          </View>
        )}

        <View style={styles.artistInfoSection}>
          <Text style={styles.artistInfoName}>
            {artistInfo?.name || artist.split(',')[0].trim()}
          </Text>

          {loading ? (
            <Text style={styles.artistInfoSubtext}>Loading artist info...</Text>
          ) : (
            <>
              {artistInfo?.listeners && (
                <Text style={styles.artistInfoListeners}>
                  {formatListeners(artistInfo.listeners)}
                </Text>
              )}

              {artistInfo?.bio && (
                <Text style={styles.artistInfoBio} numberOfLines={3}>
                  {artistInfo.bio}
                </Text>
              )}

              <TouchableOpacity
                style={styles.seeMoreButton}
                onPress={onSeeMore}
                activeOpacity={0.7}
              >
                <Text style={styles.seeMoreText}>See complete info</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }
);
ArtistCard.displayName = 'ArtistCard';

interface FullScreenPlayerProps {
  onClose: () => void;
  onQueueOpen?: () => void;
  initialColors?: {
    dominant: string;
    gradient: readonly [string, string, string, string];
  };
}

export default function FullScreenPlayer({
  onClose,
  onQueueOpen,
  initialColors,
}: FullScreenPlayerProps) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  const ARTWORK_SIZE = useMemo(() => {
    if (SCREEN_HEIGHT < 620) return SCREEN_WIDTH * 0.62;
    if (SCREEN_HEIGHT < 700) return SCREEN_WIDTH * 0.72;
    return SCREEN_WIDTH * 0.87;
  }, [SCREEN_WIDTH, SCREEN_HEIGHT]);

  const artworkTopSpacing = SCREEN_HEIGHT < 650 ? SCREEN_HEIGHT * 0.035 : SCREEN_HEIGHT * 0.05;
  const artworkBottomSpacing = SCREEN_HEIGHT * 0.06;

  const insets = useSafeAreaInsets();
  const gradientAnimationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [trackDuration, setTrackDuration] = useState(0);

  const {
    currentTrack,
    isPlaying,
    togglePlay,
    playNext,
    playPrevious,
    shuffleMode,
    repeatMode,
    toggleShuffle,
    toggleRepeat,
  } = usePlayerStore();

  const { extractColors, getTrackColors } = useColorStore();
  const fetchLyrics = useLyricsStore((s) => s.fetchLyrics);
  const { artistCache, fetchArtistInfo, isLoading: isArtistLoading } = useArtistStore();
  const { getLyrics } = useLyricsStore();

  // Self-contained translateY for entrance/exit/gesture
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const isClosing = useRef(false);

  const scrollY = useSharedValue(0);
  const gradientOpacity = useSharedValue(initialColors ? 1 : 0);
  const isAtTopWhenPanStarted = useSharedValue(true);
  const activeLineIndex = useSharedValue(-1);

  const stickyHeaderOpacity = useSharedValue(0);
  const stickyHeaderTranslateY = useSharedValue(-60);
  const mainScrollRef = useRef<Animated.ScrollView>(null);

  const [showDelayedContent, setShowDelayedContent] = useState(false);
  const delayedContentOpacity = useSharedValue(0);
  const delayedContentTranslateY = useSharedValue(50);

  // ─── Entrance Animation ───
  useEffect(() => {
    // Slide up from bottom
    translateY.value = withSpring(0, {
      damping: 32,
      stiffness: 300,
      mass: 0.9,
      overshootClamping: true,
    });
  }, []);

  // ─── Close Animation Handler ───
  const animateClose = useCallback(() => {
    if (isClosing.current) return;
    isClosing.current = true;

    translateY.value = withTiming(
      SCREEN_HEIGHT,
      {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(onClose)();
        }
      }
    );
  }, [onClose, translateY]);

  // Early return if no track
  if (!currentTrack) return null;

  const trackColors = getTrackColors(currentTrack.id);
  const gradientColors = useMemo(() => {
    if (trackColors.gradient && !trackColors.isLoading) {
      return trackColors.gradient;
    }
    if (initialColors?.gradient) {
      return initialColors.gradient;
    }
    return DEFAULT_GRADIENT as unknown as readonly [string, string, string, string];
  }, [trackColors.gradient, trackColors.isLoading, initialColors?.gradient]);

  // ─── Extract Colors and Fetch Lyrics on Track Change ───
  useEffect(() => {
    if (!currentTrack?.id) return;

    if (currentTrack.artist) {
      if (!artistCache[currentTrack.artist]) {
        fetchArtistInfo(currentTrack.artist);
      }
    }

    if (currentTrack.title && currentTrack.artist) {
      fetchLyrics(currentTrack.id, currentTrack.title, currentTrack.artist, currentTrack.duration);
    }

    if (currentTrack.artwork) {
      const timer = setTimeout(() => {
        extractColors(currentTrack.id, currentTrack.artwork as string);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentTrack?.id]);

  // ─── Animate Gradient on Color Change ───
  const hasAnimatedInitial = useRef(false);

  useEffect(() => {
    if (trackColors.gradient) {
      if (gradientAnimationRef.current) clearTimeout(gradientAnimationRef.current);

      if (!hasAnimatedInitial.current) {
        hasAnimatedInitial.current = true;
        if (initialColors?.gradient) {
          gradientOpacity.value = withTiming(1, { duration: 400 });
        } else {
          gradientOpacity.value = 0;
          gradientAnimationRef.current = setTimeout(() => {
            gradientOpacity.value = withTiming(1, { duration: 600 });
          }, 100);
        }
      } else {
        gradientOpacity.value = 0.6;
        gradientAnimationRef.current = setTimeout(() => {
          gradientOpacity.value = withTiming(1, { duration: 500 });
        }, 50);
      }
    }
    return () => {
      if (gradientAnimationRef.current) clearTimeout(gradientAnimationRef.current);
    };
  }, [trackColors.dominant]);

  // ─── Delayed Content Animation ───
  const currentLyricsState = currentTrack ? getLyrics(currentTrack.id) : null;
  const currentArtistLoading = currentTrack?.artist
    ? isArtistLoading(currentTrack.artist)
    : false;

  const syncedLines = useMemo(() => {
    if (currentLyricsState?.status === 'synced' && 'lines' in currentLyricsState) {
      return currentLyricsState.lines;
    }
    return [];
  }, [currentLyricsState]);

  useEffect(() => {
    setShowDelayedContent(false);
    delayedContentOpacity.value = 0;
    delayedContentTranslateY.value = 50;
  }, [currentTrack?.id]);

  useEffect(() => {
    if (showDelayedContent) return;

    const isLyricsDoneLoading =
      currentLyricsState?.status &&
      currentLyricsState.status !== 'idle' &&
      currentLyricsState.status !== 'loading';
    const isArtistDoneLoading = !currentArtistLoading;

    if (isLyricsDoneLoading && isArtistDoneLoading) {
      const timer = setTimeout(() => {
        setShowDelayedContent(true);
        delayedContentOpacity.value = withTiming(1, { duration: 600 });
        delayedContentTranslateY.value = withSpring(0, {
          damping: 24,
          stiffness: 140,
          mass: 0.8,
        });
      }, 150);
      return () => clearTimeout(timer);
    } else {
      const fallbackTimer = setTimeout(() => {
        setShowDelayedContent(true);
        delayedContentOpacity.value = withTiming(1, { duration: 600 });
        delayedContentTranslateY.value = withSpring(0, {
          damping: 24,
          stiffness: 140,
          mass: 0.8,
        });
      }, 2000);
      return () => clearTimeout(fallbackTimer);
    }
  }, [currentLyricsState?.status, currentArtistLoading, showDelayedContent, currentTrack?.id]);

  const { setActiveIndex } = usePlayerUIStore();

  // ─── Hardware Back Button ───
  useEffect(() => {
    const onBackPress = () => {
      animateClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [animateClose]);

  // ─── Callbacks ───
  const handleIndexChange = useCallback((newIndex: number) => {
    setActiveIndex(newIndex);
    activeLineIndex.value = newIndex;
  }, []);

  const handleDurationChange = useCallback(
    (dur: number) => {
      if (dur > 0 && dur !== trackDuration) {
        setTrackDuration(dur);
      }
    },
    [trackDuration]
  );

  // ─── Scroll Handler ───
  const scrollHandler = useCallback((event: any) => {
    'worklet';
    scrollY.value = event.nativeEvent.contentOffset.y;

    const headerOpacity = interpolate(
      scrollY.value,
      [ARTWORK_SIZE * 0.7, ARTWORK_SIZE],
      [0, 1],
      Extrapolate.CLAMP
    );
    stickyHeaderOpacity.value = headerOpacity;

    const headerTransY = interpolate(
      scrollY.value,
      [ARTWORK_SIZE * 0.7, ARTWORK_SIZE],
      [-60, 0],
      Extrapolate.CLAMP
    );
    stickyHeaderTranslateY.value = headerTransY;
  }, [ARTWORK_SIZE]);

  const scrollToTop = useCallback(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ y: 0, animated: true });
    }
  }, []);

  // ─── Dismiss Gesture ───
  const dismissGesture = Gesture.Pan()
    .activeOffsetY(10)
    .onBegin(() => {
      isAtTopWhenPanStarted.value = scrollY.value <= 10;
    })
    .onChange((event) => {
      if (isAtTopWhenPanStarted.value && event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (!isAtTopWhenPanStarted.value) {
        translateY.value = withSpring(0, { damping: 25, stiffness: 250 });
        return;
      }

      const shouldClose =
        translateY.value > SCREEN_HEIGHT * 0.2 ||
        (translateY.value > 50 && event.velocityY > 500);

      if (shouldClose) {
        runOnJS(animateClose)();
      } else {
        translateY.value = withSpring(0, { damping: 25, stiffness: 250 });
      }
    })
    .simultaneousWithExternalGesture(mainScrollRef as any);

  // ─── Reset scroll and sticky header on track change ───
  const prevTrackIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentTrack?.id) return;

    // Skip on first mount
    if (prevTrackIdRef.current === null) {
      prevTrackIdRef.current = currentTrack.id;
      return;
    }

    // Only reset if track actually changed
    if (prevTrackIdRef.current === currentTrack.id) return;
    prevTrackIdRef.current = currentTrack.id;

    // Reset sticky header immediately
    stickyHeaderOpacity.value = 0;
    stickyHeaderTranslateY.value = -60;
    scrollY.value = 0;

    // Scroll to top
    setTimeout(() => {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ y: 0, animated: false });
      }
    }, 50);
  }, [currentTrack?.id]);

  // ─── Animated Styles ───
  const artworkTranslateX = useSharedValue(0);

  const artworkGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
    .onUpdate((event) => {
      artworkTranslateX.value = event.translationX * 0.5;
    })
    .onEnd((event) => {
      const SWIPE_THRESHOLD = 80;
      if (Math.abs(event.translationX) > Math.abs(event.translationY)) {
        if (event.translationX < -SWIPE_THRESHOLD) {
          runOnJS(playNext)();
        } else if (event.translationX > SWIPE_THRESHOLD) {
          runOnJS(playPrevious)();
        }
      }
      artworkTranslateX.value = withSpring(0, {
        damping: 25,
        stiffness: 250,
      });
    });

  const artworkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: artworkTranslateX.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const gradientStyle = useAnimatedStyle(() => ({
    opacity: gradientOpacity.value,
  }));

  const delayedContentStyle = useAnimatedStyle(() => ({
    opacity: delayedContentOpacity.value,
    transform: [{ translateY: delayedContentTranslateY.value }],
  }));

  const stickyHeaderStyle = useAnimatedStyle(() => ({
    opacity: stickyHeaderOpacity.value,
    transform: [{ translateY: stickyHeaderTranslateY.value }],
  }));

  const handleSeek = useCallback(async (value: number) => {
    const TrackPlayerObj = require('react-native-track-player').default;
    await TrackPlayerObj.seekTo(value);
  }, []);

  const RepeatIcon = repeatMode === 'track' ? Repeat1 : Repeat;

  return (
    <GestureDetector gesture={dismissGesture}>
      <Animated.View style={[styles.container, containerStyle]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Animated Gradient Background */}
        <Animated.View style={[StyleSheet.absoluteFill, gradientStyle]}>
          <LinearGradient
            colors={gradientColors}
            locations={[0, 0.25, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Sticky Header */}
        <Animated.View
          style={[
            styles.stickyHeader,
            {
              paddingTop: insets.top + 8,
              backgroundColor: trackColors.dominant
                ? darkenColor(trackColors.dominant, 0.4)
                : initialColors?.dominant
                  ? darkenColor(initialColors.dominant, 0.4)
                  : '#000',
            },
            stickyHeaderStyle,
          ]}
        >
          <TouchableOpacity
            style={styles.stickyHeaderCenter}
            onPress={scrollToTop}
            activeOpacity={0.7}
          >
            <Text style={styles.stickyHeaderTitle} numberOfLines={1}>
              {currentTrack?.title}
            </Text>
            <Text style={styles.stickyHeaderArtist} numberOfLines={1}>
              {currentTrack?.artist}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlay} style={styles.stickyPlayButton} activeOpacity={0.8}>
            {isPlaying ? (
              <Pause size={22} color="#fff" fill="#fff" />
            ) : (
              <Play size={22} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Main Scrollable Content */}
        <Animated.ScrollView
          ref={mainScrollRef}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + SCREEN_HEIGHT * 0.12 }]}
        >
          <View style={[styles.topHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              onPress={animateClose}
              style={styles.headerButton}
              activeOpacity={0.7}
            >
              <ChevronDown size={28} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.playingFromLabel}>PLAYING FROM</Text>
              <Text style={styles.playingFromText} numberOfLines={1}>
                {(currentTrack as any).album || 'Your Library'}
              </Text>
            </View>

            <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
              <MoreVertical size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={[styles.artworkContainer, { marginTop: artworkTopSpacing, marginBottom: artworkBottomSpacing }]}>
            <GestureDetector gesture={artworkGesture}>
              <Animated.View style={[styles.artworkAnimatedWrapper, artworkAnimatedStyle, { width: ARTWORK_SIZE, height: ARTWORK_SIZE }]}>
                <Image
                  source={currentTrack?.artwork}
                  style={styles.artwork}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  priority="high"
                  recyclingKey={currentTrack?.id}
                />
              </Animated.View>
            </GestureDetector>
          </View>

          <View style={styles.trackInfo}>
            <View style={styles.trackTextContainer}>
              <Text style={styles.trackTitle} numberOfLines={1} adjustsFontSizeToFit>
                {currentTrack?.title}
              </Text>
              <Text style={styles.trackArtist} numberOfLines={1}>
                {currentTrack?.artist}
              </Text>
            </View>
            <TouchableOpacity style={styles.likeButton} activeOpacity={0.7}>
              <CirclePlus size={30} color="rgba(218, 214, 214, 1)" />
            </TouchableOpacity>
          </View>

          <ProgressBar onSeek={handleSeek} />
          <TimeDisplay />

          <View style={styles.mainControls}>
            <ControlButton onPress={toggleShuffle} size="medium">
              <Shuffle
                size={20}
                color={shuffleMode ? '#8B5CF6' : 'rgba(218, 214, 214, 1)'}
                strokeWidth={shuffleMode ? 2.5 : 2}
              />
            </ControlButton>

            <ControlButton onPress={playPrevious} size="large">
              <SkipBack size={25} color="#fff" fill="#fff" />
            </ControlButton>

            <ControlButton onPress={togglePlay} size="xl" variant="solid">
              {isPlaying ? (
                <Pause size={25} color="#000" fill="#000" />
              ) : (
                <Play size={25} color="#000" fill="#000" style={{ marginLeft: 3 }} />
              )}
            </ControlButton>

            <ControlButton onPress={playNext} size="large">
              <SkipForward size={25} color="#fff" fill="#fff" />
            </ControlButton>

            <ControlButton onPress={toggleRepeat} size="medium">
              <RepeatIcon
                size={22}
                color={repeatMode !== 'off' ? '#8B5CF6' : 'rgba(218, 214, 214, 1)'}
                strokeWidth={repeatMode !== 'off' ? 2.5 : 2}
              />
            </ControlButton>
          </View>

          <View style={styles.subActions}>
            <DeviceSelector compact />

            <View style={styles.subActionsRight}>
              <TouchableOpacity style={styles.subActionButton} activeOpacity={0.7}>
                <Share2 size={18} color="rgba(218, 214, 214, 1)" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.subActionButton}
                activeOpacity={0.7}
                onPress={onQueueOpen}
              >
                <QueueIcon size={18} color="rgba(218, 214, 214, 1)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Delayed Content */}
          <View style={{ height: SCREEN_HEIGHT * 0.05 }} />
          {showDelayedContent && (
            <Animated.View style={delayedContentStyle}>
              <LyricsPreviewCard />

              <ArtistCard
                artist={currentTrack.artist || 'Unknown'}
                artwork={currentTrack.artwork as string}
                onSeeMore={() => {
                  const { setArtistModalVisible } = usePlayerUIStore.getState();
                  setArtistModalVisible(true);
                }}
              />
            </Animated.View>
          )}
        </Animated.ScrollView>

        <TrackProgressObserver
          syncedLines={syncedLines as any}
          onIndexChange={handleIndexChange}
          onDurationChange={handleDurationChange}
        />
        <LyricsModal />
        <ArtistModal />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 200,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  playingFromLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  playingFromText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {},
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    zIndex: 100,
  },
  stickyHeaderCenter: {
    flex: 1,
    alignItems: 'flex-start',
    marginHorizontal: 8,
    paddingVertical: 4,
  },
  stickyHeaderTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  stickyHeaderArtist: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  stickyPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subActionButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeMoreButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  seeMoreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  artistCardWrapper: {
    marginHorizontal: 16,
    marginTop: 15,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  artistImageContainer: {
    width: '100%',
    height: 250,
    position: 'relative',
  },
  artistImage: {
    width: '100%',
    height: '100%',
  },
  artistImageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  artistImageLabel: {
    position: 'absolute',
    top: 16,
    left: 16,
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  artistInfoSection: {
    padding: 16,
    backgroundColor: 'rgba(22, 22, 22, 0.8)',
  },
  artistInfoName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  artistInfoListeners: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  artistInfoBio: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  artistInfoSubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '500',
  },
  artworkContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  artworkAnimatedWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  artwork: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 2,
  },
  trackTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 0,
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  likeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 25,
  },
  subActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginTop: 3,
    marginBottom: 0,
  },
});