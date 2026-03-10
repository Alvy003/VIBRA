import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useProgress } from 'react-native-track-player';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  interpolate,
  clamp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

interface ProgressBarProps {
  onSeek: (val: number) => void;
}

const TRACK_HEIGHT = 2.5;
const THUMB_SIZE = 8;
const HIT_SLOP = 5;

const ProgressBar = React.memo(({ onSeek }: ProgressBarProps) => {
  const { position, duration } = useProgress(200);

  const sliderWidth = useSharedValue(0);
  const isSliding = useSharedValue(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!isSliding.value && duration > 0) {
      progress.value = position / duration;
    }
  }, [position, duration]);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const seekTo = useCallback(
    (fraction: number) => {
      if (duration > 0) {
        onSeek(fraction * duration);
      }
    },
    [duration, onSeek]
  );

  const panGesture = Gesture.Pan()
    .hitSlop({ top: HIT_SLOP, bottom: HIT_SLOP, left: HIT_SLOP, right: HIT_SLOP })
    .onBegin((e) => {
      isSliding.value = true;
      const fraction = clamp(e.x / sliderWidth.value, 0, 1);
      progress.value = fraction;
      runOnJS(triggerHaptic)();
    })
    .onUpdate((e) => {
      const fraction = clamp(e.x / sliderWidth.value, 0, 1);
      progress.value = fraction;
    })
    .onEnd(() => {
      isSliding.value = false;
      runOnJS(seekTo)(progress.value);
      runOnJS(triggerHaptic)();
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
      runOnJS(triggerHaptic)();
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
    marginHorizontal: 25,
    marginTop: 14,
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