import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';

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
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.bezier(0.4, 0, 0.6, 1) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.05, 0.15]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#a1a1aa',
        },
        animatedStyle,
        style,
      ]}
    />
  );
});

export const TrackSkeleton = () => (
  <View style={[styles.row, { paddingHorizontal: 0, marginBottom: 0, paddingVertical: 12 }]}>
    <Skeleton width={48} height={48} borderRadius={4} />
    <View style={styles.textContainer}>
      <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width="40%" height={10} />
    </View>
  </View>
);

export const MediaListSkeleton = () => (
  <View style={styles.container}>
    {/* Header Skeleton */}
    <View style={styles.header}>
        <Skeleton width={200} height={200} borderRadius={8} style={{ alignSelf: 'center', marginBottom: 24 }} />
        <Skeleton width="70%" height={28} style={{ marginBottom: 12 }} />
        <Skeleton width="40%" height={16} />
    </View>

    {/* List Skeleton */}
    <View style={styles.list}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={styles.row}>
                <Skeleton width={48} height={48} borderRadius={4} />
                <View style={styles.textContainer}>
                    <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
                    <Skeleton width="40%" height={10} />
                </View>
            </View>
        ))}
    </View>
  </View>
);

export const ArtistSkeleton = () => (
    <View style={[styles.container, { paddingTop: 0 }]}>
      {/* Full Bleed Header Skeleton */}
      <View style={{ height: 440, backgroundColor: '#18181b', justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: 40 }}>
          <Skeleton width="80%" height={60} borderRadius={4} style={{ marginBottom: 12 }} />
          <Skeleton width="40%" height={16} borderRadius={4} />
      </View>
  
      {/* Actions Bar Skeleton */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 20 }}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
              <Skeleton width={80} height={32} borderRadius={4} />
              <Skeleton width={32} height={32} borderRadius={16} />
              <Skeleton width={32} height={32} borderRadius={16} />
          </View>
          <Skeleton width={56} height={56} borderRadius={28} />
      </View>
  
      {/* List Skeleton */}
      <View style={styles.list}>
          {[0, 1, 2].map((i) => (
              <View key={i} style={styles.row}>
                  <Skeleton width={48} height={48} borderRadius={4} />
                  <View style={styles.textContainer}>
                      <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
                      <Skeleton width="40%" height={10} />
                  </View>
              </View>
          ))}
      </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
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
        marginBottom: 16,
    },
    textContainer: {
        flex: 1,
        marginLeft: 16,
    }
});
