// components/search/TopResultCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSearchStore } from '@/stores/useSearchStore';

// Placeholder URL - resolveAudioUrl will replace this with a fresh redirector URL at play time
const DUMMY_URL = 'https://raw.githubusercontent.com/anars/blank-audio/master/1-second-of-silence.mp3';

interface TopResultCardProps {
  result: any;
  type: 'song' | 'artist' | 'album' | 'playlist';
  searchQuery?: string;
}

export const TopResultCard = React.memo(({ result, type, searchQuery }: TopResultCardProps) => {
  const router = useRouter();
  const playTrack = usePlayerStore((s) => s.playTrack);
  const addRecentSearch = useSearchStore((s) => s.addRecentSearch);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (type === 'song') {
      const source = result.source || 'jiosaavn';
      const rawId = result.externalId || result._id || result.videoId || result.id;
      // Ensure JioSaavn IDs are prefixed so getPlayableUrl cleanId logic works correctly
      const songId = rawId
          ? (source === 'jiosaavn' && !String(rawId).startsWith('jiosaavn_')
              ? `jiosaavn_${rawId}`
              : String(rawId))
          : `${result.title}-${result.artist}`;

      addRecentSearch({
        id: songId,
        title: result.title,
        artist: result.artist,
        imageUrl: result.imageUrl,
        type: 'song',
        timestamp: Date.now(),
      });

      // Never pass raw CDN URL — let resolveAudioUrl build the redirector from id + source
      playTrack({
        id: songId,
        externalId: songId,
        url: DUMMY_URL,
        title: result.title,
        artist: result.artist,
        artwork: result.imageUrl,
        duration: result.duration,
        source,
      } as any, searchQuery ? { type: 'search', id: 'search', title: searchQuery } : undefined);
    } 
    else if (type === 'artist') {
      // All search results are external (JioSaavn)
      if (result.type === 'artist') {
        const cleanId = result.externalId.replace('jiosaavn_artist_', '');
        router.push(`/(tabs)/artist/external/jiosaavn/${cleanId}?from=search` as any);
        return;
      }
    } 
    else if (type === 'album') {
      // All search results are external (JioSaavn)
      if (result.type === 'album') {
        const cleanId = result.externalId.replace('jiosaavn_album_', '');
        router.push(`/(tabs)/album/external/jiosaavn/${cleanId}?from=search` as any);
        return;
      }
    }
    else if (type === 'playlist') {
      if (result.type === 'playlist') {
        const cleanId = result.externalId.replace('jiosaavn_playlist_', '');
        router.push(`/(tabs)/playlist/external/jiosaavn/${cleanId}?from=search` as any);
        return;
      }
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'song': return 'Song';
      case 'artist': return 'Artist';
      case 'album': return 'Album';
      case 'playlist': return 'Playlist';
      default: return 'Top Result';
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <TouchableOpacity
        onPress={handlePress}
        style={styles.container}
        activeOpacity={0.8}
      >
        <View style={type === 'artist' ? styles.imageCircle : styles.imageRect}>
          <Image
            source={result.imageUrl}
            style={styles.image}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
          {/* Subtle Overlay */}
          <View style={styles.imageOverlay} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {result.title || result.name}
          </Text>

          <View style={styles.meta}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{getTypeLabel()}</Text>
            </View>
            {result.artist && type !== 'artist' && (
              <Text style={styles.artist} numberOfLines={1}>
                • {result.artist}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

TopResultCard.displayName = 'TopResultCard';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
  },
  image: {
    width: 92,
    height: 92,
    borderRadius: 4,
    marginBottom: 16,
  },
  content: {
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    backgroundColor: '#000000ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  artist: {
    fontWeight: '400',
    flex: 1,
    color: '#fff',
    fontSize: 13,
  },
  imageRect: {
    width: 92,
    height: 92,
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  imageCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    marginBottom: 16,
    overflow: 'hidden',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
    zIndex: 1,
  },
});