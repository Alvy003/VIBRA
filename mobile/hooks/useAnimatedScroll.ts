// hooks/useAnimatedScroll.ts
import {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

export function useHomeScrollHandler() {
  const scrollY = useSharedValue(0);
  const isScrolling = useSharedValue(false);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
    onBeginDrag: () => {
      isScrolling.value = true;
    },
    onMomentumEnd: () => {
      isScrolling.value = false;
    },
  });

  return { scrollY, scrollHandler, isScrolling };
}

export function useHeroParallaxStyle(scrollY: SharedValue<number>) {
  return useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [-100, 0],
      [1.15, 1],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale }],
    };
  });
}