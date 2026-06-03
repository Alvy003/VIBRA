// components/search/SongResultRow.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSearchStore } from '@/stores/useSearchStore';
import { Music } from 'lucide-react-native';
import { resolveAssetUrl } from '@/lib/url';
import Colors from '@/constants/Colors';
import SongOptions from '../SongOptions';

// Placeholder URL - resolveAudioUrl will replace this with a fresh redirector URL at play time
const DUMMY_URL = 'https://raw.githubusercontent.com/anars/blank-audio/master/1-second-of-silence.mp3';

interface SongResultRowProps {
  song: any;
  searchQuery?: string;
}

export const SongResultRow = React.memo(({ song, searchQuery }: SongResultRowProps) => {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const addRecentSearch = useSearchStore((s) => s.addRecentSearch);

    const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Prefer externalId (e.g. "jiosaavn_abc123") for reliable redirector resolution.
    // Autocomplete results have `id` (raw numeric), full-search results have `externalId`.
    const source = song.source || 'jiosaavn';
    const rawId = song.externalId || song._id || song.videoId || song.id;
    // Ensure JioSaavn IDs are prefixed so getPlayableUrl cleanId logic works correctly
    const songId = rawId
        ? (source === 'jiosaavn' && !String(rawId).startsWith('jiosaavn_')
            ? `jiosaavn_${rawId}`
            : String(rawId))
        : `${song.title}-${song.artist}`;

    // Add to recent searches
    addRecentSearch({
        id: songId,
        title: song.title,
        artist: song.artist,
        imageUrl: song.imageUrl,
        type: 'song',
        timestamp: Date.now(),
    });

    // Play the track — pass externalId so resolveAudioUrl/getPlayableUrl can use it
    playTrack({
        id: songId,
        externalId: songId,
        url: DUMMY_URL,  // Never pass a raw CDN URL — let resolveAudioUrl build the redirector
        title: song.title,
        artist: song.artist,
        artwork: song.imageUrl,
        duration: song.duration,
        source,
    } as any, searchQuery ? { type: 'search', id: 'search', title: searchQuery } : undefined);
    };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      activeOpacity={0.7}
    >
      <View style={styles.artworkContainer}>
        {song.imageUrl ? (
          <Image
            source={{ uri: resolveAssetUrl(song.imageUrl), width: 100, height: 100 }}
            style={styles.artwork}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={styles.artworkFallback}>
            <Music size={20} color={Colors.textMuted} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          Song • {song.artist}
        </Text>
      </View>
      <SongOptions song={song} />
    </TouchableOpacity>
  );
});

SongResultRow.displayName = 'SongResultRow';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  artworkContainer: {
    width: 48,
    height: 48,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceLighter,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  meta: {
    color: '#b3b3b3',
    fontSize: 13,
    fontWeight: '400',
    paddingRight: 30,
  },
});