// components/search/TopResultCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSearchStore } from '@/stores/useSearchStore';

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
      // console.log('[TopResultCard] Playing song from top result. Context:', searchQuery);
      const songId = result.videoId || result._id || result.externalId || `${result.title}-${result.artist}`;

      addRecentSearch({
        id: songId,
        title: result.title,
        artist: result.artist,
        imageUrl: result.imageUrl,
        type: 'song',
        timestamp: Date.now(),
      });

      playTrack({
        id: songId,
        url: result.streamUrl || result.audioUrl || '',
        title: result.title,
        artist: result.artist,
        artwork: result.imageUrl,
        duration: result.duration,
        source: result.source || 'jiosaavn',
      } as any, searchQuery ? { type: 'search', id: 'search', title: searchQuery } : undefined);
    } 
    else if (type === 'artist') {
      // All search results are external (JioSaavn)
      if (result.type === 'artist') {
        const cleanId = result.externalId.replace('jiosaavn_artist_', '');
        router.push(`/(tabs)/artist/external/jiosaavn/${cleanId}` as any);
        return;
      }
    } 
    else if (type === 'album') {
      // All search results are external (JioSaavn)
      if (result.type === 'album') {
        const cleanId = result.externalId.replace('jiosaavn_album_', '');
        router.push(`/(tabs)/album/external/jiosaavn/${cleanId}` as any);
        return;
      }
    }
    else if (type === 'playlist') {
      if (result.type === 'playlist') {
        const cleanId = result.externalId.replace('jiosaavn_playlist_', '');
        router.push(`/(tabs)/playlist/external/jiosaavn/${cleanId}` as any);
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
        <Image
          source={result.imageUrl}
          style={[styles.image, type === 'artist' && styles.imageCircle]}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />

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
    backgroundColor: '#282828',
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
  imageCircle: {
    borderRadius: 46,
  },
  content: {
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
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
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  artist: {
    color: '#b3b3b3',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});