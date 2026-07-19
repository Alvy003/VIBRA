import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedReaction, useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { ChevronDown, MoreVertical } from 'lucide-react-native';
import { SaveToPlaylistButton } from '../SaveToPlaylistButton';
import { SharpPlay, SharpPause } from '../SharpIcons';
import SongOptions from '../SongOptions';
import Colors from '@/constants/Colors';
import { State } from 'react-native-track-player';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useColorStore } from '@/stores/useColorStore';

interface PlayerHeaderProps {
  type: 'sticky' | 'normal';
  insets: any;
  initialColors?: any;
  stickyHeaderStyle?: any;
  infoStageStyle?: any;
  scrollToTop?: () => void;
  animateClose?: (isGesture?: boolean) => void;
  stickyHeaderOpacity?: any;
}

function darkenColor(hex: string, factor: number = 0.5): string {
  if (!hex) return Colors.background;
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  const newR = Math.floor(r * (1 - factor));
  const newG = Math.floor(g * (1 - factor));
  const newB = Math.floor(b * (1 - factor));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

const PlayerHeader = React.memo(({
  type,
  insets,
  initialColors,
  stickyHeaderStyle,
  infoStageStyle,
  scrollToTop,
  animateClose,
  stickyHeaderOpacity,
}: PlayerHeaderProps) => {
  // Atomic Store Subscriptions
  const trackId = usePlayerStore(s => s.currentTrack?.id);
  const title = usePlayerStore(s => s.currentTrack?.title);
  const artist = usePlayerStore(s => s.currentTrack?.artist);
  const artwork = usePlayerStore(s => s.currentTrack?.artwork);
  const album = usePlayerStore(s => s.currentTrack?.album);
  const currentContext = usePlayerStore(s => s.currentContext);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const playbackState = usePlayerStore(s => s.playbackState);
  const togglePlay = usePlayerStore(s => s.togglePlay);

  const trackColors = useColorStore(s => s.getTrackColors(trackId ?? 'none'));

  // Stable track object for SaveToPlaylistButton
  const currentTrack = useMemo(() => ({
    id: trackId,
    title,
    artist,
    artwork,
    album,
  }), [trackId, title, artist, artwork, album]);



  const translateX = useSharedValue(20);

  useAnimatedReaction(
    () => stickyHeaderOpacity?.value ?? 0,
    (opacity, prevOpacity) => {
      if (opacity !== prevOpacity) {
        if (opacity > 0.5) {
          translateX.value = withTiming(0, { duration: 250 });
        } else {
          translateX.value = withTiming(20, { duration: 200 });
        }
      }
    }
  );

  const actionsStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  if (type === 'sticky') {
    return (
      <Animated.View
        style={[
          styles.stickyHeader,
          {
            paddingTop: insets.top + 8,
            backgroundColor: trackColors.dominant
              ? darkenColor(trackColors.dominant, 0.4)
              : initialColors?.dominant
                ? darkenColor(initialColors.dominant, 0.4)
                : Colors.background,
          },
          stickyHeaderStyle,
        ]}
      >
        <TouchableOpacity
          style={styles.stickyHeaderCenter}
          onPress={scrollToTop}
          activeOpacity={0.7}
        >
          <Text style={styles.stickyHeaderTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.stickyHeaderArtist} numberOfLines={1}>
            {artist}
          </Text>
        </TouchableOpacity>

        <Animated.View style={[styles.stickyHeaderActions, actionsStyle]}>
          <TouchableOpacity>
            <SaveToPlaylistButton
              track={currentTrack}
              variant="medium"
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlay} style={styles.stickyPlayButton} activeOpacity={0.8}>
            {isPlaying || playbackState === State.Buffering || playbackState === State.Loading ? (
              <SharpPause size={22} color={Colors.textPrimary} />
            ) : (
              <SharpPlay size={22} color={Colors.textPrimary} style={{ marginLeft: 2 }} />
            )}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.topHeader, { paddingTop: insets.top + 8 }, infoStageStyle]}>
      <TouchableOpacity
        onPress={() => animateClose?.(false)}
        style={styles.headerButton}
        activeOpacity={0.7}
      >
        <ChevronDown size={28} color={Colors.textPrimary} strokeWidth={2.5} />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        {currentContext?.title || album ? (
          <>
            <Text style={styles.playingFromLabel}>
              {currentContext?.type === 'album' ? 'PLAYING FROM ALBUM' :
                currentContext?.type === 'playlist' ? 'PLAYING FROM PLAYLIST' :
                  currentContext?.type === 'artist' ? 'PLAYING FROM ARTIST' :
                    currentContext?.type === 'search' ? 'PLAYING FROM SEARCH' :
                      'PLAYING FROM'}
            </Text>
            <Text style={styles.playingFromText} numberOfLines={1}>
              {currentContext?.title || album}
            </Text>
          </>
        ) : (
          <Text style={styles.playingFromRecommended}>Recommended for you</Text>
        )}
      </View>

      <SongOptions
        song={currentTrack}
        trigger={
          <View style={styles.headerButton}>
            <MoreVertical size={24} color={Colors.textPrimary} />
          </View>
        }
      />
    </Animated.View>
  );
});

PlayerHeader.displayName = 'PlayerHeader';

const styles = StyleSheet.create({
  stickyHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  stickyHeaderCenter: {
    flex: 1,
    marginRight: 16,
  },
  stickyHeaderTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
    paddingTop: 8,
  },
  stickyHeaderArtist: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  stickyHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stickyPlayButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  playingFromLabel: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  playingFromText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  playingFromRecommended: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
});
export default PlayerHeader;
