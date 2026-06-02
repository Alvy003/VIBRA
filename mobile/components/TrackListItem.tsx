import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Music, MoreVertical } from 'lucide-react-native';
import { resolveAssetUrl } from '@/lib/url';
import { useDownloadStore } from '@/stores/useDownloadStore';
import { usePlayerUIStore } from '@/stores/usePlayerUIStore';
import { DownloadedIcon } from './DownloadedIcon';
import Colors from '@/constants/Colors';

interface TrackListItemProps {
  track: any;
  index: number;
  isCurrent: boolean;
  onPress: () => void;
  playlistImageUrl?: string | null;
  accentColor?: string;
  hideOptions?: boolean;
  style?: any;
  /** Optional override — if not provided, falls back to global openSongOptions */
  onOptionsPress?: (track: any) => void;
}

export const TrackListItem = React.memo(({
  track,
  index,
  isCurrent,
  onPress,
  playlistImageUrl,
  accentColor = Colors.border,
  hideOptions = false,
  style,
  onOptionsPress,
}: TrackListItemProps) => {
  const artwork = track.imageUrl || playlistImageUrl;
  // Reactive download badge — fine-grained selector keyed to this track's id.
  const trackId = track.id || track.externalId || track._id;
  const isDownloaded = useDownloadStore(
    useCallback(s => !!s.downloadedSongs[trackId], [trackId])
  );

  // Global options trigger. getState() avoids a hook subscription — the button
  // only fires on press, it doesn't need to react to store changes.
  const handleOptionsPress = useCallback(() => {
    if (onOptionsPress) {
      onOptionsPress(track);
    } else {
      usePlayerUIStore.getState().openSongOptions(track);
    }
  }, [track, onOptionsPress]);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, style]}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        {!!artwork ? (
          <>
            <Image
              source={{ uri: resolveAssetUrl(artwork) }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
            {/* Subtle Overlay */}
            <View style={styles.imageOverlay} />
          </>
        ) : (
          <View style={[styles.fallbackContainer, { backgroundColor: accentColor + '33' }]}>
            <Music size={20} color={Colors.textMuted} />
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
          {isDownloaded && (
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
      {!hideOptions && (
        <TouchableOpacity
          onPress={handleOptionsPress}
          style={styles.optionsBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MoreVertical size={20} color="#b3b3b3" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  imageContainer: {
    width: 46,
    height: 46,
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceLighter,
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
    marginRight: 8,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  activeText: {
    color: Colors.accent,
  },
  artist: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '400',
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.blackAlpha12,
    zIndex: 1,
  },
  optionsBtn: {
    padding: 8,
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

TrackListItem.displayName = 'TrackListItem';

export default TrackListItem;
