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
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
  Easing,
  useAnimatedScrollHandler,
  interpolate,
} from 'react-native-reanimated';
import { GestureDetector, Gesture, ScrollView as RNGHScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLyricsStore } from '@/stores/useLyricsStore';
import { useColorStore } from '@/stores/useColorStore';
import { useArtistStore } from '@/stores/useArtistStore';
import { useRouter } from 'expo-router';
import { Skeleton } from '@/components/Skeleton';
import { usePlayerUIStore } from '@/stores/usePlayerUIStore';
import { useSavedItemsStore } from '@/stores/useSavedItemsStore';
import * as Haptics from 'expo-haptics';

import PlayerBackground from './player/PlayerBackground';
import PlayerHeader from './player/PlayerHeader';
import PlayerArtwork from './player/PlayerArtwork';
import PlayerPager from './player/PlayerPager';
import PlayerMetadata from './player/PlayerMetadata';
import PlayerProgress from './player/PlayerProgress';
import PlaybackControls from './player/PlaybackControls';
import SecondaryControls from './player/SecondaryControls';

import TrackProgressObserver from './TrackProgressObserver';
import LyricsPreviewCard from './player/LyricsPreviewCard';
import { resolveAssetUrl } from '@/lib/url';
import Colors from '@/constants/Colors';
import ArtistModal from './player/ArtistModal';
import LyricsModal from './player/LyricsModal';
import TrackPlayer from 'react-native-track-player';
import SimilarSongsSection from './player/SimilarSongsSection';


const AnimatedRNGHScrollView = Animated.createAnimatedComponent(RNGHScrollView);

const DEFAULT_GRADIENT = [Colors.surface, Colors.surface, Colors.surface, Colors.background];
const EMPTY_ARRAY: any[] = [];

