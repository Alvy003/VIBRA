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
import { useScrollToTop } from '@react-navigation/native';
import { useUser } from '@clerk/clerk-expo';

import { useMusicStore } from '@/stores/useMusicStore';
import { useStreamStore } from '@/stores/useStreamStore';
import { COLORS } from '@/constants/design';
import Colors from '@/constants/Colors';

import { AnimatedHeader } from '@/components/home/AnimatedHeader';
import { HomeHeroSection } from '@/components/home/HomeHeroSection';
import { NewReleasesSection } from '@/components/home/NewReleasesSection';
import { TopChartsSection } from '@/components/home/TopChartsSection';
import { FeaturedPlaylistsSection } from '@/components/home/FeaturedPlaylistsSection';
import { FrequentGridSection } from '@/components/home/FrequentGridSection';
import { HeroSkeleton, CarouselSkeleton } from '@/components/home/HomeSkeleton';
import { HomeFooter } from '@/components/home/HomeFooter';
import { AIPlaylistCard } from '@/components/home/AIPlaylistCard';
import { OnboardingModal } from '@/components/home/OnboardingModal';
import { MixSection } from '@/components/home/MixSection';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useUpdateStore } from '@/stores/useUpdateStore';
import { UpdateBanner } from '@/components/home/UpdateBanner';
import { ForcedUpdateModal } from '@/components/home/ForcedUpdateModal';
import CollectionOptions, { CollectionOptionsRef } from '@/components/CollectionOptions';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function HomeScreen() {
  const { user, isLoaded } = useUser();
  const insets = useSafeAreaInsets();
  const scrollRef = React.useRef(null);
  const optionsRef = React.useRef<CollectionOptionsRef>(null);

  // Scroll to top on tab tap
  useScrollToTop(scrollRef);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mountLevel, setMountLevel] = useState(0);
  
  const isLoading = useMusicStore(s => s.isLoading);
  const featuredSongs = useMusicStore(s => s.featuredSongs) || [];
  const quickPicks = useMusicStore(s => s.quickPicks) || [];
  const featuredSongsLength = featuredSongs.length;
  const isPreferencesLoaded = useOnboardingStore(s => s.isPreferencesLoaded);
  const completedOnboarding = useOnboardingStore(s => s.preferences.completedOnboarding);
  // Reactive selectors — avoid stale getState() snapshots captured at mount time
  const hasHomepageData = useStreamStore(s => !!s.homepageData);
  const isLoadingHomepage = useStreamStore(s => s.isLoadingHomepage);

  const { needsUpdate, forceUpdate, apkLink, currentVersion, checkUpdate } = useUpdateStore();

  // Keep non-reactive imperative handles for calling actions (not reading state)
  const musicStore = useMusicStore.getState();
  const streamStore = useStreamStore.getState();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // ─── Image Prefetching for Above-Fold Content ───
  useEffect(() => {
    if (featuredSongs.length > 0 || quickPicks.length > 0) {
      try {
        const { Image } = require('expo-image');
        const { resolveAssetUrl } = require('@/lib/url');
        const targets = quickPicks.length > 0 ? quickPicks.slice(0, 6) : featuredSongs.slice(0, 6);
        let prefetchedCount = 0;
        targets.forEach((item: any) => {
          if (item?.imageUrl) {
            const resolvedUrl = resolveAssetUrl(item.imageUrl);
            if (resolvedUrl) {
              Image.prefetch(resolvedUrl);
              prefetchedCount++;
            }
          }
        });
        if (prefetchedCount > 0) {
          const Sentry = require('@sentry/react-native');
          Sentry.addBreadcrumb({
            category: 'homepage_prefetch',
            message: `Prefetched homepage above-fold artwork count: ${prefetchedCount}`,
            level: 'info',
          });
        }
      } catch (err) {
        // Silently catch prefetch errors
      }
    }
  }, [featuredSongs, quickPicks]);

  // ─── Data Initial Load ───
  useEffect(() => {
    if (!isLoaded) return;

    // Public fetches
    musicStore.fetchFeaturedSongs();
    streamStore.fetchHomepage();
    checkUpdate();

  }, [isLoaded]);

  // ─── Progressive Mounting ───
  useEffect(() => {
    // If we already have cached data, stagger the rendering slightly: mount level 2 (above-fold content)
    // immediately, and level 3 (below-fold components) 150ms later to avoid startup thread block.
    if (hasHomepageData || featuredSongsLength > 0) {
      setMountLevel(2);
      const timer = setTimeout(() => {
        setMountLevel(3);
      }, 150);
      return () => clearTimeout(timer);
    }

    const task = InteractionManager.runAfterInteractions(() => {
      setMountLevel(1);
      setTimeout(() => setMountLevel(2), 120);
      setTimeout(() => setMountLevel(3), 240);
    });
    return () => task.cancel();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        musicStore.fetchFrequentCollections(),
        streamStore.fetchDailyMix(),
        streamStore.fetchWeeklyMix()
      );
    }

    await Promise.all(fetchPromises);
    setIsRefreshing(false);
  }, [isLoaded, !!user]);

  const handleOpenOptions = useCallback((item: any, type: any) => {
    optionsRef.current?.open(item, type);
  }, []);

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

  // ─── Stale-while-revalidate skeleton strategy ───
  // Show skeleton ONLY when we have truly zero data to display.
  // Once content is rendered, NEVER replace it with a skeleton during background
  // re-fetches — this eliminates the double-loading perception entirely.
  // Warm users (MMKV cache) will almost never see a skeleton.
  const hasAnyContent = featuredSongsLength > 0 || hasHomepageData;
  const showSkeletons = !hasAnyContent && (isLoading || isLoadingHomepage || !isPreferencesLoaded);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {needsUpdate && apkLink && (
          forceUpdate ? (
              <ForcedUpdateModal visible={true} apkLink={apkLink} version={currentVersion || ''} />
          ) : (
              <View style={{ marginTop: insets.top }}>
                   <UpdateBanner apkLink={apkLink} version={currentVersion || ''} />
              </View>
          )
      )}

      <AnimatedHeader scrollY={scrollY} userImageUrl={user?.imageUrl} />

      <AnimatedScrollView
        ref={scrollRef}
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
            tintColor={Colors.textSecondary}
            colors={[Colors.textSecondary]}
            progressBackgroundColor={Colors.surfaceLighter}
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
              {mountLevel >= 1 ? <AIPlaylistCard index={0} noAnim={mountLevel === 3} /> : null}
              {mountLevel >= 1 ? <MixSection /> : null}
              {mountLevel >= 1 ? <NewReleasesSection onOptions={handleOpenOptions} /> : null}
              {mountLevel >= 2 ? <TopChartsSection onOptions={handleOpenOptions} /> : null}
              {mountLevel >= 2 ? <FrequentGridSection onOptions={handleOpenOptions} /> : null}
              {mountLevel >= 3 ? <FeaturedPlaylistsSection onOptions={handleOpenOptions} /> : null}
            </>
          )}
        </View>

        {/* Footer */}
        {mountLevel >= 3 ? <HomeFooter /> : null}
      </AnimatedScrollView>
      <CollectionOptions ref={optionsRef} />
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