// components/ai-playlist/PlaylistResult.tsx
import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Play,
  RotateCcw,
  X,
  Sparkles,
  Clock,
  Share2,
  Heart,
  MoreVertical,
  ChevronDown,
  Music,
  ArrowLeft,
  CirclePlus,
  CircleArrowDown,
  Check,
} from 'lucide-react-native';
import { SharpPlay, SharpPause, SharpShuffle } from '@/components/SharpIcons';
import { useSavedItemsStore } from '@/stores/useSavedItemsStore';
import { usePlayerUIStore } from '@/stores/usePlayerUIStore';
import { TrackListItem } from '@/components/TrackListItem';
import { MediaListSkeleton } from '@/components/Skeleton';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAIPlaylistStore } from '@/stores/useAIPlaylistStore';
import { FlashList } from '@shopify/flash-list';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList) as any;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_SIZE = SCREEN_WIDTH * 0.65;

interface PlaylistResultProps {
  playlist: any;
  onClose: () => void;
  onRegenerate: () => void;
  onSave?: (save: boolean) => void;
}

const ACCENT_COLOR = '#7B2CF5';

const CoverArt = React.memo(({ artworkUrl, colors }: { artworkUrl: string; colors: { primary: string } }) => (
  <View style={{
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
    marginBottom: 20,
  }}>
    <Image
      source={{ uri: artworkUrl }}
      style={{ width: COVER_SIZE, height: COVER_SIZE, borderRadius: 4 }}
      contentFit="cover"
      transition={300}
      cachePolicy="memory-disk"
    />
  </View>
));

