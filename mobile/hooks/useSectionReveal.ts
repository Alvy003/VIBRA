// hooks/useSectionReveal.ts
import { useEffect, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { ViewToken } from 'react-native';

const REVEAL_SPRING = {
  damping: 20,
  stiffness: 90,
  mass: 0.8,
};

export function useSectionReveal(delay: number = 0) {
  const hasRevealed = useRef(false);
  const progress = useSharedValue(0);

  const reveal = () => {
    if (hasRevealed.current) return;
    hasRevealed.current = true;
    progress.value = withDelay(
      delay,
      withSpring(1, REVEAL_SPRING)
    );
  };

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [0, 1], [30, 0]);
    const opacity = interpolate(progress.value, [0, 0.3, 1], [0, 0.5, 1]);

    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  return { animatedStyle, reveal, progress };
}

export function useStaggerReveal(itemCount: number, baseDelay: number = 0, staggerMs: number = 60) {
  const hasRevealed = useRef(false);
  const progresses = useRef(
    Array.from({ length: itemCount }, () => useSharedValue(0))
  ).current;

  const reveal = () => {
    if (hasRevealed.current) return;
    hasRevealed.current = true;
    progresses.forEach((p, i) => {
      p.value = withDelay(
        baseDelay + i * staggerMs,
        withSpring(1, REVEAL_SPRING)
      );
    });
  };

  const getItemStyle = (index: number) => {
    return useAnimatedStyle(() => {
      const safeIndex = Math.min(index, progresses.length - 1);
      const p = progresses[safeIndex];
      const translateY = interpolate(p.value, [0, 1], [20, 0]);
      const opacity = interpolate(p.value, [0, 0.4, 1], [0, 0.6, 1]);
      const scale = interpolate(p.value, [0, 1], [0.95, 1]);

      return {
        transform: [{ translateY }, { scale }],
        opacity,
      };
    });
  };

  return { reveal, getItemStyle };
}