// components/search/SongResultRow.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSearchStore } from '@/stores/useSearchStore';

interface SongResultRowProps {
  song: any;
}

export const SongResultRow = React.memo(({ song }: SongResultRowProps) => {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const addRecentSearch = useSearchStore((s) => s.addRecentSearch);

    const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const songId = song.videoId || song._id || song.externalId || `${song.title}-${song.artist}`;

    // Add to recent searches
    addRecentSearch({
        id: songId,
        title: song.title,
        artist: song.artist,
        imageUrl: song.imageUrl,
        type: 'song',
        timestamp: Date.now(),
    });

    // Play the track
    playTrack({
        id: songId,
        url: song.streamUrl || song.audioUrl || '',
        title: song.title,
        artist: song.artist,
        artwork: song.imageUrl,
        duration: song.duration,
        source: song.source || 'jiosaavn',
    } as any);
    };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      activeOpacity={0.7}
    >
      <Image
        source={song.imageUrl}
        style={styles.artwork}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          Song • {song.artist}
        </Text>
      </View>
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
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#282828',
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
  },
});