export const PlaylistResult = React.memo(({
  playlist,
  onClose,
  onRegenerate,
  onSave,
}: PlaylistResultProps) => {
  const isItemSaved = useSavedItemsStore(s => s.isItemSaved);
  const [isSaved, setIsSaved] = useState(() => isItemSaved(playlist._id));
  const scrollY = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const { setIsPlayerExpanded } = usePlayerUIStore();

  const initializeQueue = usePlayerStore((s) => s.initializeQueue);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const pauseTrack = usePlayerStore((s) => s.pauseTrack);
  const { toggleSave } = useAIPlaylistStore();
  const colors = { primary: '#121212' }; // Default for AI results, can be dynamic later

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [140, 180], [0, 1], Extrapolate.CLAMP);
    const translateY = interpolate(scrollY.value, [140, 180], [10, 0], Extrapolate.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  const headerPlayButtonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [200, 240], [0, 1], Extrapolate.CLAMP);
    const scale = interpolate(scrollY.value, [200, 240], [0.8, 1], Extrapolate.CLAMP);
    return { opacity, transform: [{ scale }] };
  });

  const displaySongs = useMemo(() => {
    return (playlist.tracks || []).map((t: any) => ({
      ...t,
      imageUrl: t.imageUrl || playlist.coverArt
    }));
  }, [playlist.tracks, playlist.coverArt]);

  const handlePlayAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const tracks = displaySongs.map((track: any) => ({
      id: track.externalId,
      title: track.title,
      artist: track.artist,
      artwork: track.imageUrl,
      url: track.streamUrl,
      duration: track.duration,
      source: track.source,
    }));
    if (tracks.length > 0) initializeQueue(tracks, 0);
  }, [displaySongs, initializeQueue]);

  const handlePlayTrack = useCallback((track: any, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const tracks = displaySongs.map((t: any) => ({
      id: t.externalId,
      title: t.title,
      artist: t.artist,
      artwork: t.imageUrl,
      url: t.streamUrl,
      duration: t.duration,
      source: t.source,
    }));
    if (tracks.length > 0) initializeQueue(tracks, index);
  }, [displaySongs, initializeQueue]);

  const renderTrackItem = useCallback(({ item: song, index }: { item: any, index: number }) => (
    <TrackListItem
      track={song}
      index={index}
      isCurrent={currentTrack?.id === (song._id || song.id || song.externalId)}
      onPress={() => handlePlayTrack(song, index)}
      playlistImageUrl={playlist.coverArt}
    />
  ), [currentTrack?.id, playlist.coverArt, handlePlayTrack]);

  const handleToggleSave = async () => {
    const nextSaved = !isSaved;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaved(nextSaved);

    try {
      if (playlist._id) {
        await toggleSave(playlist._id, nextSaved);
        // Refresh library to ensure sync
        await useSavedItemsStore.getState().fetchSavedItems();
      }
      onSave?.(nextSaved);
    } catch (err) {
      console.error('Save error:', err);
      setIsSaved(!nextSaved); // rollback
    }
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out this AI-curated playlist on Vibra: ${playlist.name}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const backGesture = Gesture.Pan()
    .activeOffsetX(10)
    .onEnd((e) => {
      if (e.translationX > 100 && Math.abs(e.translationY) < 50) {
        runOnJS(onClose)();
      }
    });

  const renderHeader = useCallback(() => (
    <View style={{ backgroundColor: colors.primary }}>
      <LinearGradient
        colors={[
          'transparent',
          'rgba(0,0,0,0.05)',
          'rgba(0,0,0,0.15)',
          'rgba(0,0,0,0.3)',
          'rgba(0,0,0,0.5)',
          'rgba(0,0,0,0.7)',
          'rgba(0,0,0,0.85)',
          '#000000',
          '#000000',
        ]}
        locations={[0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.78, 0.9, 1]}
        style={{ paddingTop: 40, paddingBottom: 10 }}
      >
        <View className="items-center px-6">
          <CoverArt artworkUrl={playlist.coverArt} colors={colors} />

          <View className="w-full mt-5">
            <Text className="text-white text-[24px] font-bold mb-2 leading-tight tracking-tight" numberOfLines={1}>
              {playlist.name}
            </Text>
            {playlist.description ? (
              <Text className="text-zinc-400 text-sm font-medium mb-4 leading-5" numberOfLines={2}>
                {playlist.description}
              </Text>
            ) : null}

            <View className="flex-row items-center">
              <Image
                source={require('@/assets/images/vibra-white.png')}
                style={{ width: 18, height: 18 }}
                contentFit="contain"
              />
              <Text className="text-white text-[11px] font-bold tracking-wider">
                VIBRA <Text className="text-zinc-400 font-medium lowercase">• {displaySongs.length} tracks</Text>
              </Text>
            </View>
          </View>
        </View>

        <View className="px-6 pt-4 pb-0 flex-row items-center justify-between">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
            <TouchableOpacity onPress={handleToggleSave} activeOpacity={0.7}>
              {isSaved ? (
                <LinearGradient
                  colors={['#7c3aed', '#9333ea']}
                  style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Check size={14} color="black" strokeWidth={4} />
                </LinearGradient>
              ) : (
                <CirclePlus size={24} color="#b3b3b3" />
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleShare} activeOpacity={0.7}>
              <Share2 size={24} color="#b3b3b3" />
            </TouchableOpacity>

            <TouchableOpacity onPress={onRegenerate} activeOpacity={0.7}>
              <RotateCcw size={22} color="#b3b3b3" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handlePlayAll}
            style={{ backgroundColor: ACCENT_COLOR }}
            className="w-14 h-14 rounded-full items-center justify-center shadow-2xl"
            activeOpacity={0.8}
          >
            <SharpPlay size={28} color="black" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  ), [playlist, displaySongs, isSaved, handleToggleSave, handleShare, onRegenerate, handlePlayAll]);

  return (
    <GestureDetector gesture={backGesture}>
      <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Sticky Header Layer */}
      <Animated.View
        style={[{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: 100,
          overflow: 'hidden'
        }]}
      >
        <Animated.View
          style={[{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: colors.primary,
          }, headerTitleStyle]}
        >
          <LinearGradient
            colors={['#18181b', '#000000']}
            style={StyleSheet.absoluteFill}
          />

          <SafeAreaView edges={['top']} className="px-4 py-2 flex-row items-center w-full">
            <View className="w-10 mr-2" />
            <Animated.View style={[headerTitleStyle]} className="flex-1">
              <Text className="text-white text-base font-bold" numberOfLines={1}>
                {playlist.name}
              </Text>
            </Animated.View>

            <Animated.View style={[headerPlayButtonStyle]} className="ml-2">
              <TouchableOpacity
                onPress={handlePlayAll}
                style={{ backgroundColor: ACCENT_COLOR }}
                className="w-11 h-11 rounded-full items-center justify-center shadow-lg"
                activeOpacity={0.8}
              >
                <SharpPlay size={24} color="black" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </Animated.View>
          </SafeAreaView>
        </Animated.View>

        {/* Persistent Back Button */}
        <SafeAreaView edges={['top']} className="px-4 py-2 z-[110]">
          <TouchableOpacity
            onPress={onClose}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>

      <AnimatedFlashList
        data={displaySongs}
        renderItem={renderTrackItem}
        keyExtractor={(item: any) => item.externalId || item.id}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        ListHeaderComponent={renderHeader}
        estimatedItemSize={72}
        contentContainerStyle={{
          backgroundColor: '#000',
          paddingBottom: 100
        }}
      />

    </View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});