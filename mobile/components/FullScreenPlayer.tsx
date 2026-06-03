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
  Share,
} from 'react-native';
import { State } from 'react-native-track-player';
import { Image } from 'expo-image';
import {
  ChevronDown,
  MoreVertical,
  Share2,
} from 'lucide-react-native';
import { SaveToPlaylistButton } from './SaveToPlaylistButton';
import { SharpPlay, SharpPause, SharpSkipNext, SharpSkipBack, SharpShuffle, SharpRepeat, QueueIcon } from './SharpIcons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { GestureDetector, Gesture, ScrollView as RNGHScrollView } from 'react-native-gesture-handler';
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
import { resolveAssetUrl } from '@/lib/url';
import Colors from '@/constants/Colors';
import ArtistModal from './player/ArtistModal';
import LyricsModal from './player/LyricsModal';
import ProgressBar from './ProgressBar';
import ControlButton from './ControlButton';
import MarqueeText from './MarqueeText';
import TrackPlayer from 'react-native-track-player';
import QueueBottomSheet from './QueueBottomSheet';
import SongOptions from './SongOptions';


const AnimatedRNGHScrollView = Animated.createAnimatedComponent(RNGHScrollView);

const DEFAULT_GRADIENT = [Colors.surface, Colors.surface, Colors.surface, Colors.background];
const ACCENT_COLOR = Colors.accent;

