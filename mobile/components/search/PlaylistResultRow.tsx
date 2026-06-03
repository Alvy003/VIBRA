// components/search/PlaylistResultRow.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Music } from 'lucide-react-native';
import { resolveAssetUrl } from '@/lib/url';
import Colors from '@/constants/Colors';

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
      <View style={styles.artworkContainer}>
        {playlist.imageUrl || playlist.image ? (
          <Image
            source={{ uri: resolveAssetUrl(playlist.imageUrl || playlist.image), width: 100, height: 100 }}
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
  },
});
