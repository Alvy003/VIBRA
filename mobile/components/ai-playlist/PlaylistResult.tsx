// components/ai-playlist/PlaylistResult.tsx
import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  RotateCcw,
  CirclePlus,
  Check,
  CircleMinus,
} from 'lucide-react-native';
import BottomSheet from '../BottomSheet';
import { SharpPlay } from '@/components/SharpIcons';
import { useSavedItemsStore } from '@/stores/useSavedItemsStore';
import { TrackListItem } from '@/components/TrackListItem';
import * as Haptics from 'expo-haptics';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAIPlaylistStore } from '@/stores/useAIPlaylistStore';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import Colors from '@/constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PlaylistResultProps {
  visible: boolean;
  playlist: any;
  onClose: () => void;
  onRegenerate: () => void;
  onSave?: (save: boolean) => void;
  onUpdateTracks?: (tracks: any[]) => void;
}

export const PlaylistResult = React.memo(({
  visible,
  playlist,
  onClose,
  onRegenerate,
  onSave,
  onUpdateTracks,
}: PlaylistResultProps) => {
  if (!playlist) return null;

  const isItemSaved = useSavedItemsStore(s => s.isItemSaved);
  const isCurrentlySaved = isItemSaved(playlist._id);
  const [isSaved, setIsSaved] = useState(isCurrentlySaved);
  const [localTracks, setLocalTracks] = useState(() => playlist.tracks || []);
  const insets = useSafeAreaInsets();

  const initializeQueue = usePlayerStore((s) => s.initializeQueue);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const { toggleSave } = useAIPlaylistStore();

  // Sync isSaved state if store changes or playlist changes
  useEffect(() => {
    setIsSaved(isCurrentlySaved);
  }, [isCurrentlySaved, playlist._id]);

  // Sync local tracks when playlist prop changes (e.g. initial load or regeneration)
  useEffect(() => {
    setLocalTracks(playlist.tracks || []);
  }, [playlist.tracks, playlist._id]);

  const handlePlayAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const tracks = localTracks.map((track: any) => ({
      id: track.externalId || track._id,
      title: track.title,
      artist: track.artist,
      artwork: track.imageUrl || playlist.coverArt,
      url: track.streamUrl,
      duration: track.duration,
      source: track.source,
    }));
    if (tracks.length > 0) initializeQueue(tracks, 0);
  }, [localTracks, playlist.coverArt, initializeQueue]);

  const handleRemoveTrack = useCallback((trackId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = localTracks.filter((t: any) => (t.externalId || t._id) !== trackId);
    setLocalTracks(updated);
    onUpdateTracks?.(updated);
  }, [localTracks, onUpdateTracks]);

  const handleToggleSave = async () => {
    const nextSaved = !isSaved;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaved(nextSaved);

    try {
      if (playlist._id) {
        await toggleSave(playlist._id, nextSaved);
        await useSavedItemsStore.getState().fetchSavedItems();
      }
      onSave?.(nextSaved);
    } catch (err) {
      console.error('Save error:', err);
      setIsSaved(!nextSaved);
    }
  };

  const renderTrackItem = useCallback(({ item: song, index }: { item: any, index: number }) => (
    <View style={styles.trackContainer}>
      <TrackListItem
        track={song}
        index={index}
        isCurrent={currentTrack?.id === (song._id || song.id || song.externalId)}
        hideOptions
        style={{ flex: 1 }}
        onPress={() => {
          const tracks = localTracks.map((t: any) => ({
            id: t.externalId || t._id,
            title: t.title,
            artist: t.artist,
            artwork: t.imageUrl || playlist.coverArt,
            url: t.streamUrl,
            duration: t.duration,
            source: t.source,
          }));
          initializeQueue(tracks, index);
        }}
        playlistImageUrl={playlist.coverArt}
      />
      <TouchableOpacity
        onPress={() => handleRemoveTrack(song.externalId || song._id)}
        style={styles.removeBtn}
      >
        <CircleMinus size={22} color="#71717a" />
      </TouchableOpacity>
    </View>
  ), [currentTrack?.id, playlist.coverArt, localTracks, initializeQueue, handleRemoveTrack]);

  return (
    <BottomSheet
      isOpen={visible}
      onClose={onClose}
      snapPoints={['65%', '96.5%']}
      backgroundColor="#121212"
      showHandle
    >
      <View style={styles.sheetContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{playlist.name || 'AI Playlist'}</Text>
            <Text style={styles.subtitle}>{localTracks.length} songs</Text>
          </View>
          
          <View style={styles.headerActions}>
            {/* <TouchableOpacity onPress={onRegenerate} activeOpacity={0.7} style={styles.actionCircle}>
              <RotateCcw size={20} color="#fff" />
            </TouchableOpacity> */}

            <TouchableOpacity onPress={handleToggleSave} activeOpacity={0.7} style={styles.actionCircle}>
              {isSaved ? (
                <View style={[styles.savedBadge, { backgroundColor: Colors.accent }]}>
                  <Check size={14} color="black" strokeWidth={4} />
                </View>
              ) : (
                <CirclePlus size={24} color="#b3b3b3" />
              )}
            </TouchableOpacity>
{/* 
            <TouchableOpacity
              onPress={handlePlayAll}
              style={[styles.playButton, { backgroundColor: ACCENT_COLOR }]}
              activeOpacity={0.8}
            >
              <SharpPlay size={24} color="black" style={{ marginLeft: 2 }} />
            </TouchableOpacity> */}
          </View>
        </View>

        {/* Tracks List */}
        <View style={{ flex: 1 }}>
          <BottomSheetFlatList
            data={localTracks}
            renderItem={renderTrackItem}
            keyExtractor={(item: any) => item.externalId || item._id}
            contentContainerStyle={{ paddingBottom: 60 }}
            initialNumToRender={10}
            windowSize={11}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={30}
            removeClippedSubviews={true}
          />
        </View>
      </View>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  savedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
});

export default PlaylistResult;