// components/ai-playlist/StepIndicator.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const Dot = ({ active, completed }: { active: boolean; completed: boolean }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const width = withSpring(active ? 32 : 8, { damping: 15, stiffness: 200 });
    
    const backgroundColor = interpolateColor(
      active ? 1 : completed ? 0.6 : 0,
      [0, 0.6, 1],
      ['#27272a', '#7c3aed', '#9333ea']
    );

    return {
      width,
      backgroundColor,
      opacity: withSpring(active ? 1 : completed ? 0.7 : 0.4, { damping: 15 }),
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
};

export const StepIndicator = React.memo(({ currentStep, totalSteps }: StepIndicatorProps) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <Dot
          key={index}
          active={currentStep === index + 1}
          completed={currentStep > index + 1}
        />
      ))}
    </View>
  );
});

StepIndicator.displayName = 'StepIndicator';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});