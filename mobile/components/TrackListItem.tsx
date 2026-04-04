import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Music, MoreVertical } from 'lucide-react-native';
import { TrackSkeleton } from './Skeleton';
import { resolveAssetUrl } from '@/lib/url';
import SongOptions from './SongOptions';
import { useDownloadStore } from '@/stores/useDownloadStore';
import { DownloadedIcon } from './DownloadedIcon';

interface TrackListItemProps {
  track: any;
  index: number;
  isCurrent: boolean;
  onPress: () => void;
  playlistImageUrl?: string | null;
  accentColor?: string;
}

export const TrackListItem = React.memo(({ 
  track, 
  index, 
  isCurrent, 
  onPress, 
  playlistImageUrl,
  accentColor = '#27272a'
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
          <View style={[styles.fallbackContainer, { backgroundColor: accentColor + '33' }]}>
            <Music size={20} color={accentColor} />
          </View>
        )}
      </View>
      <View style={styles.infoContainer}>
        <Text 
          className="font-medium text-base"
          style={[styles.title, isCurrent && styles.activeText]} 
          numberOfLines={1}
        >
          {track.title}
        </Text>
        <View style={styles.artistRow}>
          {useDownloadStore.getState().isDownloaded(track.id || track.externalId || track._id) && (
            <View style={{ marginRight: 6 }}>
              <DownloadedIcon size={12} />
            </View>
          )}
          <Text 
            className="text-zinc-400 text-sm"
            style={styles.artist} 
            numberOfLines={1}
          >
            {track.artist}
          </Text>
        </View>
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
  fallbackContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
  },
  activeText: {
    color: '#8B5CF6',
  },
  artist: {
    color: '#71717a',
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  moreBtn: {
    padding: 4,
  }
});
