import Colors from '@/constants/Colors';
import { usePlayerStore } from '@/stores/usePlayerStore';
import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { State } from 'react-native-track-player';
import { SharpPause, SharpPlay } from './SharpIcons';

export function BottomPlaybackButton() {
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const playbackState = usePlayerStore(s => s.playbackState);
  const togglePlay = usePlayerStore(s => s.togglePlay);

  const scale = useSharedValue(1);

  const handlePress = useCallback(() => {
    togglePlay();
  }, [togglePlay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const showPause = isPlaying || playbackState === State.Buffering || playbackState === State.Loading;

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.controlButton}
      activeOpacity={1}
    >
      <Animated.View style={animatedStyle}>
        {showPause ? (
          <SharpPause size={24} color={Colors.textPrimary} />
        ) : (
          <SharpPlay size={24} color={Colors.textPrimary} style={{ marginLeft: 2 }} />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  controlButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
