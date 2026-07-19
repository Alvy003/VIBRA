import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { SharpPlay, SharpPause, SharpSkipNext, SharpSkipBack, SharpShuffle, SharpRepeat } from '../SharpIcons';
import ControlButton from '../ControlButton';
import Colors from '@/constants/Colors';
import { State } from 'react-native-track-player';
import { usePlayerStore } from '@/stores/usePlayerStore';

interface PlaybackControlsProps {
  isTinyScreen: boolean;
  isSmallScreen: boolean;
  controlsStageStyle: any;
}

const ACCENT_COLOR = Colors.accent;

const PlaybackControls = React.memo(({
  isTinyScreen,
  isSmallScreen,
  controlsStageStyle,
}: PlaybackControlsProps) => {
  // Atomic Store Subscriptions
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const playbackState = usePlayerStore(s => s.playbackState);
  const shuffleMode = usePlayerStore(s => s.shuffleMode);
  const repeatMode = usePlayerStore(s => s.repeatMode);

  const togglePlay = usePlayerStore(s => s.togglePlay);
  const playNext = usePlayerStore(s => s.playNext);
  const playPrevious = usePlayerStore(s => s.playPrevious);
  const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
  const toggleRepeat = usePlayerStore(s => s.toggleRepeat);



  return (
    <Animated.View style={[styles.mainControls, isTinyScreen && { marginTop: 8, marginBottom: 16 }, { marginBottom: isTinyScreen ? 10 : (isSmallScreen ? 15 : 25) }, controlsStageStyle]}>
      <ControlButton onPress={toggleShuffle} size="medium">
        <View style={{ alignItems: 'center' }}>
          <SharpShuffle
            size={22}
            color={shuffleMode ? ACCENT_COLOR : 'rgba(218, 214, 214, 1)'}
          />
          {shuffleMode && (
            <View style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: ACCENT_COLOR,
              marginTop: 2,
              position: 'absolute',
              bottom: -6
            }} />
          )}
        </View>
      </ControlButton>

      <ControlButton onPress={playPrevious} size="large">
        <SharpSkipBack size={23} color={Colors.textPrimary} />
      </ControlButton>

      <ControlButton onPress={togglePlay} size="xl" variant="solid">
        {isPlaying || playbackState === State.Buffering || playbackState === State.Loading ? (
          <SharpPause size={30} color={Colors.background} />
        ) : (
          <SharpPlay size={30} color={Colors.background} style={{ marginLeft: 3 }} />
        )}
      </ControlButton>

      <ControlButton onPress={playNext} size="large">
        <SharpSkipNext size={23} color={Colors.textPrimary} />
      </ControlButton>

      <ControlButton onPress={toggleRepeat} size="medium">
        <View style={{ alignItems: 'center' }}>
          <SharpRepeat
            size={24}
            color={repeatMode !== 'off' ? ACCENT_COLOR : 'rgba(218, 214, 214, 1)'}
          />
          {repeatMode !== 'off' && (
            <View style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: ACCENT_COLOR,
              marginTop: 2,
              position: 'absolute',
              bottom: -6
            }} />
          )}
        </View>
      </ControlButton>
    </Animated.View>
  );
});

PlaybackControls.displayName = 'PlaybackControls';

const styles = StyleSheet.create({
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginTop: 8,
  },
});

export default PlaybackControls;
