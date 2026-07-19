import React, { useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Music } from 'lucide-react-native';
import { PremiumCard } from '@/components/PremiumCard';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useMusicStore } from '@/stores/useMusicStore';
import { useStreamStore } from '@/stores/useStreamStore';
import Colors from '@/constants/Colors';
import { RADIUS } from '@/constants/design';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.40;
const CARD_MARGIN = 14;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

interface FollowedArtistTrack {
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

interface FollowedArtistGroup {
  artistId: string;
  artistName: string;
  artistImage: string;
  tracks: FollowedArtistTrack[];
}

/**
 * Deterministic daily rotation index based on userId and currentDate hash
 */
const getDailyRotationIndex = (userId: string | null | undefined, count: number): number => {
  if (count <= 1) return 0;
  const now = new Date();
  const dateString = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const input = `${userId || 'default'}:${dateString}`;
  
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  
  return Math.abs(hash) % count;
};

export const FollowedArtistsSection = React.memo(({ onOptions }: { onOptions?: (item: any, type: string) => void }) => {
  if (__DEV__) {
    console.log('[FollowedArtistsSection] Render');
  }
  const groups = useStreamStore(s => s.followedArtistsData) as FollowedArtistGroup[] || [];
  const isLoading = useStreamStore(s => s.isLoadingFollowedArtists);
  const fetchFollowedArtistsRecommendations = useStreamStore(s => s.fetchFollowedArtistsRecommendations);

  const { userId, isSignedIn, isLoaded } = useAuth();
  const isAuthReady = useMusicStore(state => state.isAuthReady);
  const initializeQueue = usePlayerStore(state => state.initializeQueue);
  const router = useRouter();
  const refreshVersion = useStreamStore(state => state.refreshVersion);

  const selectedGroup = useMemo(() => {
    if (groups.length === 0) return null;
    const dailyIndex = getDailyRotationIndex(userId, groups.length);
    return groups[dailyIndex];
  }, [groups, userId]);

  useEffect(() => {
    if (isLoaded && isSignedIn && isAuthReady) {
      fetchFollowedArtistsRecommendations(refreshVersion > 0);
    }
  }, [isLoaded, isSignedIn, isAuthReady, fetchFollowedArtistsRecommendations, refreshVersion]);

  const handlePlay = useCallback((index: number) => {
    if (selectedGroup && selectedGroup.tracks.length > 0) {
      initializeQueue(selectedGroup.tracks, index, { 
        type: 'discovery', 
        id: 'followed-artist-' + selectedGroup.artistId, 
        title: selectedGroup.artistName 
      });
    }
  }, [initializeQueue, selectedGroup]);

  const handleArtistPress = useCallback(() => {
    if (selectedGroup) {
      const cleanId = String(selectedGroup.artistId).replace(/^jiosaavn_artist_/, "");
      router.push(`/(tabs)/artist/external/jiosaavn/${cleanId}?from=home` as any);
    }
  }, [router, selectedGroup]);

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
  ), [handlePlay, onOptions]);

  const displayTracks = selectedGroup?.tracks || (isLoading ? Array(4).fill({ isPlaceholder: true }) : []);

  if (displayTracks.length === 0) return null;

  return (
    <View style={styles.sectionContainer}>
      <TouchableOpacity 
        style={styles.headerContainer} 
        onPress={selectedGroup ? handleArtistPress : undefined} 
        activeOpacity={selectedGroup ? 0.7 : 1}
      >
        <View style={styles.artistAvatarPlaceholder}>
          {selectedGroup?.artistImage ? (
            <Image
              source={{ uri: selectedGroup.artistImage, width: 80, height: 80 }}
              style={styles.artistAvatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={300}
            />
          ) : (
            <Music size={20} color={Colors.placeholderGlyph} />
          )}
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.discoverLabel}>DISCOVER MORE FROM</Text>
          {selectedGroup ? (
            <Text style={styles.artistName} numberOfLines={1}>
              {selectedGroup.artistName}
            </Text>
          ) : (
            <View style={styles.artistNamePlaceholder} />
          )}
        </View>
      </TouchableOpacity>
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

FollowedArtistsSection.displayName = 'FollowedArtistsSection';

const styles = StyleSheet.create({
  sectionContainer: { 
    marginTop: 24 
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  artistAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.placeholderBg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  artistAvatar: {
    width: '100%',
    height: '100%',
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  discoverLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  artistName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 1,
  },
  artistNamePlaceholder: {
    width: 140,
    height: 16,
    backgroundColor: Colors.placeholderText,
    borderRadius: 4,
    marginTop: 4,
  },
  editorialSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '400',
  },
  carouselRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: CARD_MARGIN,
  },
  carouselCardText: {
    paddingTop: 10,
    gap: 4,
  },
});
