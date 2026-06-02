// components/home/HomeSkeleton.tsx
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, COLORS, TIME_GRADIENTS, getTimeOfDay } from '@/constants/design';
import { Skeleton } from '../Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 10;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GRID_GAP) / 2;
const CARD_HEIGHT = 60;
const CAROUSEL_CARD_WIDTH = SCREEN_WIDTH * 0.38;

// ─── Shimmer Bone (Aliased to global Skeleton) ───
const ShimmerBone = Skeleton;


// ─── Hero Skeleton (Pattern + Quick Picks Grid) ───
export const HeroSkeleton = React.memo(() => {
  const insets = useSafeAreaInsets();
  const timeOfDay = useMemo(() => getTimeOfDay(), []);
  const accentColor = TIME_GRADIENTS[timeOfDay].accent;

  return (
    <View style={[styles.heroContainer, { paddingTop: insets.top + 60 }]}>
      {/* Subtle gradient hint */}
      <View style={[styles.heroGradientHint, { backgroundColor: accentColor }]} />
      
      {/* Quick Picks Header Skeleton */}
      <View style={styles.sectionHeader}>
        <ShimmerBone width={3} height={18} borderRadius={RADIUS.xs} />
        <ShimmerBone width={100} height={18} borderRadius={RADIUS.xs} />
      </View>

      {/* Quick Picks Grid Skeleton */}
      <View style={styles.quickPicksGrid}>
        {[0, 1, 2].map((rowIndex) => (
          <View key={rowIndex} style={styles.gridRow}>
            {[0, 1].map((colIndex) => (
              <View key={colIndex} style={styles.quickPickCard}>
                <ShimmerBone 
                  width={44} 
                  height={44} 
                  borderRadius={RADIUS.xs} 
                  style={{ marginLeft: 8 }}
                />
                <View style={styles.quickPickTextContainer}>
                  <ShimmerBone width="80%" height={12} borderRadius={RADIUS.xs} />
                  <ShimmerBone width="50%" height={10} borderRadius={RADIUS.xs} style={{ marginTop: 6 }} />
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
});

// ─── Carousel Skeleton ───
export const CarouselSkeleton = React.memo(() => {
  const timeOfDay = useMemo(() => getTimeOfDay(), []);
  const accentColor = TIME_GRADIENTS[timeOfDay].accent;

  return (
    <View style={styles.carouselSection}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={[styles.accentLine, { backgroundColor: accentColor, opacity: 0.3 }]} />
        <ShimmerBone width={120} height={18} borderRadius={RADIUS.xs} />
      </View>

      {/* Carousel Cards */}
      <View style={styles.carouselRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.carouselCard}>
            <ShimmerBone 
              width={CAROUSEL_CARD_WIDTH} 
              height={CAROUSEL_CARD_WIDTH} 
              borderRadius={RADIUS.sm} 
            />
            <View style={styles.carouselCardText}>
              <ShimmerBone width="85%" height={12} borderRadius={RADIUS.xs} />
              <ShimmerBone width="55%" height={10} borderRadius={RADIUS.xs} style={{ marginTop: 6 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

// ─── Quick Picks Skeleton (standalone, if needed elsewhere) ───
export const QuickPicksSkeleton = React.memo(() => (
  <View style={styles.quickPicksSection}>
    <View style={styles.sectionHeader}>
      <ShimmerBone width={3} height={18} borderRadius={RADIUS.xs} />
      <ShimmerBone width={100} height={18} borderRadius={RADIUS.xs} />
    </View>

    <View style={styles.quickPicksGrid}>
      {[0, 1, 2].map((rowIndex) => (
        <View key={rowIndex} style={styles.gridRow}>
          {[0, 1].map((colIndex) => (
            <View key={colIndex} style={styles.quickPickCard}>
              <ShimmerBone 
                width={44} 
                height={44} 
                borderRadius={RADIUS.xs} 
                style={{ marginLeft: 8 }}
              />
              <View style={styles.quickPickTextContainer}>
                <ShimmerBone width="80%" height={12} borderRadius={RADIUS.xs} />
                <ShimmerBone width="50%" height={10} borderRadius={RADIUS.xs} style={{ marginTop: 6 }} />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  </View>
));

const styles = StyleSheet.create({
  // Hero
  heroContainer: {
    paddingBottom: 8,
    position: 'relative',
  },
  heroGradientHint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    opacity: 0.08,
  },
  
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 14,
    gap: 10,
  },
  accentLine: {
    width: 3,
    height: 18,
    borderRadius: RADIUS.xs,
  },

  // Quick Picks Grid
  quickPicksSection: {
    marginTop: 8,
  },
  quickPicksGrid: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: GRID_GAP,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  quickPickCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  quickPickTextContainer: {
    flex: 1,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },

  // Carousel
  carouselSection: {
    marginTop: 28,
  },
  carouselRow: {
    flexDirection: 'row',
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 14,
  },
  carouselCard: {
    width: CAROUSEL_CARD_WIDTH,
  },
  carouselCardText: {
    paddingTop: 10,
    gap: 4,
  },
});