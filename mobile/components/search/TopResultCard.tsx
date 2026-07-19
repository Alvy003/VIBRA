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

    const source = result.source || 'jiosaavn';
    const rawId = result.externalId || result.id || result._id;

    if (type === 'song') {
      // Ensure JioSaavn IDs are prefixed so getPlayableUrl cleanId logic works correctly
      const songId = rawId
          ? (source === 'jiosaavn' && !String(rawId).startsWith('jiosaavn_')
              ? `jiosaavn_${rawId}`
              : String(rawId))
          : `${result.title}-${result.artist}`;

      addRecentSearch({
        id: songId,
        title: result.title,
        artist: result.artist || '',
        imageUrl: result.imageUrl || '',
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
      if (rawId) {
        addRecentSearch({
          id: String(rawId),
          title: result.name || result.title || '',
          artist: '',
          imageUrl: result.imageUrl || '',
          type: 'artist',
          timestamp: Date.now(),
        });
        const cleanId = String(rawId).replace('jiosaavn_artist_', '');
        router.push(`/(tabs)/artist/external/jiosaavn/${cleanId}?from=search` as any);
      }
    } 
    else if (type === 'album') {
      if (rawId) {
        addRecentSearch({
          id: String(rawId),
          title: result.title || '',
          artist: result.artist || '',
          imageUrl: result.imageUrl || '',
          type: 'album',
          timestamp: Date.now(),
        });
        const cleanId = String(rawId).replace(/^jiosaavn_album_/, '');
        router.push(`/(tabs)/album/external/jiosaavn/${cleanId}?from=search` as any);
      }
    }
    else if (type === 'playlist') {
      if (rawId) {
        addRecentSearch({
          id: String(rawId),
          title: result.title || result.name || '',
          artist: result.artist || result.subtitle || result.description || '',
          imageUrl: result.imageUrl || result.image || '',
          type: 'playlist',
          timestamp: Date.now(),
        });
        const cleanId = String(rawId).replace(/^jiosaavn_playlist_/, '');
        router.push(`/(tabs)/playlist/external/jiosaavn/${cleanId}?from=search` as any);
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
    padding: 12,
    marginBottom: 12,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 3,
    marginBottom: 12,
  },
  content: {
    gap: 6,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    backgroundColor: '#000000ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
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
    width: 64,
    height: 64,
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  imageCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
    overflow: 'hidden',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
    zIndex: 1,
  },
});