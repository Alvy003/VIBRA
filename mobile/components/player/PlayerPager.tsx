import { resolveAssetUrl } from '@/lib/url';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { Image } from 'expo-image';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

interface PlayerPagerProps {
  screenWidth: number;
  artworkSize: number;
  artworkAnimatedStyle: any;
  transitionCompleted: boolean;
  sideArtworkOpacity: any;
  artworkStageStyle: any;
}

const PlayerPager = React.memo(({
  screenWidth,
  artworkSize,
  artworkAnimatedStyle,
  transitionCompleted,
  sideArtworkOpacity,
  artworkStageStyle,
}: PlayerPagerProps) => {
  // Atomic Store Subscriptions
  const currentTrackId = usePlayerStore(s => s.currentTrack?.id);
  const currentTrackArtwork = usePlayerStore(s => s.currentTrack?.artwork);

  const prevTrackId = usePlayerStore(s => s.currentIndex > 0 ? s.queue[s.currentIndex - 1]?.id : null);
  const prevTrackArtwork = usePlayerStore(s => s.currentIndex > 0 ? s.queue[s.currentIndex - 1]?.artwork : null);

  const nextTrackId = usePlayerStore(s => s.currentIndex < s.queue.length - 1 ? s.queue[s.currentIndex + 1]?.id : null);
  const nextTrackArtwork = usePlayerStore(s => s.currentIndex < s.queue.length - 1 ? s.queue[s.currentIndex + 1]?.artwork : null);

  // Stable structures
  const current = useMemo(() => ({ id: currentTrackId, artwork: currentTrackArtwork }), [currentTrackId, currentTrackArtwork]);
  const prev = useMemo(() => prevTrackId ? { id: prevTrackId, artwork: prevTrackArtwork } : null, [prevTrackId, prevTrackArtwork]);
  const next = useMemo(() => nextTrackId ? { id: nextTrackId, artwork: nextTrackArtwork } : null, [nextTrackId, nextTrackArtwork]);



  return (
    <Animated.View style={[styles.pagerContainer, { width: screenWidth * 3, height: artworkSize }, artworkAnimatedStyle]}>
      {/* Previous Piece */}
      <View style={[styles.sideArtworkContainer, { width: screenWidth }]}>
        {transitionCompleted && prev && (
          <Animated.View style={[{ width: artworkSize, height: artworkSize }, sideArtworkOpacity]}>
            <Image
              source={typeof prev.artwork === 'string' ? { uri: resolveAssetUrl(prev.artwork), width: 300, height: 300 } : prev.artwork}
              style={styles.artwork}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={prev.id}
            />
          </Animated.View>
        )}
      </View>

      {/* Current Piece */}
      <View style={[styles.centerArtworkContainer, { width: screenWidth }]}>
        <Animated.View style={[
          {
            width: artworkSize,
            height: artworkSize,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.58,
            shadowRadius: 16.00,
            elevation: 24,
          },
          artworkStageStyle
        ]}>
          <Image
            source={current?.artwork}
            style={styles.artwork}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
            recyclingKey={current?.id}
          />
        </Animated.View>
      </View>

      {/* Next Piece */}
      <View style={[styles.sideArtworkContainer, { width: screenWidth }]}>
        {transitionCompleted && next && (
          <Animated.View style={[{ width: artworkSize, height: artworkSize }, sideArtworkOpacity]}>
            <Image
              source={typeof next.artwork === 'string' ? { uri: resolveAssetUrl(next.artwork), width: 300, height: 300 } : next.artwork}
              style={styles.artwork}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={next.id}
            />
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
});

PlayerPager.displayName = 'PlayerPager';

const styles = StyleSheet.create({
  pagerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideArtworkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerArtworkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  artwork: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});

export default PlayerPager;
