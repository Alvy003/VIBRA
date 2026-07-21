import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Text } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { PremiumCard } from '@/components/PremiumCard';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useMusicStore } from '@/stores/useMusicStore';
import { useStreamStore } from '@/stores/useStreamStore';
import { SectionHeader } from './SectionHeader';
import Colors from '@/constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.40;
const CARD_MARGIN = 14;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

interface BecauseYouPlayedData {
  artist: {
    externalId: string | null;
    name: string;
    imageUrl: string;
  };
  tracks: any[];
  reason: string;
  generatedAt: string;
}

export const BecauseYouPlayedSection = React.memo(({ onOptions }: { onOptions?: (item: any, type: string) => void }) => {
  if (__DEV__) {
  }
  const data = useStreamStore(s => s.becauseYouPlayedData) as BecauseYouPlayedData | null;
  const isLoading = useStreamStore(s => s.isLoadingBecauseYouPlayed);
  const fetchBecauseYouPlayed = useStreamStore(s => s.fetchBecauseYouPlayed);

  const { isSignedIn, isLoaded } = useAuth();
  const isAuthReady = useMusicStore(state => state.isAuthReady);
  const initializeQueue = usePlayerStore(state => state.initializeQueue);
  const refreshVersion = useStreamStore(state => state.refreshVersion);

  useEffect(() => {
    if (isLoaded && isSignedIn && isAuthReady) {
      fetchBecauseYouPlayed(refreshVersion > 0);
    }
  }, [isLoaded, isSignedIn, isAuthReady, fetchBecauseYouPlayed, refreshVersion]);

  const handlePlay = useCallback((index: number) => {
    if (data && data.tracks.length > 0) {
      initializeQueue(data.tracks, index, { 
        type: 'discovery', 
        id: 'because-you-played-' + data.artist.externalId, 
        title: 'Because you played ' + data.artist.name 
      });
    }
  }, [initializeQueue, data]);

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

  const displayTracks = data?.tracks || (isLoading ? Array(4).fill({ isPlaceholder: true }) : []);

  if (displayTracks.length === 0) return null;

  return (
    <View style={styles.sectionContainer}>
      <SectionHeader
        title={
          data ? (
            <Text style={styles.headerTitle} numberOfLines={1}>
              <Text style={styles.headerTitleSecondary}>Because you played </Text>
              <Text style={styles.headerTitlePrimary}>{data.artist.name}</Text>
            </Text>
          ) : (
            <View style={styles.headerPlaceholderContainer}>
              <Text style={styles.headerTitleSecondary}>Because you played </Text>
              <View style={styles.headerTextPlaceholder} />
            </View>
          )
        }
      />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        data={displayTracks}
        keyExtractor={(item, idx) => item.isPlaceholder ? `placeholder-${idx}` : `${item.externalId || item._id || item.id}-${idx}`}
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

BecauseYouPlayedSection.displayName = 'BecauseYouPlayedSection';

const styles = StyleSheet.create({
  sectionContainer: { 
    marginTop: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  headerTitleSecondary: {
    color: Colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitlePrimary: {
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  headerPlaceholderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 22,
  },
  headerTextPlaceholder: {
    width: 100,
    height: 14,
    backgroundColor: Colors.placeholderText,
    borderRadius: 4,
    marginLeft: 4,
    alignSelf: 'center',
  },
});
