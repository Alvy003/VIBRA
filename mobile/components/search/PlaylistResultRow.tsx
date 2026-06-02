// components/search/PlaylistResultRow.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface PlaylistResultRowProps {
  playlist: any;
}

export const PlaylistResultRow = React.memo(({ playlist }: PlaylistResultRowProps) => {
  const router = useRouter();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const rawId = playlist.id || playlist._id || playlist.externalId;
    
    if (rawId) {
      const cleanId = rawId.replace(/^jiosaavn_playlist_/, '');
      // Playlists are only supported for JioSaavn source currently
      router.push(`/(tabs)/playlist/external/jiosaavn/${cleanId}?from=search` as any);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      activeOpacity={0.7}
    >
      <Image
        source={playlist.imageUrl || playlist.image}
        style={styles.artwork}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {playlist.title || playlist.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          Playlist • {playlist.artist || playlist.subtitle || 'Vibra'}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

PlaylistResultRow.displayName = 'PlaylistResultRow';

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
