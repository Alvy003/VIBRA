import { usePlayerStore } from '@/stores/usePlayerStore';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import MarqueeText from '../MarqueeText';
import { SaveToPlaylistButton } from '../SaveToPlaylistButton';

interface PlayerMetadataProps {
  isTinyScreen: boolean;
  isSmallScreen: boolean;
  infoStageStyle: any;
}

const PlayerMetadata = React.memo(({
  isTinyScreen,
  isSmallScreen,
  infoStageStyle,
}: PlayerMetadataProps) => {
  // Atomic Store Subscriptions
  const trackId = usePlayerStore(s => s.currentTrack?.id);
  const title = usePlayerStore(s => s.currentTrack?.title);
  const artist = usePlayerStore(s => s.currentTrack?.artist);
  const artwork = usePlayerStore(s => s.currentTrack?.artwork);
  const album = usePlayerStore(s => s.currentTrack?.album);

  // Stable track object for SaveToPlaylistButton
  const currentTrack = useMemo(() => ({
    id: trackId,
    title,
    artist,
    artwork,
    album,
  }), [trackId, title, artist, artwork, album]);



  return (
    <Animated.View style={[styles.trackInfo, isTinyScreen && { marginBottom: 8 }, { marginTop: isTinyScreen ? 10 : (isSmallScreen ? 15 : 25) }, infoStageStyle]}>
      <View style={styles.trackTextContainer}>
        <MarqueeText
          key={trackId ? `${trackId}-title` : 'title'}
          text={title || ''}
          style={styles.trackTitle}
          delay={2000}
        />
        <MarqueeText
          key={trackId ? `${trackId}-artist` : 'artist'}
          text={artist || ''}
          style={styles.trackArtist}
          delay={3000}
        />
      </View>
      <SaveToPlaylistButton
        track={currentTrack}
        variant="large"
      />
    </Animated.View>
  );
});

PlayerMetadata.displayName = 'PlayerMetadata';

const styles = StyleSheet.create({
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 6,
  },
  trackTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    letterSpacing: -0.5,
    marginBottom: 0,
  },
  trackArtist: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});

export default PlayerMetadata;
