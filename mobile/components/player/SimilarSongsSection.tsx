import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useRecommendationsStore } from '@/stores/useRecommendationsStore';
import TrackListItem from '../TrackListItem';
import Colors from '@/constants/Colors';

const DUMMY_URL = 'https://raw.githubusercontent.com/anars/blank-audio/master/1-second-of-silence.mp3';

interface SimilarSongsSectionProps {
  currentTrackId: string;
  source: string;
  isVisible: boolean;
}

export const SimilarSongsSection = React.memo(({ currentTrackId, source, isVisible }: SimilarSongsSectionProps) => {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const activeTrack = usePlayerStore((s) => s.currentTrack);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const currentContext = usePlayerStore((s) => s.currentContext);
  
  const fetchRecommendations = useRecommendationsStore((s) => s.fetchRecommendations);
  const recommendationsMap = useRecommendationsStore((s) => s.recommendations);
  const loadingTracks = useRecommendationsStore((s) => s.loadingTracks);

  // Clean track ID to match store/caching keys
  const cleanTrackId = currentTrackId.replace(/^(jiosaavn_track_|jiosaavn_album_|jiosaavn_playlist_|jiosaavn_|yt_|youtube_)/, '');
  const cacheKey = `${source}_${cleanTrackId}`;

  // Determine if we should reuse the upcoming queue for recommendations
  const shouldReuseQueue = useMemo(() => {
    if (!currentContext) return true;
    return currentContext.type !== 'album' && 
           currentContext.type !== 'playlist' && 
           currentContext.type !== 'artist';
  }, [currentContext]);

  // Limit queue reuse to the next 8 tracks
  const reusedTracks = useMemo(() => {
    if (!shouldReuseQueue) return [];
    return queue.slice(currentIndex + 1, currentIndex + 9);
  }, [shouldReuseQueue, queue, currentIndex]);

  // Fetch recommendations asynchronously in the background only if we can't reuse the queue
  useEffect(() => {
    if (!shouldReuseQueue && cleanTrackId && source && isVisible) {
      // Async background call
      fetchRecommendations(currentTrackId, source);
    }
  }, [shouldReuseQueue, cleanTrackId, source, fetchRecommendations, isVisible, currentTrackId]);

  const rawRecommendations = useMemo(() => {
    if (shouldReuseQueue) {
      return reusedTracks;
    }
    return recommendationsMap[cacheKey] || [];
  }, [shouldReuseQueue, reusedTracks, recommendationsMap, cacheKey]);

  const isLoading = shouldReuseQueue ? false : loadingTracks.has(cacheKey);

  // Apply filtering rules:
  // 1. Limit visible recommendations to max 2 songs per artist.
  // 2. Cap the total visible list to 5 songs.
  // 3. Exclude the currently playing track itself.
  const filteredRecommendations = useMemo(() => {
    const artistCount: Record<string, number> = {};
    const filtered: any[] = [];

    for (const track of rawRecommendations) {
      // Clean target track ID for direct comparison
      const trackIdStr = String(track.id || track.externalId || '').replace(/^(jiosaavn_track_|jiosaavn_album_|jiosaavn_playlist_|jiosaavn_|yt_|youtube_)/, '');
      const currentCleanId = String(currentTrackId).replace(/^(jiosaavn_track_|jiosaavn_album_|jiosaavn_playlist_|jiosaavn_|yt_|youtube_)/, '');

      // Guard: Exclude the currently playing song
      if (trackIdStr === currentCleanId) {
        continue;
      }

      // Normalize artist to get the primary artist name
      const primaryArtist = (track.artist || 'Unknown')
        .split(/\s*(?:,|\bfeat\b\.?|\bft\b\.?|&|\+|\/|;|\|)\s*/i)[0]
        .trim()
        .toLowerCase();

      artistCount[primaryArtist] = (artistCount[primaryArtist] || 0) + 1;

      // Limit to 2 songs per artist
      if (artistCount[primaryArtist] <= 2) {
        filtered.push(track);
      }

      if (filtered.length >= 5) {
        break;
      }
    }

    return filtered;
  }, [rawRecommendations, currentTrackId]);

  const handlePlaySong = async (song: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const songSource = song.source || 'jiosaavn';
    const rawId = song.externalId || song._id || song.videoId || song.id;
    const songId = rawId
      ? (songSource === 'jiosaavn' && !String(rawId).startsWith('jiosaavn_')
        ? `jiosaavn_${rawId}`
        : String(rawId))
      : `${song.title}-${song.artist}`;

    // Play track immediately
    await playTrack({
      id: songId,
      externalId: songId,
      url: DUMMY_URL,
      title: song.title,
      artist: song.artist,
      artwork: song.imageUrl || song.artwork || '',
      duration: song.duration,
      source: songSource,
    } as any, { type: 'discovery', id: currentTrackId, title: 'Similar Songs' });
  };

  // Hide the section while loading or if no recommendations exist
  if (isLoading || filteredRecommendations.length === 0) {
    return null;
  }

  return (
    <View style={styles.cardContainer}>
      <Text style={styles.cardTitle}>Similar Songs</Text>
      
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={Colors.accent} />
          <Text style={styles.loaderText}>Finding similar music...</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {filteredRecommendations.map((track, index) => {
            const trackId = track.id || track.externalId;
            const isCurrent = activeTrack?.id === trackId;
            
            return (
              <TrackListItem
                key={`${trackId}-${index}`}
                track={{
                  ...track,
                  id: trackId,
                  // Map artwork property to imageUrl so TrackListItem reads it correctly
                  imageUrl: track.imageUrl || track.artwork,
                }}
                index={index}
                isCurrent={isCurrent}
                onPress={() => handlePlaySong(track)}
                style={styles.listItem}
              />
            );
          })}
        </View>
      )}
    </View>
  );
});

SimilarSongsSection.displayName = 'SimilarSongsSection';

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#121214',
    paddingVertical: 16,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  loaderText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginLeft: 10,
  },
  listContainer: {
    marginTop: 4,
  },
  listItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.02)',
  },
});

export default SimilarSongsSection;
