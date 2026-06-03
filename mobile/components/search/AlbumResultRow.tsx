// components/search/AlbumResultRow.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Music } from 'lucide-react-native';
import { resolveAssetUrl } from '@/lib/url';
import Colors from '@/constants/Colors';

interface AlbumResultRowProps {
  album: any;
}

export const AlbumResultRow = React.memo(({ album }: AlbumResultRowProps) => {
  const router = useRouter();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const rawId = album.id || album._id || album.externalId;
    
    // All search results are external (JioSaavn)
    if (rawId) {
      const cleanId = rawId.replace(/^jiosaavn_album_/, '');
      router.push(`/(tabs)/album/external/jiosaavn/${cleanId}?from=search` as any);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      activeOpacity={0.7}
    >
      <View style={styles.artworkContainer}>
        {album.imageUrl ? (
          <Image
            source={{ uri: resolveAssetUrl(album.imageUrl), width: 100, height: 100 }}
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
          {album.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          Album • {album.artist}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

AlbumResultRow.displayName = 'AlbumResultRow';

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