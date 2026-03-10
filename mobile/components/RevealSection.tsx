// components/RevealSection.tsx
import React, { useCallback, useRef } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface RevealSectionProps {
  children: React.ReactNode;
  delay?: number;
}

export const RevealSection: React.FC<RevealSectionProps> = React.memo(({
  children,
  delay = 0,
}) => {
  const hasRevealed = useRef(false);
  const opacity = useSharedValue(0);

  const onLayout = useCallback(() => {
    if (!hasRevealed.current) {
      hasRevealed.current = true;
      opacity.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.ease),
      });
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View onLayout={onLayout} style={animatedStyle}>
      {children}
    </Animated.View>
  );
});
