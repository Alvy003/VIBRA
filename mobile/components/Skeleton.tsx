import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

interface SkeletonProps {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton = React.memo(({
  width = '100%',
  height,
  borderRadius = 4,
  style,
}: SkeletonProps) => {
  const translateX = useSharedValue(-1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.bezier(0.4, 0, 0.6, 1) }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{
      translateX: interpolate(
        translateX.value,
        [-1, 1],
        [-SCREEN_WIDTH * 0.5, SCREEN_WIDTH * 0.5]
      )
    }],
  }));

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: Colors.surfaceLighter,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <AnimatedLinearGradient
        colors={[
          'rgba(255, 255, 255, 0)',
          'rgba(255, 255, 255, 0.03)',
          'rgba(255, 255, 255, 0.07)',
          'rgba(255, 255, 255, 0.03)',
          'rgba(255, 255, 255, 0)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          StyleSheet.absoluteFill,
          animatedStyle,
          { width: SCREEN_WIDTH * 0.8 } // Make gradient wider than most components
        ]}
      />
    </View>
  );
});

export const TrackSkeleton = () => (
  <View style={[styles.row, { paddingHorizontal: 0, marginBottom: 0, paddingVertical: 12, opacity: 0.5 }]}>
    <Skeleton width={52} height={52} borderRadius={4} />
    <View style={styles.textContainer}>
      <Skeleton width="70%" height={16} style={{ marginBottom: 10 }} />
      <Skeleton width="45%" height={12} />
    </View>
    <View style={{ width: 40, alignItems: 'center', justifyContent: 'center' }}>
      <Skeleton width={22} height={22} borderRadius={11} />
    </View>
  </View>
);

export const MediaListSkeleton = () => (
  <View style={styles.container}>
    {/* Header Skeleton */}
    <View style={styles.header}>
        <Skeleton width={220} height={220} borderRadius={8} style={{ alignSelf: 'center', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 }} />
        <Skeleton width="65%" height={32} style={{ marginBottom: 12 }} />
        <Skeleton width="35%" height={16} />
    </View>

    {/* List Skeleton */}
    <View style={styles.list}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={styles.row}>
                <Skeleton width={52} height={52} borderRadius={4} />
                <View style={styles.textContainer}>
                    <Skeleton width="65%" height={16} style={{ marginBottom: 8 }} />
                    <Skeleton width="45%" height={12} />
                </View>
            </View>
        ))}
    </View>
  </View>
);

export const ArtistSkeleton = () => (
    <View style={[styles.container, { paddingTop: 0 }]}>
      {/* Full Bleed Header Skeleton */}
      <View style={{ height: 420, backgroundColor: Colors.surface, justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: 40 }}>
          <Skeleton width="75%" height={64} borderRadius={4} style={{ marginBottom: 12 }} />
          <Skeleton width="35%" height={18} borderRadius={4} />
      </View>
  
      {/* Actions Bar Skeleton */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 24 }}>
          <View style={{ flexDirection: 'row', gap: 20 }}>
              <Skeleton width={90} height={36} borderRadius={18} />
              <Skeleton width={36} height={36} borderRadius={18} />              
          </View>
          <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center', justifyContent: 'center' }}>
            <Skeleton width={36} height={36} borderRadius={18} />
            <Skeleton width={56} height={56} borderRadius={28} />
          </View>
      </View>
  
      {/* List Skeleton */}
      <View style={styles.list}>
          {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.row}>
                  <Skeleton width={52} height={52} borderRadius={4} />
                  <View style={styles.textContainer}>
                      <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
                      <Skeleton width="40%" height={12} />
                  </View>
              </View>
          ))}
      </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: 60,
    },
    header: {
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 40,
    },
    list: {
        paddingHorizontal: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    textContainer: {
        flex: 1,
        marginLeft: 16,
    }
});
