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
  const featuredSongsLength = useMusicStore(s => Array.isArray(s.featuredSongs) ? s.featuredSongs.length : 0);
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
    // If we already have cached data (homepageData reactive selector, not stale snapshot),
    // snap directly to full mount level to avoid progressive pop-in on revisit.
    if (hasHomepageData || featuredSongsLength > 0) {
      setMountLevel(3);
      return;
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

  // Show skeletons only when actively loading AND no data exists yet.
  // Do NOT gate on isPreferencesLoaded for returning users (they have MMKV data).
  // The previous fix (language invalidation) causes a brief re-fetch; we must not
  // show the skeleton during that second fetch if content is already visible.
  const showSkeletons = (isLoading && featuredSongsLength === 0) ||
    (isLoadingHomepage && !hasHomepageData) ||
    (!isPreferencesLoaded && !completedOnboarding && !hasHomepageData);

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