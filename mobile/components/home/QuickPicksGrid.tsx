// components/home/QuickPicksGrid.tsx
import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { Play } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { RADIUS, COLORS, TIME_GRADIENTS, getTimeOfDay } from '@/constants/design';
import { resolveAssetUrl } from '@/lib/url';
import SongOptions, { SongOptionsRef } from '@/components/SongOptions';

// Placeholder URL - resolveAudioUrl will replace this with a fresh redirector URL at play time
const DUMMY_URL = 'https://raw.githubusercontent.com/anars/blank-audio/master/1-second-of-silence.mp3';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 10;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GRID_GAP) / 2;
const CARD_HEIGHT = 55;
const ARTWORK_SIZE = 50;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface QuickPickCardProps {
  item: any;
  index: number;
  onPress: () => void;
  onLongPress: () => void;
}

const QuickPickCard = React.memo(({
  item,
  index,
  onPress,
  onLongPress,
}: QuickPickCardProps) => {
  const scale = useSharedValue(1);
  const playOpacity = useSharedValue(0);

  const resolvedUri = useMemo(() => resolveAssetUrl(item.imageUrl), [item.imageUrl]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const playButtonStyle = useAnimatedStyle(() => ({
    opacity: playOpacity.value,
    transform: [{ scale: 0.99 + playOpacity.value * 0.1 }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.99, { damping: 15, stiffness: 400 });
    playOpacity.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    playOpacity.value = withSpring(0, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    onPress();
  };

  return (
    <AnimatedPressable
      entering={FadeIn.delay(index * 50).duration(300)}
      onPress={handlePress}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress();
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.card, animatedStyle]}
    >
      {/* Artwork */}
      <View style={styles.artworkContainer}>
          {resolvedUri ? (
            <>
              <Image
                source={{ uri: resolvedUri, width: 100, height: 100 }}
                style={styles.artwork}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
              />
              {/* Subtle Overlay */}
              <View style={styles.imageOverlay} />
            </>
          ) : (
            <View style={styles.artworkFallback}>
              <Play size={16} color="rgba(255,255,255,0.3)" fill="rgba(255,255,255,0.3)" />
            </View>
          )}
      </View>

      {/* Text content */}
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
    </AnimatedPressable>
  );
});

export const QuickPicksGrid = React.memo(() => {
  const quickPicks = useMusicStore(s => s.quickPicks);
  const featuredSongs = useMusicStore(s => s.featuredSongs);
  const playTrack = usePlayerStore(s => s.playTrack);
  const optionsRef = React.useRef<SongOptionsRef>(null);

  const displayPicks = useMemo(() => {
    if (quickPicks.length > 0) return quickPicks.slice(0, 6);
    return featuredSongs.slice(0, 6);
  }, [quickPicks, featuredSongs]);

  const timeOfDay = useMemo(() => getTimeOfDay(), []);
  const accentColor = TIME_GRADIENTS[timeOfDay].accent;

  const handlePlay = useCallback((song: any) => {
    const source = song.source || (song.videoId ? 'youtube' : 'jiosaavn');
    const rawId = song.externalId || song._id || song.videoId || song.id;
    // Ensure JioSaavn IDs are prefixed so getPlayableUrl cleanId logic works correctly
    const trackId = rawId
        ? (source === 'jiosaavn' && !String(rawId).startsWith('jiosaavn_')
            ? `jiosaavn_${rawId}`
            : String(rawId))
        : `${song.title}-${song.artist}`;

    playTrack({
      id: trackId,
      externalId: trackId,
      url: DUMMY_URL,  // Never pass a raw CDN URL — let resolveAudioUrl build the redirector
      title: song.title,
      artist: song.artist,
      artwork: song.imageUrl,
      duration: song.duration,
      source,
    } as any);
  }, [playTrack]);

  if (quickPicks.length === 0) return null;

  const rows = [];
  for (let i = 0; i < displayPicks.length; i += 2) {
    rows.push(displayPicks.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        {/* <View style={[styles.headerAccent, { backgroundColor: accentColor }]} /> */}
        <Text style={styles.headerTitle}>Quick Picks</Text>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {Array.isArray(row) && row.map((item, colIndex) => (
              <QuickPickCard
                key={`${item._id || item.id}-${rowIndex * 2 + colIndex}`}
                item={item}
                index={rowIndex * 2 + colIndex}
                onPress={() => handlePlay(item)}
                onLongPress={() => optionsRef.current?.open(item)}
              />
            ))}
            {Array.isArray(row) && row.length === 1 ? <View style={styles.cardPlaceholder} /> : null}
          </View>
        ))}
      </View>

      <SongOptions ref={optionsRef} />
    </View>
  );
});

QuickPicksGrid.displayName = 'QuickPicksGrid';

const styles = StyleSheet.create({
  container: {
    paddingTop: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 14,
    gap: 10,
  },
  headerAccent: {
    width: 3,
    height: 18,
    borderRadius: RADIUS.xs,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  grid: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: GRID_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#121214',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  cardPlaceholder: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  artworkContainer: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderTopLeftRadius: RADIUS.xs,
    borderBottomLeftRadius: RADIUS.xs,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  // Neutral fallback when artwork is missing — consistent placeholder philosophy
  artworkFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  artist: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '500',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
    zIndex: 1,
  },
});