const ArtistCard = React.memo(
  ({
    artist,
    artistId,
    artwork,
    onSeeMore,
  }: {
    artist: string;
    artistId?: string;
    artwork: string;
    onSeeMore: (resolvedId?: string) => void;
  }) => {
    const artistInfo = useArtistStore(useCallback(s => artist ? s.artistCache[artist] : (artistId ? s.artistCache[artistId] : undefined), [artist, artistId]));
    const loading = useArtistStore(useCallback(s => artist ? s.isLoading(artist) : (artistId ? s.isLoading(artistId) : false), [artist, artistId]));
    const fetchArtistInfo = useArtistStore(s => s.fetchArtistInfo);
    const { toggleSaveItem, isItemSaved } = useSavedItemsStore();

    useEffect(() => {
      if (artist) {
        fetchArtistInfo(artist, artistId, 'jiosaavn');
      }
    }, [artist, artistId, fetchArtistInfo]);

    const isFollowing = artistInfo?.externalId ? isItemSaved(artistInfo.externalId) : false;

    const handleFollowToggle = async () => {
      if (!artistInfo) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await toggleSaveItem({
        ...artistInfo,
        externalId: artistInfo.externalId,
        title: artistInfo.name || artist,
        type: 'artist',
        source: 'jiosaavn'
      });
    };

    // Render skeleton if loading to prevent jumps
    if (loading) {
      return (
        <View style={styles.artistCardWrapper}>
          <View style={styles.artistImageContainer}>
            <Skeleton height={280} borderRadius={0} />
          </View>
          <View style={styles.artistInfoSection}>
            <Skeleton width="45%" height={20} style={{ marginBottom: 10 }} />
            <Skeleton width="30%" height={14} style={{ marginBottom: 12 }} />
            <Skeleton width="90%" height={12} style={{ marginBottom: 6 }} />
            <Skeleton width="85%" height={12} style={{ marginBottom: 12 }} />
          </View>
        </View>
      );
    }

    if (!artistInfo) return null;

    const isDefaultPlaceholderImage = (url?: string) => {
      if (!url) return true;
      const lower = url.toLowerCase();
      return (
        lower.includes('artist-default-music') ||
        lower.includes('artist_default') ||
        lower.includes('default_artist') ||
        lower.includes('/artists/default') ||
        lower.includes('default-music') ||
        lower.includes('default_150x150') ||
        lower.includes('default_500x500') ||
        lower.includes('default_250x250') ||
        lower.includes('default_50x50')
      );
    };

    const isRealBio = (bioText?: string) => {
      if (!bioText) return false;
      const lower = bioText.toLowerCase().trim();
      return !lower.startsWith('artist •') && !lower.includes('listeners');
    };

    const hasRealImage = artistInfo.imageUrl && !isDefaultPlaceholderImage(artistInfo.imageUrl);
    const imageToUse = hasRealImage ? artistInfo.imageUrl : undefined;
    const hasRealBiography = artistInfo.bio && isRealBio(artistInfo.bio);

    const getFollowerText = () => {
      const count = artistInfo.followerCount || artistInfo.listeners;
      if (!count) return null;
      if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M followers`;
      }
      if (count >= 1000) {
        return `${(count / 1000).toFixed(0)}K followers`;
      }
      return `${count} followers`;
    };

    return (
      <TouchableOpacity
        style={styles.artistCardWrapper}
        activeOpacity={0.9}
        onPress={() => onSeeMore(artistInfo.externalId)}
      >
        <View style={styles.artistImageContainer}>
          {imageToUse ? (
            <Image
              source={{ uri: resolveAssetUrl(imageToUse), width: 400, height: 400 }}
              style={styles.artistImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            // Premium content-aware blurred artwork placeholder
            <View style={StyleSheet.absoluteFill}>
              {artwork ? (
                <Image
                  source={{ uri: resolveAssetUrl(artwork), width: 400, height: 400 }}
                  style={[styles.artistImage, { opacity: 0.45 }]}
                  contentFit="cover"
                  blurRadius={20}
                  cachePolicy="memory-disk"
                />
              ) : (
                <LinearGradient
                  colors={[Colors.surfaceLighter, Colors.surface]}
                  style={StyleSheet.absoluteFill}
                />
              )}
            </View>
          )}
          {/* Top dark gradient overlay for "About the artist" readability */}
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.2)', 'transparent']}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Bottom fade into the card background (#121214) */}
          <LinearGradient
            colors={['transparent', 'rgba(18, 18, 20, 0.6)', '#121214']}
            locations={[0, 0.7, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={styles.artistImageLabel}>About the artist</Text>
        </View>

        <View style={styles.artistInfoSection}>
          <View style={styles.artistInfoHeaderRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.artistInfoName} numberOfLines={1}>
                {artistInfo.name || (typeof artist === 'string' ? artist.split(',')[0].trim() : 'Artist')}
              </Text>

              {getFollowerText() && (
                <Text style={styles.artistInfoListeners}>
                  {getFollowerText()}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing && styles.followingButton
              ]}
              onPress={handleFollowToggle}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.followButtonText,
                isFollowing && styles.followingButtonText
              ]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>

          {!!artistInfo.bio && hasRealBiography && (
            <Text style={styles.artistInfoBio} numberOfLines={3}>
              {artistInfo.bio}
            </Text>
          )}
        </View>
      </TouchableOpacity>
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

const { width: STATIC_SCREEN_WIDTH, height: STATIC_SCREEN_HEIGHT } = Dimensions.get('window');

const STATIC_isTinyScreen = STATIC_SCREEN_HEIGHT < 600;
const STATIC_isSmallScreen = STATIC_SCREEN_HEIGHT < 700;
const STATIC_isMediumScreen = STATIC_SCREEN_HEIGHT < 800;

const STATIC_ARTWORK_SIZE = (() => {
  if (STATIC_SCREEN_HEIGHT < 600) return Math.min(STATIC_SCREEN_WIDTH * 0.5, 200);
  if (STATIC_SCREEN_HEIGHT < 700) return STATIC_SCREEN_WIDTH * 0.65;
  if (STATIC_SCREEN_HEIGHT < 800) return STATIC_SCREEN_WIDTH * 0.78;
  return STATIC_SCREEN_WIDTH * 0.85;
})();

export default function FullScreenPlayer({
  onClose,
  onQueueOpen,
  initialColors,
}: FullScreenPlayerProps) {
  // 1. Hooks (Above ALL early returns)
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const router = useRouter();

  const isTinyScreen = SCREEN_HEIGHT < 600;
  const isSmallScreen = SCREEN_HEIGHT < 700;
  const isMediumScreen = SCREEN_HEIGHT < 800;

  const ARTWORK_SIZE = useMemo(() => {
    if (SCREEN_HEIGHT < 600) return Math.min(SCREEN_WIDTH * 0.5, 200);
    if (SCREEN_HEIGHT < 700) return SCREEN_WIDTH * 0.65;
    if (SCREEN_HEIGHT < 800) return SCREEN_WIDTH * 0.78;
    return SCREEN_WIDTH * 0.85;
  }, [SCREEN_WIDTH, SCREEN_HEIGHT]);

  const artworkTopSpacing = isTinyScreen ? 10 : (isSmallScreen ? SCREEN_HEIGHT * 0.02 : (isMediumScreen ? SCREEN_HEIGHT * 0.04 : SCREEN_HEIGHT * 0.06));
  const artworkBottomSpacing = isTinyScreen ? 15 : (isSmallScreen ? SCREEN_HEIGHT * 0.03 : (isMediumScreen ? SCREEN_HEIGHT * 0.04 : SCREEN_HEIGHT * 0.05));
  const sectionSpacing = isTinyScreen ? 12 : (isSmallScreen ? 18 : 24);

  const [primaryContentHeight, setPrimaryContentHeight] = useState(0);
  const [showDelayedContent, setShowDelayedContent] = useState(false);
  const [visible, setVisible] = useState(false);
  const [transitionCompleted, setTransitionCompleted] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [isScrollReady, setIsScrollReady] = useState(false);
  const [similarSongsVisible, setSimilarSongsVisible] = useState(false);

  // Atomic Store Subscriptions
  const currentTrackId = usePlayerStore(s => s.currentTrack?.id);
  const currentTrackArtist = usePlayerStore(s => s.currentTrack?.artist);
  const currentTrackArtwork = usePlayerStore(s => s.currentTrack?.artwork);
  const currentTrackTitle = usePlayerStore(s => s.currentTrack?.title);
  const currentTrackDuration = usePlayerStore(s => s.currentTrack?.duration);
  const currentTrackAlbum = usePlayerStore(s => s.currentTrack?.album);
  const currentTrackSource = usePlayerStore(s => s.currentTrack ? (s.currentTrack as any).source : 'jiosaavn');
  const currentTrackArtistId = usePlayerStore(s => s.currentTrack ? (s.currentTrack as any).artistId : undefined);

  const trackColorsDominant = useColorStore(s => s.getTrackColors(currentTrackId ?? 'none')?.dominant);
  const trackColorsGradient = useColorStore(s => s.getTrackColors(currentTrackId ?? 'none')?.gradient);
  const trackColorsIsLoading = useColorStore(s => s.getTrackColors(currentTrackId ?? 'none')?.isLoading);

  const trackColors = useMemo(() => ({
    dominant: trackColorsDominant,
    gradient: trackColorsGradient,
    isLoading: trackColorsIsLoading,
  }), [trackColorsDominant, trackColorsGradient, trackColorsIsLoading]);

  const lyricsStatus = useLyricsStore(s => currentTrackId ? s.getLyrics(currentTrackId).status : 'idle');
  
  const syncedLines = useLyricsStore(s => {
    if (!currentTrackId) return EMPTY_ARRAY;
    const state = s.getLyrics(currentTrackId);
    return (state.status === 'synced' && 'lines' in state) ? state.lines : EMPTY_ARRAY;
  });

  const hasLyrics = useLyricsStore(s => {
    if (!currentTrackId) return false;
    const state = s.getLyrics(currentTrackId);
    return state.status === 'synced' || state.status === 'plain';
  });

  const extractColors = useColorStore(s => s.extractColors);
  const fetchLyrics = useLyricsStore(s => s.fetchLyrics);
  
  const artistHasCache = useArtistStore(s => currentTrackArtist ? !!s.artistCache[currentTrackArtist] : false);
  const isArtistLoading = useArtistStore(s => currentTrackArtist ? s.isLoading(currentTrackArtist) : false);
  const fetchArtistInfo = useArtistStore(s => s.fetchArtistInfo);
  
  const setActiveIndex = usePlayerUIStore(s => s.setActiveIndex);

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
  const similarSongsY = useSharedValue(0);
  const similarSongsVisibleShared = useSharedValue(false);

  // Staged transition progress variables
  const stage2Progress = useSharedValue(0);
  const stage3Progress = useSharedValue(0);
  const stage4Progress = useSharedValue(0);

  // Refs
  const isClosing = useRef(false);
  const gradientAnimationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainScrollRef = useRef<Animated.ScrollView>(null);
  const hasAnimatedInitial = useRef(false);
  const prevTrackIdRef = useRef<string | null>(null);

  // Computed
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
  const animateClose = useCallback((isGesture = false) => {
    if (isClosing.current) return;
    isClosing.current = true;

    if (isGesture) {
      stage4Progress.value = withTiming(0, { duration: 150 });
      stage3Progress.value = withTiming(0, { duration: 150 });
      stage2Progress.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(
        SCREEN_HEIGHT + 30,
        {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (finished) runOnJS(onClose)();
        }
      );
    } else {
      stage4Progress.value = withTiming(0, { duration: 120, easing: Easing.in(Easing.cubic) });
      stage3Progress.value = withDelay(40, withTiming(0, { duration: 120, easing: Easing.in(Easing.cubic) }));
      stage2Progress.value = withDelay(80, withTiming(0, { duration: 150, easing: Easing.in(Easing.cubic) }));
      translateY.value = withDelay(100, withTiming(
        SCREEN_HEIGHT + 30,
        {
          duration: 280,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (finished) runOnJS(onClose)();
        }
      ));
    }
  }, [onClose, SCREEN_HEIGHT]);

  const handleIndexChange = useCallback((newIndex: number) => {
    setActiveIndex(newIndex);
    activeLineIndex.value = newIndex;
  }, [setActiveIndex]);

  const handleSeek = useCallback(async (value: number) => {
    await TrackPlayer.seekTo(value);
  }, []);

  const scrollToTop = useCallback(() => {
    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const handleCloseModal = useCallback(() => {
    setVisible(false);
  }, []);

  const handleShare = useCallback(async () => {
    handleCloseModal();
    try {
      const track = usePlayerStore.getState().currentTrack;
      if (!track) return;
      const cleanId = track.id.replace(/^(jiosaavn_track_|jiosaavn_album_|jiosaavn_playlist_)/, '');
      const message = `Check out "${track.title}" by ${track.artist} on Vibra!\n\nListen here: https://vibra-969f.onrender.com/track/${cleanId}`;
      await Share.share({
        message,
        title: track.title,
      });
    } catch (error) {
      console.error('Error sharing song:', error);
    }
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      const THRESHOLD = ARTWORK_SIZE + 160;
      stickyHeaderOpacity.value = scrollY.value > THRESHOLD ? 1 : 0;
      stickyHeaderTranslateY.value = scrollY.value > THRESHOLD ? 0 : -60;

      // Lazy load similar songs when it is about to enter the viewport
      if (similarSongsY.value > 0 && !similarSongsVisibleShared.value) {
        const viewportBottom = event.contentOffset.y + event.layoutMeasurement.height;
        if (viewportBottom > similarSongsY.value - 100) {
          similarSongsVisibleShared.value = true;
          runOnJS(setSimilarSongsVisible)(true);
        }
      }
    },
  });

  // ─── Effects ───
  useEffect(() => {
    stage2Progress.value = 0;
    stage3Progress.value = 0;
    stage4Progress.value = 0;

    translateY.value = withSpring(0, {
      damping: 30, stiffness: 250, mass: 0.8, overshootClamping: false,
    }, (finished) => {
      if (finished) {
        runOnJS(setTransitionCompleted)(true);
      }
    });

    stage2Progress.value = withDelay(40, withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
    stage3Progress.value = withDelay(100, withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
    stage4Progress.value = withDelay(160, withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }));
  }, []);

  useEffect(() => {
    if (!currentTrackId) return;
    if (currentTrackArtist && !artistHasCache) {
      fetchArtistInfo(currentTrackArtist);
    }
    if (currentTrackTitle && currentTrackArtist) {
      fetchLyrics(currentTrackId, currentTrackTitle, currentTrackArtist, currentTrackDuration);
    }
    if (currentTrackArtwork) {
      const timer = setTimeout(() => {
        extractColors(currentTrackId, currentTrackArtwork as string);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentTrackId]);

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
  }, [currentTrackId]);

  useEffect(() => {
    if (!transitionCompleted) return;
    if (showDelayedContent) return;
    const isDone = (lyricsStatus !== 'idle' && lyricsStatus !== 'loading') && !isArtistLoading;
    const timer = setTimeout(() => {
      setShowDelayedContent(true);
      delayedContentOpacity.value = withTiming(1, { duration: 600 });
      delayedContentTranslateY.value = withSpring(0, { damping: 24, stiffness: 140, mass: 0.8 });
    }, isDone ? 150 : 2000);
    return () => clearTimeout(timer);
  }, [lyricsStatus, isArtistLoading, showDelayedContent, currentTrackId, transitionCompleted]);

  useEffect(() => {
    const onBackPress = () => { animateClose(); return true; };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [animateClose]);

  useEffect(() => {
    if (!currentTrackId) return;
    if (prevTrackIdRef.current === currentTrackId) return;
    const isFirst = prevTrackIdRef.current === null;
    prevTrackIdRef.current = currentTrackId;
    if (isFirst) return;

    stickyHeaderOpacity.value = 0;
    stickyHeaderTranslateY.value = -60;
    scrollY.value = 0;
    artworkTranslateX.value = 0;
    setTimeout(() => { mainScrollRef.current?.scrollTo({ y: 0, animated: false }); }, 50);
  }, [currentTrackId]);

  // Gestures
  const dismissGesture = useMemo(() => {
    const gesture = Gesture.Pan()
      .activeOffsetY(10).failOffsetY(-10)
      .onBegin(() => { isAtTopWhenPanStarted.value = scrollY.value <= 10; })
      .onStart(() => {
        if (isAtTopWhenPanStarted.value) {
          runOnJS(setScrollEnabled)(false);
        }
      })
      .onChange((event) => { if (isAtTopWhenPanStarted.value && event.translationY > 0) translateY.value = event.translationY; })
      .onEnd((event) => {
        if (!isAtTopWhenPanStarted.value) { translateY.value = withTiming(0, { duration: 250 }); return; }
        if (translateY.value > SCREEN_HEIGHT * 0.2 || (translateY.value > 50 && event.velocityY > 500)) {
          runOnJS(animateClose)(true);
        } else { translateY.value = withTiming(0, { duration: 250 }); }
      })
      .onFinalize(() => {
        runOnJS(setScrollEnabled)(true);
      });

    // Conditionally attach simultaneous gesture only when the scroll ref is populated
    if (isScrollReady && mainScrollRef.current) {
      return gesture.simultaneousWithExternalGesture(mainScrollRef as any);
    }
    return gesture;
  }, [animateClose, SCREEN_HEIGHT, isScrollReady]);

  const handleSwipeEnd = useCallback((translationX: number, velocityX: number) => {
    const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
    const state = usePlayerStore.getState();
    const hasNext = state.currentIndex < state.queue.length - 1;
    const hasPrev = state.currentIndex > 0;
    if (translationX < -SWIPE_THRESHOLD || velocityX < -500) {
      if (hasNext) {
        artworkTranslateX.value = withTiming(-SCREEN_WIDTH, { duration: 250 }, (f) => {
          if (f) runOnJS(state.playNext)();
        });
      } else {
        artworkTranslateX.value = withSpring(0);
      }
    } else if (translationX > SWIPE_THRESHOLD || velocityX > 500) {
      if (hasPrev) {
        artworkTranslateX.value = withTiming(SCREEN_WIDTH, { duration: 250 }, (f) => {
          if (f) runOnJS(state.playPrevious)();
        });
      } else {
        artworkTranslateX.value = withSpring(0);
      }
    } else {
      artworkTranslateX.value = withSpring(0);
    }
  }, [SCREEN_WIDTH, artworkTranslateX]);

  const artworkGesture = useMemo(() => {
    return Gesture.Pan()
      .activeOffsetX([-20, 20]).failOffsetY([-20, 20])
      .onUpdate((event) => { artworkTranslateX.value = event.translationX; })
      .onEnd((event) => {
        runOnJS(handleSwipeEnd)(event.translationX, event.velocityX);
      });
  }, [handleSwipeEnd]);

  // Styles
  const sideArtworkOpacity = useAnimatedStyle(() => ({ opacity: 1 }));
  const artworkAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: artworkTranslateX.value }] }));
  const containerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const gradientStyle = useAnimatedStyle(() => ({ opacity: gradientOpacity.value }));
  const delayedContentStyle = useAnimatedStyle(() => ({ opacity: delayedContentOpacity.value, transform: [{ translateY: delayedContentTranslateY.value }] }));
  const stickyHeaderStyle = useAnimatedStyle(() => ({ opacity: stickyHeaderOpacity.value, transform: [{ translateY: stickyHeaderTranslateY.value }] }));

  // Stage transition animated styles
  const artworkStageStyle = useAnimatedStyle(() => {
    return {
      opacity: stage2Progress.value,
      transform: [
        { scale: interpolate(stage2Progress.value, [0, 1], [0.92, 1]) },
        { translateY: interpolate(stage2Progress.value, [0, 1], [15, 0]) }
      ]
    };
  });

  const infoStageStyle = useAnimatedStyle(() => {
    return {
      opacity: stage2Progress.value,
      transform: [
        { translateY: interpolate(stage2Progress.value, [0, 1], [15, 0]) }
      ]
    };
  });

  const controlsStageStyle = useAnimatedStyle(() => {
    return {
      opacity: stage3Progress.value,
      transform: [
        { translateY: interpolate(stage3Progress.value, [0, 1], [15, 0]) }
      ]
    };
  });

  const secondaryControlsStageStyle = useAnimatedStyle(() => {
    return {
      opacity: stage4Progress.value,
      transform: [
        { translateY: interpolate(stage4Progress.value, [0, 1], [10, 0]) }
      ]
    };
  });

  // 2. Early return (AFTER ALL HOOKS)
  if (!currentTrackId) return null;

  return (
    <GestureDetector gesture={dismissGesture}>
      <Animated.View style={[styles.container, containerStyle]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <PlayerHeader
          type="sticky"
          insets={insets}
          initialColors={initialColors}
          stickyHeaderStyle={stickyHeaderStyle}
          scrollToTop={scrollToTop}
          stickyHeaderOpacity={stickyHeaderOpacity}
        />

        {/* Main Scrollable Content */}
        <AnimatedRNGHScrollView
          ref={mainScrollRef as any}
          onLayout={() => {
            if (!isScrollReady) setIsScrollReady(true);
          }}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          bounces={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          scrollEnabled={scrollEnabled}
        >
          <PlayerBackground
            gradientStyle={gradientStyle}
            screenHeight={SCREEN_HEIGHT}
            initialColors={initialColors}
          />

          <View onLayout={(e) => setPrimaryContentHeight(e.nativeEvent.layout.height)}>
            <PlayerHeader
              type="normal"
              insets={insets}
              infoStageStyle={infoStageStyle}
              animateClose={animateClose}
            />

            <PlayerArtwork
              artworkGesture={artworkGesture}
              screenWidth={SCREEN_WIDTH}
              artworkSize={ARTWORK_SIZE}
              artworkTopSpacing={artworkTopSpacing}
              artworkBottomSpacing={artworkBottomSpacing}
            >
              <PlayerPager
                screenWidth={SCREEN_WIDTH}
                artworkSize={ARTWORK_SIZE}
                artworkAnimatedStyle={artworkAnimatedStyle}
                transitionCompleted={transitionCompleted}
                sideArtworkOpacity={sideArtworkOpacity}
                artworkStageStyle={artworkStageStyle}
              />
            </PlayerArtwork>

            <PlayerMetadata
              isTinyScreen={isTinyScreen}
              isSmallScreen={isSmallScreen}
              infoStageStyle={infoStageStyle}
            />

            <PlayerProgress
              controlsStageStyle={controlsStageStyle}
              handleSeek={handleSeek}
            />

            <PlaybackControls
              isTinyScreen={isTinyScreen}
              isSmallScreen={isSmallScreen}
              controlsStageStyle={controlsStageStyle}
            />

            <SecondaryControls
              isTinyScreen={isTinyScreen}
              secondaryControlsStageStyle={secondaryControlsStageStyle}
              handleShare={handleShare}
            />
          </View>
          {showDelayedContent && (
            <Animated.View style={delayedContentStyle}>
              {!!hasLyrics && <LyricsPreviewCard />}

              <ArtistCard
                artist={currentTrackArtist || 'Unknown'}
                artistId={currentTrackArtistId}
                artwork={currentTrackArtwork as string}
                onSeeMore={(resolvedId) => {
                  const artistId = resolvedId || currentTrackArtistId;
                  if (artistId) {
                    onClose();
                    setTimeout(() => {
                      const cleanId = artistId.replace('jiosaavn_artist_', '').replace('jiosaavn_', '');
                      router.push(`/(tabs)/artist/external/jiosaavn/${cleanId}?from=player` as any);
                    }, 100);
                  } else {
                    const { setArtistModalVisible } = usePlayerUIStore.getState();
                    setArtistModalVisible(true);
                  }
                }}
              />

              <View onLayout={(e) => { similarSongsY.value = e.nativeEvent.layout.y; }}>
                <SimilarSongsSection
                  currentTrackId={currentTrackId}
                  source={currentTrackSource}
                  isVisible={similarSongsVisible}
                />
              </View>
            </Animated.View>
          )}
        </AnimatedRNGHScrollView>

        <TrackProgressObserver
          syncedLines={syncedLines as any}
          onIndexChange={handleIndexChange}
        />
        {transitionCompleted && (
          <>
            <LyricsModal />
            <ArtistModal />
          </>
        )}
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
  scrollContent: {},
  artistCardWrapper: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#121214',
  },
  artistImageContainer: {
    width: '100%',
    height: 280,
    position: 'relative',
  },
  artistImage: {
    width: '100%',
    height: '100%',
  },
  artistImageLabel: {
    position: 'absolute',
    top: 16,
    left: 16,
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    zIndex: 10,
  },
  artistInfoSection: {
    padding: 16,
  },
  artistInfoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  artistInfoName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  artistInfoListeners: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  artistInfoBio: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  followButton: {
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  followingButton: {
    // backgroundColor: '#ffffff',
    // borderColor: '#ffffff',
  },
  followButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
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
    marginTop: STATIC_isTinyScreen ? 10 : (STATIC_isSmallScreen ? 15 : 25),
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
    marginBottom: STATIC_isTinyScreen ? 10 : (STATIC_isSmallScreen ? 15 : 25),
  },
  subActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginTop: STATIC_isTinyScreen ? 2 : 10,
    marginBottom: STATIC_isTinyScreen ? 10 : 30,
  },
  mainView: {
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
});