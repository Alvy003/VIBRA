// components/AnimatedCard.tsx
import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { Pressable, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_SPRING = {
  damping: 15,
  stiffness: 200,
  mass: 0.4,
};

interface AnimatedCardProps {
  children: React.ReactNode;
  onPress: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  scaleDown?: number;
  enableHaptic?: boolean;
  hapticStyle?: 'light' | 'medium';
}

export const AnimatedCard: React.FC<AnimatedCardProps> = React.memo(({
  children,
  onPress,
  onLongPress,
  style,
  scaleDown = 0.97,
  enableHaptic = false,
  hapticStyle = 'light',
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(scaleDown, PRESS_SPRING);
  }, [scaleDown]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, PRESS_SPRING);
  }, []);

  const handlePress = useCallback(() => {
    if (enableHaptic) {
      Haptics.impactAsync(
        hapticStyle === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      );
    }
    onPress();
  }, [onPress, enableHaptic, hapticStyle]);

  const handleLongPress = useCallback(() => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onLongPress();
    }
  }, [onLongPress]);

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
});