// components/search/ArtistResultRow.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface ArtistResultRowProps {
  artist: any;
}

export const ArtistResultRow = React.memo(({ artist }: ArtistResultRowProps) => {
  const router = useRouter();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const rawId = artist.id || artist._id || artist.externalId;
    
    // All search results are external (JioSaavn)
    if (rawId) {
      const cleanId = rawId.replace('jiosaavn_artist_', '');
      router.push(`/(tabs)/artist/external/jiosaavn/${cleanId}?from=search` as any);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      activeOpacity={0.7}
    >
      <Image
        source={artist.imageUrl}
        style={styles.artwork}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {artist.title || artist.name}
        </Text>
        <Text style={styles.meta}>Artist</Text>
      </View>
    </TouchableOpacity>
  );
});

ArtistResultRow.displayName = 'ArtistResultRow';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#282828',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  name: {
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