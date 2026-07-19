import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { usePlayerStore } from '@/stores/usePlayerStore';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  interpolate,
  clamp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface ProgressBarProps {
  onSeek: (val: number) => void;
}

const TRACK_HEIGHT = 2.5;
const THUMB_SIZE = 8;
const HIT_SLOP = 5;

const ProgressBar = React.memo(({ onSeek }: ProgressBarProps) => {
  const currentTrackDuration = usePlayerStore(state => state.currentTrack?.duration || 1);
  const currentTrackId = usePlayerStore(state => state.currentTrack?.id);
  const durationRef = React.useRef(currentTrackDuration);

  const sliderWidth = useSharedValue(0);
  const isSliding = useSharedValue(false);
  const progress = useSharedValue(0);

  const isSeeking = React.useRef(false);
  const seekTarget = React.useRef(0);
  const seekTime = React.useRef(0);

  useEffect(() => {
    durationRef.current = currentTrackDuration;
  }, [currentTrackDuration]);

  useEffect(() => {
    progress.value = 0;
    isSeeking.current = false;
    seekTarget.current = 0;
    seekTime.current = 0;
  }, [currentTrackId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    interval = setInterval(async () => {
      if (isSliding.value) return;

      try {
        const { position, duration } = await TrackPlayer.getProgress();
        const currentDuration = duration > 0 ? duration : durationRef.current;
        
        if (currentDuration > 0) {
          // Update ref if native duration is more accurate
          durationRef.current = currentDuration;
          
          if (isSeeking.current) {
            const elapsed = Date.now() - seekTime.current;
            const diff = Math.abs(position - seekTarget.current);
            
            if (diff < 2 || elapsed > 1000) {
              isSeeking.current = false;
            } else {
              return;
            }
          }

          progress.value = position / currentDuration;
        }
      } catch (error) {
        // Silently catch errors if TrackPlayer isn't ready
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);


  const seekTo = useCallback(
    (fraction: number) => {
      const currentDuration = durationRef.current;
      if (currentDuration > 0) {
        const targetTime = fraction * currentDuration;
        isSeeking.current = true;
        seekTarget.current = targetTime;
        seekTime.current = Date.now();
        onSeek(targetTime);
      }
    },
    [onSeek]
  );

  const panGesture = Gesture.Pan()
    .hitSlop({ top: HIT_SLOP, bottom: HIT_SLOP, left: HIT_SLOP, right: HIT_SLOP })
    .onBegin((e) => {
      isSliding.value = true;
      const fraction = clamp(e.x / sliderWidth.value, 0, 1);
      progress.value = fraction;
    })
    .onUpdate((e) => {
      const fraction = clamp(e.x / sliderWidth.value, 0, 1);
      progress.value = fraction;
    })
    .onEnd(() => {
      isSliding.value = false;
      runOnJS(seekTo)(progress.value);
    })
    .onFinalize(() => {
      isSliding.value = false;
    });

  const tapGesture = Gesture.Tap()
    .hitSlop({ top: HIT_SLOP, bottom: HIT_SLOP, left: HIT_SLOP, right: HIT_SLOP })
    .onEnd((e) => {
      const fraction = clamp(e.x / sliderWidth.value, 0, 1);
      progress.value = fraction;
      runOnJS(seekTo)(fraction);
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const filledStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [0, sliderWidth.value - THUMB_SIZE]
        ),
      },
    ],
  }));

  return (
    <View style={styles.progressContainer}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={styles.trackContainer}
          onLayout={(e) => {
            sliderWidth.value = e.nativeEvent.layout.width;
          }}
        >
          {/* Track wrapper - this positions both track and thumb together */}
          <View style={styles.trackWrapper}>
            {/* Background track */}
            <View style={styles.track}>
              <Animated.View style={[styles.filledTrack, filledStyle]} />
            </View>

            {/* Thumb - centered vertically with track */}
            <Animated.View style={[styles.thumb, thumbStyle]} />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

ProgressBar.displayName = 'ProgressBar';
export default ProgressBar;

const styles = StyleSheet.create({
  progressContainer: {
    marginHorizontal: 24,
    marginTop: 6,
  },
  trackContainer: {
    paddingVertical: HIT_SLOP,
  },
  trackWrapper: {
    height: THUMB_SIZE,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  filledTrack: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 1 },
    // shadowOpacity: 0.3,
    // shadowRadius: 2,
    // elevation: 3,
  },
});