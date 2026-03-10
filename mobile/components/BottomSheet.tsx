// components/ui/BottomSheet.tsx
import React, { useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  BackHandler,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
  initialSnap?: number;
  showHandle?: boolean;
  header?: React.ReactNode;
  dismissThreshold?: number;
  dismissVelocity?: number;
  backgroundColor?: string;
}

export interface BottomSheetRef {
  snapTo: (index: number) => void;
  close: () => void;
}

const TIMING_CONFIG = {
  duration: 300,
  easing: Easing.out(Easing.cubic),
};

const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  (
    {
      isOpen,
      onClose,
      children,
      snapPoints = [0.5],
      initialSnap = 0,
      showHandle = true,
      header,
      dismissThreshold = 100,
      dismissVelocity = 500,
      backgroundColor = '#1a1a1a',
    },
    ref
  ) => {
    const insets = useSafeAreaInsets();
    
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const backdropOpacity = useSharedValue(0);
    const isDragging = useSharedValue(false);
    const startY = useSharedValue(0);
    const currentSnapIndexValue = useSharedValue(initialSnap);

    // Calculate snap heights
    const snapHeights = snapPoints.map(p => SCREEN_HEIGHT * p);
    const maxSnapHeight = Math.max(...snapHeights);

    // JS functions to be called from worklets
    const triggerHaptic = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const handleClose = useCallback(() => {
      onClose();
    }, [onClose]);

    // Open sheet
    const openSheet = useCallback(() => {
      const targetHeight = snapHeights[initialSnap];
      const targetY = SCREEN_HEIGHT - targetHeight;
      
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(targetY, TIMING_CONFIG);
      currentSnapIndexValue.value = initialSnap;
    }, [initialSnap, snapHeights]);

    // Close sheet (for imperative use)
    const closeSheet = useCallback(() => {
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(
        SCREEN_HEIGHT,
        TIMING_CONFIG,
        (finished) => {
          if (finished) {
            runOnJS(handleClose)();
          }
        }
      );
    }, [handleClose]);

    // Snap to index (for imperative use)
    const snapToIndex = useCallback((index: number) => {
      const clampedIndex = Math.min(index, snapPoints.length - 1);
      const targetHeight = snapHeights[clampedIndex];
      const targetY = SCREEN_HEIGHT - targetHeight;
      
      translateY.value = withTiming(targetY, TIMING_CONFIG);
      currentSnapIndexValue.value = clampedIndex;
    }, [snapPoints.length, snapHeights]);

    // Expose methods
    useImperativeHandle(ref, () => ({
      snapTo: snapToIndex,
      close: closeSheet,
    }));

    // Handle open/close state changes
    useEffect(() => {
      if (isOpen) {
        openSheet();
      } else {
        translateY.value = SCREEN_HEIGHT;
        backdropOpacity.value = 0;
      }
    }, [isOpen, openSheet]);

    // Handle back button
    useEffect(() => {
      if (!isOpen) return;

      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        closeSheet();
        return true;
      });

      return () => subscription.remove();
    }, [isOpen, closeSheet]);

    // Pan gesture
    const panGesture = Gesture.Pan()
      .onStart(() => {
        'worklet';
        isDragging.value = true;
        startY.value = translateY.value;
      })
      .onUpdate((event) => {
        'worklet';
        const newY = startY.value + event.translationY;
        const minY = SCREEN_HEIGHT - maxSnapHeight;
        
        // Apply resistance when dragging up past max snap
        if (newY < minY) {
          const overDrag = minY - newY;
          translateY.value = minY - (overDrag * 0.15);
        } else {
          translateY.value = newY;
        }
        
        // Update backdrop opacity
        const minSnapHeight = snapHeights[0];
        const progress = interpolate(
          newY,
          [SCREEN_HEIGHT - minSnapHeight, SCREEN_HEIGHT],
          [1, 0],
          Extrapolation.CLAMP
        );
        backdropOpacity.value = progress;
      })
      .onEnd((event) => {
        'worklet';
        isDragging.value = false;
        
        const currentY = translateY.value;
        const velocity = event.velocityY;
        const dragDistance = currentY - startY.value;

        // Dismiss if dragged far enough or fast enough downward
        if (dragDistance > dismissThreshold || velocity > dismissVelocity) {
          runOnJS(triggerHaptic)();
          backdropOpacity.value = withTiming(0, { duration: 200 });
          translateY.value = withTiming(
            SCREEN_HEIGHT,
            TIMING_CONFIG,
            (finished) => {
              if (finished) {
                runOnJS(handleClose)();
              }
            }
          );
          return;
        }

        // Find target snap point
        const currentHeight = SCREEN_HEIGHT - currentY;
        const currentPercent = currentHeight / SCREEN_HEIGHT;
        
        let targetIndex = currentSnapIndexValue.value;

        // Snap up with upward velocity
        if (velocity < -200 && currentSnapIndexValue.value < snapPoints.length - 1) {
          targetIndex = velocity < -800 
            ? snapPoints.length - 1 
            : currentSnapIndexValue.value + 1;
        }
        // Snap down with downward velocity
        else if (velocity > 200 && currentSnapIndexValue.value > 0) {
          targetIndex = currentSnapIndexValue.value - 1;
        }
        // Find nearest by position
        else {
          let minDist = 999;
          for (let i = 0; i < snapPoints.length; i++) {
            const dist = Math.abs(snapPoints[i] - currentPercent);
            if (dist < minDist) {
              minDist = dist;
              targetIndex = i;
            }
          }
        }

        // Animate to target
        const targetHeight = snapHeights[targetIndex];
        const targetY = SCREEN_HEIGHT - targetHeight;
        
        translateY.value = withTiming(targetY, TIMING_CONFIG);
        currentSnapIndexValue.value = targetIndex;
        backdropOpacity.value = withTiming(1, { duration: 200 });
      });

    // Animated styles
    const backdropStyle = useAnimatedStyle(() => ({
      opacity: backdropOpacity.value,
      pointerEvents: backdropOpacity.value > 0.1 ? 'auto' as const : 'none' as const,
    }));

    const sheetStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    const handleIndicatorStyle = useAnimatedStyle(() => ({
      backgroundColor: isDragging.value 
        ? 'rgba(255,255,255,0.5)' 
        : 'rgba(255,255,255,0.3)',
      transform: [{ scaleX: isDragging.value ? 1.1 : 1 }],
    }));

    if (!isOpen) return null;

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable 
            style={StyleSheet.absoluteFill} 
            onPress={closeSheet} 
          />
        </Animated.View>

        {/* Sheet */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              { backgroundColor },
              sheetStyle,
            ]}
          >
            {/* Handle */}
            {showHandle && (
              <View style={styles.handleContainer}>
                <Animated.View style={[styles.handle, handleIndicatorStyle]} />
              </View>
            )}

            {/* Header */}
            {header && (
              <View style={styles.headerContainer}>
                {header}
              </View>
            )}

            {/* Content */}
            <View style={[styles.content, { paddingBottom: insets.bottom + 16 }]}>
              {children}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    zIndex: 200,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  headerContainer: {
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
});

export default BottomSheet;