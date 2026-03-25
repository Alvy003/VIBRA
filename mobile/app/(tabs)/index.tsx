// app/(tabs)/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StatusBar,
  StyleSheet,
  ScrollView,
  RefreshControl,
  InteractionManager,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';

import { useMusicStore } from '@/stores/useMusicStore';
import { useStreamStore } from '@/stores/useStreamStore';
import { COLORS } from '@/constants/design';

import { AnimatedHeader } from '@/components/home/AnimatedHeader';
import { HomeHeroSection } from '@/components/home/HomeHeroSection';
import { NewReleasesSection } from '@/components/home/NewReleasesSection';
import { TopChartsSection } from '@/components/home/TopChartsSection';
import { FeaturedPlaylistsSection } from '@/components/home/FeaturedPlaylistsSection';
import { CollectionSection } from '@/components/home/CollectionSection';
import { HeroSkeleton, CarouselSkeleton } from '@/components/home/HomeSkeleton';
import { HomeFooter } from '@/components/home/HomeFooter';
import { AIPlaylistCard } from '@/components/home/AIPlaylistCard';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function HomeScreen() {
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mountLevel, setMountLevel] = useState(0);

  const isLoading = useMusicStore(s => s.isLoading);
  const featuredSongsLength = useMusicStore(s => s.featuredSongs.length);
  const { fetchAlbums, fetchFeaturedSongs, fetchRecentlyPlayed } = useMusicStore.getState();
  const { fetchHomepage } = useStreamStore.getState();

  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const heroParallaxStyle = useAnimatedStyle(() => ({
    transform: [{
      translateY: interpolate(
        scrollY.value,
        [-100, 0, 100],
        [25, 0, -15],
        Extrapolation.CLAMP
      ),
    }, {
      scale: interpolate(
        scrollY.value,
        [-100, 0],
        [1.1, 1],
        Extrapolation.CLAMP
      ),
    }],
  }));

  useEffect(() => {
    fetchAlbums();
    fetchFeaturedSongs();
    fetchRecentlyPlayed();
    fetchHomepage();
  }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setMountLevel(1);
      setTimeout(() => setMountLevel(2), 120);
      setTimeout(() => setMountLevel(3), 240);
    });
    return () => task.cancel();
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchAlbums(),
      fetchFeaturedSongs(),
      fetchRecentlyPlayed(),
      fetchHomepage(),
    ]);
    setIsRefreshing(false);
  }, []);

  const showSkeletons = isLoading && featuredSongsLength === 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <AnimatedHeader scrollY={scrollY} userImageUrl={user?.imageUrl} />

      <AnimatedScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        decelerationRate="normal"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#a1a1aa"
            colors={['#a1a1aa']}
            progressBackgroundColor="#18181b"
          />
        }
      >
        {/* Hero + Quick Picks */}
        {showSkeletons ? (
          <HeroSkeleton />
        ) : (
          <HomeHeroSection heroParallaxStyle={heroParallaxStyle} />
        )}

        {/* Sections */}
        <View style={styles.sectionsContainer}>
          {showSkeletons ? (
            <>
              <CarouselSkeleton />
              <CarouselSkeleton />
            </>
          ) : (
            <>
              {mountLevel >= 1 ? <AIPlaylistCard /> : null}
              {mountLevel >= 1 ? <NewReleasesSection /> : null}
              {mountLevel >= 2 ? <TopChartsSection /> : null}
              {mountLevel >= 2 ? <CollectionSection /> : null}
              {mountLevel >= 3 ? <FeaturedPlaylistsSection /> : null}
            </>
          )}
        </View>

        {/* Footer */}
        {mountLevel >= 3 ? <HomeFooter /> : null}
      </AnimatedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  sectionsContainer: {
    marginTop: 24,
  },
});