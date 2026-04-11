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
import { OnboardingModal } from '@/components/home/OnboardingModal';
import { MixSection } from '@/components/home/MixSection';
import { useOnboardingStore } from '@/stores/useOnboardingStore';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function HomeScreen() {
  const { user, isLoaded } = useUser();
  const insets = useSafeAreaInsets();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mountLevel, setMountLevel] = useState(0);
  
  const isLoading = useMusicStore(s => s.isLoading);
  const featuredSongsLength = useMusicStore(s => Array.isArray(s.featuredSongs) ? s.featuredSongs.length : 0);
  const isPreferencesLoaded = useOnboardingStore(s => s.isPreferencesLoaded);
  const completedOnboarding = useOnboardingStore(s => s.preferences.completedOnboarding);

  const musicStore = useMusicStore.getState();
  const streamStore = useStreamStore.getState();

  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // ─── Data Initial Load ───
  useEffect(() => {
    if (!isLoaded) return;

    // Public fetches
    musicStore.fetchFeaturedSongs();
    streamStore.fetchHomepage();

  }, [isLoaded]);

  // ─── Progressive Mounting ───
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setMountLevel(1);
      setTimeout(() => setMountLevel(2), 120);
      setTimeout(() => setMountLevel(3), 240);
    });
    return () => task.cancel();
  }, []);

  // ─── Refresh Logic ───
  const onRefresh = useCallback(async () => {
    if (!isLoaded) return;

    setIsRefreshing(true);
    const fetchPromises = [
      musicStore.fetchFeaturedSongs(),
      streamStore.fetchHomepage(true),
    ];

    if (user) {
      fetchPromises.push(
        musicStore.fetchRecentlyPlayed(),
        musicStore.fetchRecentCollections(),
        streamStore.fetchDailyMix(),
        streamStore.fetchWeeklyMix()
      );
    }

    await Promise.all(fetchPromises);
    setIsRefreshing(false);
  }, [isLoaded, !!user]);

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

  const showSkeletons = !!((isLoading && featuredSongsLength === 0) || (!isPreferencesLoaded && !completedOnboarding));

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
              {mountLevel >= 1 ? <OnboardingModal /> : null}
              {mountLevel >= 1 ? <AIPlaylistCard /> : null}
              {mountLevel >= 1 ? <MixSection /> : null}
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