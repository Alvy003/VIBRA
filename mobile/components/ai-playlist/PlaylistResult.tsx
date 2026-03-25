// components/ai-playlist/PlaylistResult.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  FadeInUp,
} from 'react-native-reanimated';
import { 
  Play, 
  RotateCcw, 
  X, 
  Sparkles, 
  Clock,
  Share2,
  Heart,
  MoreVertical,
  ChevronDown,
  Music
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAIPlaylistStore } from '@/stores/useAIPlaylistStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_SIZE = SCREEN_WIDTH * 0.65;

interface PlaylistResultProps {
  playlist: any;
  onClose: () => void;
  onRegenerate: () => void;
  onSave?: (save: boolean) => void;
}

const TrackRow = React.memo(({ 
  track, 
  index,
  onPlay,
}: { 
  track: any; 
  index: number;
  onPlay: () => void;
}) => {
  const formatDuration = (seconds: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
      <TouchableOpacity
        onPress={onPlay}
        style={styles.trackRow}
        activeOpacity={0.7}
      >
        <Image
          source={track.imageUrl}
          style={styles.trackImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {track.artist}
          </Text>
        </View>
        <Text style={styles.trackDuration}>
          {formatDuration(track.duration)}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const CoverMosaic = React.memo(({ images }: { images: string[] }) => {
  const coverImages = [...images];
  while (coverImages.length < 4) {
    coverImages.push(images[0] || '');
  }

  return (
    <View style={styles.coverMosaic}>
      {coverImages.slice(0, 4).map((url, i) => (
        <Image
          key={i}
          source={url}
          style={styles.coverTile}
          contentFit="cover"
          transition={300}
        />
      ))}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)', '#000'] as const}
        locations={[0, 0.6, 1]}
        style={styles.coverOverlay}
      />
    </View>
  );
});

export const PlaylistResult = React.memo(({
  playlist,
  onClose,
  onRegenerate,
  onSave,
}: PlaylistResultProps) => {
  const [isSaved, setIsSaved] = useState(false);
  const [showAllTracks, setShowAllTracks] = useState(false);
  
  const initializeQueue = usePlayerStore((s) => s.initializeQueue);
  const { toggleSave } = useAIPlaylistStore();

  const handlePlayAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const tracks = playlist.tracks.map((track: any) => ({
      id: track.externalId,
      title: track.title,
      artist: track.artist,
      artwork: track.imageUrl,
      url: track.streamUrl,
      duration: track.duration,
      source: track.source,
    }));
    if (tracks.length > 0) initializeQueue(tracks, 0);
  }, [playlist, initializeQueue]);

  const handlePlayTrack = useCallback((track: any, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const tracks = playlist.tracks.map((t: any) => ({
      id: t.externalId,
      title: t.title,
      artist: t.artist,
      artwork: t.imageUrl,
      url: t.streamUrl,
      duration: t.duration,
      source: t.source,
    }));
    if (tracks.length > 0) initializeQueue(tracks, index);
  }, [playlist, initializeQueue]);

  const handleToggleSave = async () => {
    const nextSaved = !isSaved;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaved(nextSaved);
    
    try {
      if (playlist._id) {
        await toggleSave(playlist._id, nextSaved);
      }
      onSave?.(nextSaved);
    } catch (err) {
      console.error('Save error:', err);
      setIsSaved(!nextSaved); // rollback
    }
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out this AI-curated playlist on Vibra: ${playlist.name}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const coverImages = playlist.tracks.slice(0, 4).map((t: any) => t.imageUrl);
  const displayedTracks = showAllTracks ? playlist.tracks : playlist.tracks.slice(0, 10);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header Navigation */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.aiBadge}>
            <Sparkles size={10} color="#fff" fill="#fff" />
            <Text style={styles.aiBadgeText}>Pro</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn}>
            <MoreVertical size={22} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[3]}
        >
          {/* Cover Art Section */}
          <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.coverSection}>
            <CoverMosaic images={coverImages} />
          </Animated.View>

          {/* Title & Info Section */}
          <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.infoSection}>
            <Text style={styles.playlistName} numberOfLines={2}>{playlist.name}</Text>
            {playlist.description ? (
              <Text style={styles.description}>{playlist.description}</Text>
            ) : null}
            
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{playlist.tracks.length} tracks</Text>
              <View style={styles.metaDivider} />
              <Text style={styles.metaText}>{Math.round(playlist.metadata?.matchRate || 100)}% Match</Text>
            </View>
          </Animated.View>

          {/* Primary Action Row */}
          <View style={styles.actionRow}>
            
            <View style={styles.sideActions}>
              <TouchableOpacity onPress={handleToggleSave} style={styles.sideBtn}>
                <Heart size={22} color={isSaved ? "#ef4444" : "#fff"} fill={isSaved ? "#ef4444" : "transparent"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.sideBtn}>
                <Share2 size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onRegenerate} style={styles.sideBtn}>
                <RotateCcw size={22} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity onPress={handlePlayAll} style={styles.mainPlayBtn} activeOpacity={0.8}>
              <Play size={24} color="#000" fill="#000" />
              {/* <Text style={styles.playText}>Play All</Text> */}
            </TouchableOpacity>
            </View>
          </View>

          {/* Track List Header (Sticky) */}
          <View style={styles.trackListHeader}>
            <Text style={styles.trackListTitle}>Tracks</Text>
            {playlist.vibe && (
              <View style={styles.vibeTag}>
                <Text style={styles.vibeText}>{playlist.vibe.toUpperCase()}</Text>
              </View>
            )}
          </View>

          {/* Track List Contents */}
          <View style={styles.trackList}>
            {displayedTracks.map((track: any, index: number) => (
              <TrackRow
                key={track.externalId || index}
                track={track}
                index={index}
                onPlay={() => handlePlayTrack(track, index)}
              />
            ))}
          </View>

          {!showAllTracks && playlist.tracks.length > 10 && (
            <TouchableOpacity onPress={() => setShowAllTracks(true)} style={styles.showMoreBtn}>
              <Text style={styles.showMoreText}>View all {playlist.tracks.length} songs</Text>
              <ChevronDown size={16} color="#71717a" />
            </TouchableOpacity>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 10,
  },
  coverSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  coverMosaic: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#18181b',
  },
  coverTile: {
    width: COVER_SIZE / 2,
    height: COVER_SIZE / 2,
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: COVER_SIZE * 0.5,
  },
  infoSection: {
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  playlistName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 10,
  },
  description: {
    color: '#a1a1aa',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaText: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: '600',
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#27272a',
  },
  actionRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  mainPlayBtn: {
    // flex: 1,
    // flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    height: 50,
    width: 50,
    borderRadius: 28,
    gap: 10,
  },
  playText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
  sideActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#000',
  },
  trackListTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  vibeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#18181b',
  },
  vibeText: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  trackList: {
    paddingHorizontal: 12,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 14,
  },
  trackImage: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#18181b',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  trackArtist: {
    color: '#71717a',
    fontSize: 13,
  },
  trackDuration: {
    color: '#3f3f46',
    fontSize: 12,
    fontWeight: '500',
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  showMoreText: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: '600',
  },
});