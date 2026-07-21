import { PremiumCard } from '@/components/PremiumCard';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useStreamStore } from '@/stores/useStreamStore';
import { useAuth } from '@clerk/clerk-expo';
import React, { useCallback, useEffect } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';
import { SectionHeader } from './SectionHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.40;
const CARD_MARGIN = 14;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

interface RediscoverTrack {
  id: string;
  title: string;
  artist: string;
  imageUrl: string;
  artwork: string;
  url: string;
  audioUrl?: string;
  duration: number;
  source: string;
  album?: string;
  externalId?: string;
  recommendationReason?: string;
}

export const RediscoverFavoritesSection = React.memo(({ onOptions }: { onOptions?: (item: any, type: string) => void }) => {
  if (__DEV__) {
  }
  const tracks = useStreamStore(s => s.rediscoverFavoritesData) as RediscoverTrack[] || [];
  const isLoading = useStreamStore(s => s.isLoadingRediscoverFavorites);
  const fetchRediscoverFavorites = useStreamStore(s => s.fetchRediscoverFavorites);

  const { isSignedIn, isLoaded } = useAuth();
  const isAuthReady = useMusicStore(state => state.isAuthReady);
  const initializeQueue = usePlayerStore(state => state.initializeQueue);
  const refreshVersion = useStreamStore(state => state.refreshVersion);

  useEffect(() => {
    if (isLoaded && isSignedIn && isAuthReady) {
      fetchRediscoverFavorites(refreshVersion > 0);
    }
  }, [isLoaded, isSignedIn, isAuthReady, fetchRediscoverFavorites, refreshVersion]);

  const handlePlay = useCallback((index: number) => {
    if (tracks.length > 0) {
      initializeQueue(tracks, index, { type: 'discovery', id: 'rediscover-favorites', title: 'Rediscover Favorites' });
    }
  }, [initializeQueue, tracks]);

  const renderPick = useCallback(({ item, index }: { item: any; index: number }) => (
    <PremiumCard
      title={item.title}
      subtitle={item.artist}
      imageUrl={item.imageUrl}
      onPress={item.isPlaceholder ? undefined : () => handlePlay(index)}
      onLongPress={item.isPlaceholder ? undefined : () => onOptions?.(item, 'song')}
      index={index}
      width={CARD_WIDTH}
      isPlaceholder={item.isPlaceholder}
    />
  ), [handlePlay]);

  const displayTracks = tracks.length > 0 ? tracks : (isLoading ? Array(4).fill({ isPlaceholder: true }) : []);

  if (displayTracks.length === 0) return null;

  return (
    <View style={styles.sectionContainer}>
      <SectionHeader
        title="Rediscover Favorites"
      />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        data={displayTracks}
        keyExtractor={(item, idx) => item.isPlaceholder ? `placeholder-${idx}` : `${item.externalId || item.id}-${idx}`}
        renderItem={renderPick}
        snapToInterval={ITEM_SIZE}
        decelerationRate="fast"
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={3}
        removeClippedSubviews={true}
        getItemLayout={(_, index) => ({
          length: ITEM_SIZE,
          offset: ITEM_SIZE * index,
          index,
        })}
      />
    </View>
  );
});

RediscoverFavoritesSection.displayName = 'RediscoverFavoritesSection';

const styles = StyleSheet.create({
  sectionContainer: { 
    marginTop: 24,
  },
});
