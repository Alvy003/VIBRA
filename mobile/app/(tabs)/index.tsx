// app/(tabs)/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  ScrollView,
  RefreshControl,
  InteractionManager,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';
import { Music2 } from 'lucide-react-native';

// Stores natively handle their own slices inside child components now!
import { useMusicStore } from '@/stores/useMusicStore';
import { useStreamStore } from '@/stores/useStreamStore';

// Isolated Components
import { AnimatedHeader } from '@/components/home/AnimatedHeader';
import { HomeHeroSection } from '@/components/home/HomeHeroSection';
import { QuickPicksSection } from '@/components/home/QuickPicksSection';
import { NewReleasesSection } from '@/components/home/NewReleasesSection';
import { TopChartsSection } from '@/components/home/TopChartsSection';
import { FeaturedPlaylistsSection } from '@/components/home/FeaturedPlaylistsSection';
import { TrendingSection } from '@/components/home/TrendingSection';
import { CollectionSection } from '@/components/home/CollectionSection';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// Define static structure. (Keeping array static prevents FlatList layout thrashing)
const HOME_SECTIONS = [
  { id: 'hero' },
  { id: 'quickPicks' },
  { id: 'newReleases' },
  { id: 'topCharts' },
  { id: 'featuredPlaylists' },
  { id: 'trending' },
  { id: 'collection' },
  { id: 'footer' }
];

export default function HomeScreen() {
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  // Minimal subscriptions for top-level orchestration
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mountLevel, setMountLevel] = useState(0);

  // We only pull the loading state from MusicStore. 
  // Arrays are handled directly inside isolating components.
  const isLoading = useMusicStore(s => s.isLoading);
  const featuredSongsLength = useMusicStore(s => s.featuredSongs.length);
  const { fetchAlbums, fetchFeaturedSongs, fetchTrendingSongs } = useMusicStore.getState();
  const { fetchHomepage } = useStreamStore.getState();

  // ─── Scroll Animation ───
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const heroParallaxStyle = useAnimatedStyle(() => ({
    transform: [{
      scale: interpolate(
        scrollY.value,
        [-100, 0],
        [1.15, 1],
        Extrapolation.CLAMP
      ),
    }],
  }));

  // ─── Data Fetching ───
  useEffect(() => {
    fetchAlbums();
    fetchFeaturedSongs();
    fetchTrendingSongs();
    fetchHomepage();
  }, [fetchAlbums, fetchFeaturedSongs, fetchTrendingSongs, fetchHomepage]);

  // ─── Progressive Mounting (Interaction Deferral) ───
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setMountLevel(1); // Render Hero + Quick Picks

      // Defer horizontal lists to prevent frame drops in the next tick
      setTimeout(() => setMountLevel(2), 150);
      setTimeout(() => setMountLevel(3), 300);
    });
    return () => task.cancel();
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchAlbums(),
      fetchFeaturedSongs(),
      fetchTrendingSongs(),
      fetchHomepage(),
    ]);
    setIsRefreshing(false);
  }, [fetchAlbums, fetchFeaturedSongs, fetchTrendingSongs, fetchHomepage]);

  // ─── Render Orchestration ───
  const renderSection = useCallback(({ item }: { item: typeof HOME_SECTIONS[0] }) => {
    switch (item.id) {
      case 'hero':
        return <HomeHeroSection heroParallaxStyle={heroParallaxStyle} />;

      case 'quickPicks':
        return mountLevel >= 1 ? <QuickPicksSection /> : null;

      case 'newReleases':
        return mountLevel >= 2 ? <NewReleasesSection /> : null;

      case 'topCharts':
        return mountLevel >= 2 ? <TopChartsSection /> : null;

      case 'featuredPlaylists':
        return mountLevel >= 2 ? <FeaturedPlaylistsSection /> : null;

      case 'trending':
        return mountLevel >= 3 ? <TrendingSection /> : null;

      case 'collection':
        return mountLevel >= 3 ? <CollectionSection /> : null;

      case 'footer':
        return mountLevel >= 3 ? (
          <View style={styles.footer}>
            <View style={styles.footerLine} />
            <View style={styles.footerRow}>
              <Music2 size={12} color="#3f3f46" />
              <Text style={styles.footerText}>Crafted for music lovers</Text>
            </View>
          </View>
        ) : <View style={{ height: 100 }} />; // Spacer until loaded

      default:
        return null;
    }
  }, [mountLevel, heroParallaxStyle]);

  // ─── Loading State ───
  if (isLoading && featuredSongsLength === 0) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#09090b" />
        <Image
          source={require('@/assets/images/vibra.png')}
          style={styles.loadingLogo}
          cachePolicy="memory"
        />
        <Text style={styles.loadingText}>Loading your music...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <AnimatedHeader scrollY={scrollY} userImageUrl={user?.imageUrl} />

      <AnimatedScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 140, paddingTop: insets.top }}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        decelerationRate="normal"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#9333ea"
            colors={['#9333ea']}
            progressBackgroundColor="#18181b"
          />
        }
      >
        {HOME_SECTIONS.map((item) => (
          <React.Fragment key={item.id}>
            {renderSection({ item })}
          </React.Fragment>
        ))}
      </AnimatedScrollView>
    </View>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    marginBottom: 16,
  },
  loadingText: {
    color: '#71717a',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 16,
    opacity: 0.8,
  },
  footerLine: {
    width: 40,
    height: 4,
    backgroundColor: '#27272a',
    borderRadius: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: '#3f3f46',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});