function darkenColor(hex: string, factor: number = 0.5): string {
  if (!hex) return Colors.background;
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  const newR = Math.floor(r * (1 - factor));
  const newG = Math.floor(g * (1 - factor));
  const newB = Math.floor(b * (1 - factor));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

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
        {!!imageToUse && (
          <View style={styles.artistImageContainer}>
            <Image
              source={typeof imageToUse === 'string' ? { uri: resolveAssetUrl(imageToUse), width: 400, height: 400 } : imageToUse}
              style={styles.artistImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <LinearGradient
              colors={['transparent', 'rgba(9,9,11,0.8)']}
              locations={[0.5, 1]}
              style={styles.artistImageGradient}
            />
            <Text style={styles.artistImageLabel}>About the artist</Text>
          </View>
        )}

        <View style={styles.artistInfoSection}>
          <Text style={styles.artistInfoName}>
            {artistInfo?.name || (typeof artist === 'string' ? artist.split(',')[0].trim() : 'Artist')}
          </Text>

          {loading ? (
            <Text style={styles.artistInfoSubtext}>Loading artist info...</Text>
          ) : (
            <>
              {!!artistInfo?.listeners && (
                <Text style={styles.artistInfoListeners}>
                  {formatListeners(artistInfo.listeners)}
                </Text>
              )}

              {!!artistInfo?.bio && (
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');


const isTinyScreen = SCREEN_HEIGHT < 600;
const isSmallScreen = SCREEN_HEIGHT < 700;
const isMediumScreen = SCREEN_HEIGHT < 800;

const ARTWORK_SIZE = (() => {
  if (SCREEN_HEIGHT < 600) return Math.min(SCREEN_WIDTH * 0.5, 200);
  if (SCREEN_HEIGHT < 700) return SCREEN_WIDTH * 0.65;
  if (SCREEN_HEIGHT < 800) return SCREEN_WIDTH * 0.78;
  return SCREEN_WIDTH * 0.85;
})();

const artworkTopSpacing = isTinyScreen ? 10 : (isSmallScreen ? SCREEN_HEIGHT * 0.02 : (isMediumScreen ? SCREEN_HEIGHT * 0.04 : SCREEN_HEIGHT * 0.06));
const artworkBottomSpacing = isTinyScreen ? 15 : (isSmallScreen ? SCREEN_HEIGHT * 0.03 : (isMediumScreen ? SCREEN_HEIGHT * 0.04 : SCREEN_HEIGHT * 0.05));
const sectionSpacing = isTinyScreen ? 12 : (isSmallScreen ? 18 : 24);

export default function FullScreenPlayer({
  onClose,
  onQueueOpen,
  initialColors,
}: FullScreenPlayerProps) {
  // 1. Hooks (Above ALL early returns)
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  const [primaryContentHeight, setPrimaryContentHeight] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  const [showDelayedContent, setShowDelayedContent] = useState(false);
  const [queueVisible, setQueueVisible] = useState(false);
  const [visible, setVisible] = useState(false);

  const currentTrack = usePlayerStore(s => s.currentTrack);
  const queue = usePlayerStore(s => s.queue);
  const currentIndex = usePlayerStore(s => s.currentIndex);

  const isPlaying = usePlayerStore(s => s.isPlaying);
  const playbackState = usePlayerStore(s => s.playbackState);

  const shuffleMode = usePlayerStore(s => s.shuffleMode);
  const repeatMode = usePlayerStore(s => s.repeatMode);

  const currentContext = usePlayerStore(s => s.currentContext);

  const togglePlay = usePlayerStore(s => s.togglePlay);
  const playNext = usePlayerStore(s => s.playNext);
  const playPrevious = usePlayerStore(s => s.playPrevious);
  const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
  const toggleRepeat = usePlayerStore(s => s.toggleRepeat);

  const { extractColors, getTrackColors } = useColorStore();
  const fetchLyrics = useLyricsStore((s) => s.fetchLyrics);
  const { artistCache, fetchArtistInfo, isLoading: isArtistLoading } = useArtistStore();
  const { getLyrics } = useLyricsStore();
  const { setActiveIndex } = usePlayerUIStore();

  // Shared values
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const scrollY = useSharedValue(0);
  const gradientOpacity = useSharedValue(initialColors ? 1 : 0);
  const isAtTopWhenPanStarted = useSharedValue(true);
  const activeLineIndex = useSharedValue(-1);
  const stickyHeaderOpacity = useSharedValue(0);
  const stickyHeaderTranslateY = useSharedValue(-60);
  const delayedContentOpacity = useSharedValue(0);
  const delayedContentTranslateY = useSharedValue(50);
  const artworkTranslateX = useSharedValue(0);

  // Refs
  const isClosing = useRef(false);
  const gradientAnimationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainScrollRef = useRef<Animated.ScrollView>(null);
  const hasAnimatedInitial = useRef(false);
  const prevTrackIdRef = useRef<string | null>(null);

  // Computed
  const prevTrack = currentIndex > 0 ? queue[currentIndex - 1] : null;
  const nextTrack = currentIndex < queue.length - 1 ? queue[currentIndex + 1] : null;
  const trackColors = getTrackColors(currentTrack?.id || 'none');
  const currentLyricsState = currentTrack ? getLyrics(currentTrack.id) : null;
  const currentArtistLoading = currentTrack?.artist ? isArtistLoading(currentTrack.artist) : false;
  const syncedLines = useMemo(() => {
    if (currentLyricsState?.status === 'synced' && 'lines' in currentLyricsState) {
      return currentLyricsState.lines;
    }
    return [];
  }, [currentLyricsState]);

  const hasLyrics = useMemo(() => {
    return currentLyricsState?.status === 'synced' || currentLyricsState?.status === 'plain';
  }, [currentLyricsState]);

  const lastValidGradientRef = useRef<readonly [string, string, string, string] | null>(null);

  const gradientColors = useMemo(() => {
    // Priority 1: current track's confirmed gradient (not loading)
    if (trackColors.gradient && !trackColors.isLoading) {
      lastValidGradientRef.current = trackColors.gradient;
      return trackColors.gradient;
    }
    // Priority 2: current track's gradient even while loading (stale is better than default)
    // This prevents the DEFAULT_GRADIENT blue flash during color extraction
    if (trackColors.gradient) {
      lastValidGradientRef.current = trackColors.gradient;
      return trackColors.gradient;
    }
    // Priority 3: last valid gradient from the previous track (stale persistence)
    if (lastValidGradientRef.current) {
      return lastValidGradientRef.current;
    }
    // Priority 4: colors passed from BottomPlayer at open time
    if (initialColors?.gradient) {
      const [c0, c1, c2] = initialColors.gradient;
      const parsed = [c0, c1, c2, '#09090b'] as const;
      lastValidGradientRef.current = parsed;
      return parsed;
    }
    // Priority 5: last resort default (only on very first open with no data at all)
    return DEFAULT_GRADIENT as unknown as readonly [string, string, string, string];
  }, [trackColors.gradient, trackColors.isLoading, initialColors?.gradient]);

  // ─── Callbacks ───
  const animateClose = useCallback(() => {
    if (isClosing.current) return;
    isClosing.current = true;

    translateY.value = withTiming(
      SCREEN_HEIGHT + 30,
      {
        duration: 250,
        easing: Easing.out(Easing.exp),
      },
      (finished) => {
        if (finished) runOnJS(onClose)();
      }
    );
  }, [onClose]);

  const handleIndexChange = useCallback((newIndex: number) => {
    setActiveIndex(newIndex);
    activeLineIndex.value = newIndex;
  }, [setActiveIndex]);

  const handleDurationChange = useCallback((duration: number) => {
    setTrackDuration(duration);
  }, []);

  const handleSeek = useCallback(async (value: number) => {
    await TrackPlayer.seekTo(value);
  }, []);

  const scrollToTop = useCallback(() => {
    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const handleCloseModal = useCallback(() => {
    setVisible(false);
  }, []);

  const handleShare = async () => {
    handleCloseModal();
    try {
      const cleanId = currentTrack?.id.replace(/^(jiosaavn_track_|jiosaavn_album_|jiosaavn_playlist_)/, '');
      const message = `Check out "${currentTrack?.title}" by ${currentTrack?.artist} on Vibra!\n\nListen here: https://vibra-969f.onrender.com/track/${cleanId}`;
      await Share.share({
        message,
        title: currentTrack?.title,
      });
    } catch (error) {
      console.error('Error sharing song:', error);
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      const THRESHOLD = ARTWORK_SIZE + 160;
      stickyHeaderOpacity.value = scrollY.value > THRESHOLD ? 1 : 0;
      stickyHeaderTranslateY.value = scrollY.value > THRESHOLD ? 0 : -60;
    },
  });

  // ─── Effects ───
  useEffect(() => {
    translateY.value = withSpring(0, {
      damping: 32, stiffness: 300, mass: 0.9, overshootClamping: true,
    });
  }, []);

  useEffect(() => {
    if (!currentTrack?.id) return;
    if (currentTrack.artist && !artistCache[currentTrack.artist]) {
      fetchArtistInfo(currentTrack.artist);
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

  useEffect(() => {
    if (trackColors.gradient) {
      if (gradientAnimationRef.current) clearTimeout(gradientAnimationRef.current);
      if (!hasAnimatedInitial.current) {
        // First appearance: fade in from transparent
        hasAnimatedInitial.current = true;
        gradientOpacity.value = withTiming(1, { duration: initialColors?.gradient ? 400 : 600 });
      } else {
        // Subsequent track changes: keep opacity at 1, crossfade via color update only.
        // No opacity snap — gradient stays visible and smoothly transitions.
        gradientAnimationRef.current = setTimeout(() => {
          gradientOpacity.value = withTiming(1, { duration: 600 });
        }, 80);
      }
    }
    return () => { if (gradientAnimationRef.current) clearTimeout(gradientAnimationRef.current); };
  }, [trackColors.dominant]);

  useEffect(() => {
    setShowDelayedContent(false);
    delayedContentOpacity.value = 0;
    delayedContentTranslateY.value = 50;
  }, [currentTrack?.id]);

  useEffect(() => {
    if (showDelayedContent) return;
    const isDone = (currentLyricsState?.status && currentLyricsState.status !== 'idle' && currentLyricsState.status !== 'loading') && !currentArtistLoading;
    const timer = setTimeout(() => {
      setShowDelayedContent(true);
      delayedContentOpacity.value = withTiming(1, { duration: 600 });
      delayedContentTranslateY.value = withSpring(0, { damping: 24, stiffness: 140, mass: 0.8 });
    }, isDone ? 150 : 2000);
    return () => clearTimeout(timer);
  }, [currentLyricsState?.status, currentArtistLoading, showDelayedContent, currentTrack?.id]);

  useEffect(() => {
    const onBackPress = () => { animateClose(); return true; };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [animateClose]);

  useEffect(() => {
    if (!currentTrack?.id) return;
    if (prevTrackIdRef.current === currentTrack.id) return;
    const isFirst = prevTrackIdRef.current === null;
    prevTrackIdRef.current = currentTrack.id;
    if (isFirst) return;

    stickyHeaderOpacity.value = 0;
    stickyHeaderTranslateY.value = -60;
    scrollY.value = 0;
    artworkTranslateX.value = 0;
    setTimeout(() => { mainScrollRef.current?.scrollTo({ y: 0, animated: false }); }, 50);
  }, [currentTrack?.id]);

  // Gestures
  const dismissGesture = Gesture.Pan()
    .activeOffsetY(10).failOffsetY(-10)
    .onBegin(() => { isAtTopWhenPanStarted.value = scrollY.value <= 10; })
    .onChange((event) => { if (isAtTopWhenPanStarted.value && event.translationY > 0) translateY.value = event.translationY; })
    .onEnd((event) => {
      if (!isAtTopWhenPanStarted.value) { translateY.value = withTiming(0, { duration: 250 }); return; }
      if (translateY.value > SCREEN_HEIGHT * 0.2 || (translateY.value > 50 && event.velocityY > 500)) {
        runOnJS(animateClose)();
      } else { translateY.value = withTiming(0, { duration: 250 }); }
    }).simultaneousWithExternalGesture(mainScrollRef as any);

  const artworkGesture = Gesture.Pan()
    .activeOffsetX([-20, 20]).failOffsetY([-20, 20])
    .onUpdate((event) => { artworkTranslateX.value = event.translationX; })
    .onEnd((event) => {
      const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
      if (event.translationX < -SWIPE_THRESHOLD || event.velocityX < -500) {
        if (nextTrack) {
          artworkTranslateX.value = withTiming(-SCREEN_WIDTH, { duration: 250 }, (f) => { if (f) runOnJS(playNext)(); });
        } else artworkTranslateX.value = withSpring(0);
      } else if (event.translationX > SWIPE_THRESHOLD || event.velocityX > 500) {
        if (prevTrack) {
          artworkTranslateX.value = withTiming(SCREEN_WIDTH, { duration: 250 }, (f) => { if (f) runOnJS(playPrevious)(); });
        } else artworkTranslateX.value = withSpring(0);
      } else artworkTranslateX.value = withSpring(0);
    });

  // Styles
  const sideArtworkOpacity = useAnimatedStyle(() => ({ opacity: 1 }));
  const artworkAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: artworkTranslateX.value }] }));
  const containerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const gradientStyle = useAnimatedStyle(() => ({ opacity: gradientOpacity.value }));
  const delayedContentStyle = useAnimatedStyle(() => ({ opacity: delayedContentOpacity.value, transform: [{ translateY: delayedContentTranslateY.value }] }));
  const stickyHeaderStyle = useAnimatedStyle(() => ({ opacity: stickyHeaderOpacity.value, transform: [{ translateY: stickyHeaderTranslateY.value }] }));

  // 2. Early return (AFTER ALL HOOKS)
  if (!currentTrack) return null;

  return (
    <GestureDetector gesture={dismissGesture}>
      <Animated.View style={[styles.container, containerStyle]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

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
                  : Colors.background,
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

          <View style={styles.stickyHeaderActions}>
            <TouchableOpacity>
              <SaveToPlaylistButton
                track={currentTrack}
                size={22}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlay} style={styles.stickyPlayButton} activeOpacity={0.8}>
              {isPlaying || playbackState === State.Buffering || playbackState === State.Loading ? (
                <SharpPause size={22} color={Colors.textPrimary} />
              ) : (
                <SharpPlay size={22} color={Colors.textPrimary} style={{ marginLeft: 2 }} />
              )}
            </TouchableOpacity>
          </View>


        </Animated.View>

        {/* Main Scrollable Content */}
        <AnimatedRNGHScrollView
          ref={mainScrollRef as any}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        >
          {/* Animated Gradient Background (Scrolls with content) */}
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_HEIGHT }, gradientStyle]}>
            <LinearGradient
              colors={gradientColors}
              locations={[0, 0.35, 0.65, 1]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <View onLayout={(e) => setPrimaryContentHeight(e.nativeEvent.layout.height)}>
            <View style={[styles.topHeader, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity
                onPress={animateClose}
                style={styles.headerButton}
                activeOpacity={0.7}
              >
                <ChevronDown size={28} color={Colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                {currentContext?.title || (currentTrack as any).album ? (
                  <>
                    <Text style={styles.playingFromLabel}>
                      {currentContext?.type === 'album' ? 'PLAYING FROM ALBUM' :
                        currentContext?.type === 'playlist' ? 'PLAYING FROM PLAYLIST' :
                          currentContext?.type === 'artist' ? 'PLAYING FROM ARTIST' :
                            currentContext?.type === 'search' ? 'PLAYING FROM SEARCH' :
                              'PLAYING FROM'}
                    </Text>
                    <Text style={styles.playingFromText} numberOfLines={1}>
                      {currentContext?.title || (currentTrack as any).album}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.playingFromRecommended}>Recommended for you</Text>
                )}
              </View>


              <SongOptions
                song={currentTrack}
                trigger={
                  <View style={styles.headerButton}>
                    <MoreVertical size={24} color={Colors.textPrimary} />
                  </View>
                }
              />

            </View>

            <View style={[styles.artworkContainer, { marginTop: artworkTopSpacing, marginBottom: artworkBottomSpacing, overflow: 'hidden', width: SCREEN_WIDTH }]}>
              <GestureDetector gesture={artworkGesture}>
                <View style={{ width: SCREEN_WIDTH, height: ARTWORK_SIZE, alignItems: 'center', justifyContent: 'center' }}>
                  <Animated.View style={[styles.pagerContainer, artworkAnimatedStyle]}>
                    {/* Previous Piece */}
                    <View style={[styles.sideArtworkContainer, { width: SCREEN_WIDTH }]}>
                      {prevTrack && (
                        <Animated.View style={[{ width: ARTWORK_SIZE, height: ARTWORK_SIZE }, sideArtworkOpacity]}>
                          <Image
                            source={typeof prevTrack.artwork === 'string' ? { uri: resolveAssetUrl(prevTrack.artwork), width: 300, height: 300 } : prevTrack.artwork}
                            style={styles.artwork}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            recyclingKey={prevTrack.id}
                          />
                        </Animated.View>
                      )}
                    </View>

                    {/* Current Piece */}
                    <View style={[styles.centerArtworkContainer, { width: SCREEN_WIDTH }]}>
                      <Animated.View style={{
                        width: ARTWORK_SIZE,
                        height: ARTWORK_SIZE,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 12 },
                        shadowOpacity: 0.58,
                        shadowRadius: 16.00,
                        elevation: 24,
                      }}>
                        <Image
                          source={currentTrack?.artwork}
                          style={styles.artwork}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          priority="high"
                          recyclingKey={currentTrack?.id}
                        />
                      </Animated.View>
                    </View>

                    {/* Next Piece */}
                    <View style={[styles.sideArtworkContainer, { width: SCREEN_WIDTH }]}>
                      {nextTrack && (
                        <Animated.View style={[{ width: ARTWORK_SIZE, height: ARTWORK_SIZE }, sideArtworkOpacity]}>
                          <Image
                            source={typeof nextTrack.artwork === 'string' ? { uri: resolveAssetUrl(nextTrack.artwork), width: 300, height: 300 } : nextTrack.artwork}
                            style={styles.artwork}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            recyclingKey={nextTrack.id}
                          />
                        </Animated.View>
                      )}
                    </View>
                  </Animated.View>
                </View>
              </GestureDetector>
            </View>

            <View style={[styles.trackInfo, isTinyScreen && { marginBottom: 8 }]}>
              <View style={styles.trackTextContainer}>
                <MarqueeText
                  text={currentTrack?.title || ''}
                  style={styles.trackTitle}
                  delay={2000}
                />
                <MarqueeText
                  text={currentTrack?.artist || ''}
                  style={styles.trackArtist}
                  delay={3000}
                />
              </View>
              <SaveToPlaylistButton
                track={currentTrack}
                size={29}
              />
            </View>

            <ProgressBar onSeek={handleSeek} />
            <TimeDisplay />

            <View style={[styles.mainControls, isTinyScreen && { marginTop: 8, marginBottom: 16 }]}>
              <ControlButton onPress={toggleShuffle} size="medium">
                <View style={{ alignItems: 'center' }}>
                  <SharpShuffle
                    size={22}
                    color={shuffleMode ? ACCENT_COLOR : 'rgba(218, 214, 214, 1)'}
                  />
                  {shuffleMode && (
                    <View style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: ACCENT_COLOR,
                      marginTop: 2,
                      position: 'absolute',
                      bottom: -6
                    }} />
                  )}
                </View>
              </ControlButton>

              <ControlButton onPress={playPrevious} size="large">
                <SharpSkipBack size={23} color={Colors.textPrimary} />
              </ControlButton>

              <ControlButton onPress={togglePlay} size="xl" variant="solid">
                {isPlaying || playbackState === State.Buffering || playbackState === State.Loading ? (
                  <SharpPause size={30} color={Colors.background} />
                ) : (
                  <SharpPlay size={30} color={Colors.background} style={{ marginLeft: 3 }} />
                )}
              </ControlButton>



              <ControlButton onPress={playNext} size="large">
                <SharpSkipNext size={23} color={Colors.textPrimary} />
              </ControlButton>

              <ControlButton onPress={toggleRepeat} size="medium">
                <View style={{ alignItems: 'center' }}>
                  <SharpRepeat
                    size={24}
                    color={repeatMode !== 'off' ? ACCENT_COLOR : 'rgba(218, 214, 214, 1)'}
                  />
                  {repeatMode !== 'off' && (
                    <View style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: ACCENT_COLOR,
                      marginTop: 2,
                      position: 'absolute',
                      bottom: -6
                    }} />
                  )}
                </View>
              </ControlButton>
            </View>

            <View style={styles.subActions}>
              <DeviceSelector compact />

              <View style={styles.subActionsRight}>
                <TouchableOpacity style={styles.subActionButton} activeOpacity={0.7} onPress={handleShare}>
                  <Share2 size={18} color="rgba(218, 214, 214, 1)" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.subActionButton}
                  activeOpacity={0.7}
                  onPress={() => setQueueVisible(true)}
                >
                  <QueueIcon size={18} color="rgba(218, 214, 214, 1)" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          {showDelayedContent && (
            <Animated.View style={delayedContentStyle}>
              {!!hasLyrics && <LyricsPreviewCard />}

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
        </AnimatedRNGHScrollView>

        <TrackProgressObserver
          syncedLines={syncedLines as any}
          onIndexChange={handleIndexChange}
          onDurationChange={handleDurationChange}
        />
        <LyricsModal />
        <ArtistModal />
        <QueueBottomSheet
          visible={queueVisible}
          onClose={() => setQueueVisible(false)}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
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
    color: Colors.whiteAlpha60,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0,
    marginBottom: 3,
  },
  playingFromText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  playingFromRecommended: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  scrollContent: {},
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '600',
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
  stickyHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    backgroundColor: '#121212',
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
    justifyContent: 'center',
    marginTop: 10,
  },
  pagerContainer: {
    flexDirection: 'row',
    width: SCREEN_WIDTH * 3,
    height: ARTWORK_SIZE,
    alignItems: 'center',
  },
  sideArtworkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerArtworkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkAnimatedWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.58,
    shadowRadius: 16.0,
    elevation: 24,
  },
  artwork: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 6,
    marginTop: isTinyScreen ? 10 : (isSmallScreen ? 15 : 25),
  },
  trackTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    letterSpacing: -0.5,
    marginBottom: 0,
  },
  trackArtist: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    lineHeight: 20,
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
    marginTop: 8,
    marginBottom: isTinyScreen ? 10 : (isSmallScreen ? 15 : 25),
  },
  subActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginTop: isTinyScreen ? 2 : 10,
    marginBottom: isTinyScreen ? 10 : 30,
  },
  mainView: {
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
});