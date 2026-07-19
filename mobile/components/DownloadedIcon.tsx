import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ArrowDown } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation
} from 'react-native-reanimated';
import Colors from '@/constants/Colors';

interface DownloadStateIconProps {
  status?: 'idle' | 'downloading' | 'downloaded';
  variant?: 'small' | 'medium' | 'large';
  size?: number;
  color?: string;
  accentColor?: string;
}

const PRESETS = {
  small: {
    circleSize: 20,
    borderWidth: 1.5,
    arrowSize: 12,
  },
  medium: {
    circleSize: 24,
    borderWidth: 2,
    arrowSize: 14,
  },
  large: {
    circleSize: 28,
    borderWidth: 2.5,
    arrowSize: 16,
  },
};

export const DownloadStateIcon = ({
  status = 'downloaded',
  variant = 'small',
  size,
  color,
  accentColor = Colors.accent,
}: DownloadStateIconProps) => {
  const preset = PRESETS[variant] || PRESETS.small;
  const circleSize = size || preset.circleSize;
  const borderWidth = preset.borderWidth;
  const arrowSize = size ? Math.max(10, Math.round(size * 0.6)) : preset.arrowSize;
  
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (status === 'downloading') {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1200, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = 0;
    }
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const activeColor = color || Colors.textSecondary;

  if (status === 'downloaded') {
    return (
      <View
        style={[
          styles.container,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: accentColor,
          },
        ]}
      >
        <ArrowDown size={arrowSize} color={Colors.surface} strokeWidth={3} />
      </View>
    );
  }

  if (status === 'downloading') {
    return (
      <View style={{ width: circleSize, height: circleSize, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={[
            styles.spinner,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              borderWidth,
              borderColor: `${activeColor}33`,
              borderTopColor: activeColor,
            },
            animatedStyle,
          ]}
        />
        <View style={[StyleSheet.absoluteFillObject, styles.center]}>
          <ArrowDown size={arrowSize} color={activeColor} strokeWidth={3} />
        </View>
      </View>
    );
  }

  // IDLE status === 'idle'
  return (
    <View
      style={[
        styles.center,
        {
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
          borderWidth,
          borderColor: activeColor,
        },
      ]}
    >
      <ArrowDown size={arrowSize} color={activeColor} strokeWidth={3} />
    </View>
  );
};

// Export alias for backwards compatibility
export const DownloadedIcon = DownloadStateIcon;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    backgroundColor: 'transparent',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
