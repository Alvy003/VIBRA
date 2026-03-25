import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Music, MoreVertical } from 'lucide-react-native';
import { TrackSkeleton } from './Skeleton';
import { resolveAssetUrl } from '@/lib/url';
import SongOptions from './SongOptions';

interface TrackListItemProps {
  track: any;
  index: number;
  isCurrent: boolean;
  onPress: () => void;
  playlistImageUrl?: string | null;
}

export const TrackListItem = React.memo(({ 
  track, 
  index, 
  isCurrent, 
  onPress, 
  playlistImageUrl 
}: TrackListItemProps) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to allow the list to stabilize during fast scrolling
    const timer = setTimeout(() => setIsReady(true), 32); 
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return (
      <View style={{ paddingHorizontal: 20 }}>
        <TrackSkeleton />
      </View>
    );
  }

  const artwork = track.imageUrl || playlistImageUrl;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        {!!artwork ? (
          <Image
            source={{ uri: resolveAssetUrl(artwork) }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Music size={20} color="#52525b" />
        )}
      </View>
      <View style={styles.infoContainer}>
        <Text 
          style={[styles.title, isCurrent && styles.activeText]} 
          numberOfLines={1}
        >
          {track.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>
      <SongOptions song={track} />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  imageContainer: {
    width: 48,
    height: 48,
    borderRadius: 4,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  activeText: {
    color: '#8B5CF6',
  },
  artist: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 2,
  },
  moreBtn: {
    padding: 4,
  }
});
