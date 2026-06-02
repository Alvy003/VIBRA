// components/GlobalSongOptionsHost.tsx
//
// Mounts ONCE at root layout level. All list rows trigger openSongOptions(track)
// which sets state here. This eliminates per-row BottomSheet instantiation.
//
import React, { useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, Share } from 'react-native';
import {
    Heart,
    Share2,
    Music,
    User,
    CircleArrowDown,
    Loader2,
    CirclePlus,
    Mic2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { useDownloadStore } from '@/stores/useDownloadStore';
import { usePlayerUIStore } from '@/stores/usePlayerUIStore';
import { SharpAddQueue, QueueIcon } from './SharpIcons';
import { DownloadedIcon } from './DownloadedIcon';
import AddTrackBottomSheet, { AddTrackBottomSheetRef } from './AddTrackBottomSheet';
import BottomSheet from './BottomSheet';
import Colors from '@/constants/Colors';

// Fine-grained selectors — this component only re-renders when the modal
// visibility or the selected track changes, not on every player state update.
const useIsSongOptionsVisible = () => usePlayerUIStore(s => s.isSongOptionsVisible);
const useSelectedSongForOptions = () => usePlayerUIStore(s => s.selectedSongForOptions);
const useCloseSongOptions = () => usePlayerUIStore(s => s.closeSongOptions);

export const GlobalSongOptionsHost = React.memo(() => {
    const isVisible = useIsSongOptionsVisible();
    const song = useSelectedSongForOptions();
    const closeSongOptions = useCloseSongOptions();

    const addTrackSheetRef = useRef<AddTrackBottomSheetRef>(null);

    // Actions — accessed via getState() inside callbacks so they never cause
    // this component to re-render when the player store changes.
    const handleClose = useCallback(() => {
        closeSongOptions();
    }, [closeSongOptions]);

    const handleShare = useCallback(async () => {
        if (!song) return;
        handleClose();
        try {
            const songId = song.id || song.externalId || song._id;
            const cleanId = songId.replace(/^(jiosaavn_track_|jiosaavn_album_|jiosaavn_playlist_)/, '');
            const message = `Check out "${song.title}" by ${song.artist} on Vibra!\n\nListen here: https://vibra-969f.onrender.com/track/${cleanId}`;
            await Share.share({ message, title: song.title });
        } catch (error) {
            console.error('[GlobalSongOptionsHost] Share error:', error);
        }
    }, [song, handleClose]);

    const handlePlayNext = useCallback(() => {
        if (!song) return;
        const songId = song.id || song.externalId || song._id;
        usePlayerStore.getState().setPlayNext({
            id: songId,
            url: song.streamUrl || song.audioUrl,
            title: song.title,
            artist: song.artist,
            artwork: song.imageUrl || song.artwork,
            source: song.source || 'jiosaavn',
        });
        handleClose();
    }, [song, handleClose]);

    const handleAddToQueue = useCallback(() => {
        if (!song) return;
        const songId = song.id || song.externalId || song._id;
        usePlayerStore.getState().addToQueue({
            id: songId,
            url: song.streamUrl || song.audioUrl,
            title: song.title,
            artist: song.artist,
            artwork: song.imageUrl || song.artwork,
            source: song.source || 'jiosaavn',
        });
        handleClose();
    }, [song, handleClose]);

    const handleDownload = useCallback(async () => {
        if (!song) return;
        const songId = song.id || song.externalId || song._id;
        const { isDownloaded, removeDownload, downloadTrack } = useDownloadStore.getState();
        const downloaded = isDownloaded(songId);
        if (downloaded) {
            Alert.alert(
                'Remove Download',
                'Are you sure you want to delete this track from your device?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Remove', style: 'destructive', onPress: () => {
                            removeDownload(songId);
                            handleClose();
                        }
                    },
                ]
            );
        } else {
            handleClose();
            await downloadTrack(song);
        }
    }, [song, handleClose]);

    const handleToggleLike = useCallback(() => {
        if (!song) return;
        useMusicStore.getState().toggleLikeSong(song);
    }, [song]);

    const handleAddToPlaylist = useCallback(() => {
        handleClose();
        addTrackSheetRef.current?.open(song);
    }, [song, handleClose]);

    const handleGoToQueue = useCallback(() => {
        handleClose();
        usePlayerUIStore.getState().setQueueVisible(true);
    }, [handleClose]);

    const handleShowLyrics = useCallback(() => {
        handleClose();
        usePlayerUIStore.getState().setLyricsModalVisible(true);
    }, [handleClose]);

    const handleGoToArtist = useCallback(() => {
        handleClose();
        usePlayerUIStore.getState().setArtistModalVisible(true);
    }, [handleClose]);

    // Derive reactive download/like state only when sheet is open to avoid
    // subscribing this component when the sheet is hidden.
    const songId = song ? (song.id || song.externalId || song._id) : null;
    const isDownloading = useDownloadStore(s => songId ? !!s.isDownloading[songId] : false);
    const isDownloaded = useDownloadStore(s => songId ? !!s.downloadedSongs[songId] : false);
    const isLiked = useMusicStore(s => song ? s.isSongLiked(song) : false);

    if (!song) return null;

    const menuItems = [
        {
            icon: Share2,
            label: 'Share',
            onPress: handleShare,
            size: 21,
        },
        {
            icon: Heart,
            label: isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs',
            onPress: handleToggleLike,
            active: isLiked,
            special: 'like' as const,
            size: 21,
        },
        {
            icon: CirclePlus,
            label: 'Add to playlist',
            onPress: handleAddToPlaylist,
            size: 21,
        },
        {
            icon: isDownloaded ? DownloadedIcon : (isDownloading ? Loader2 : CircleArrowDown),
            label: isDownloaded ? 'Downloaded' : (isDownloading ? 'Downloading...' : 'Download'),
            onPress: handleDownload,
            active: isDownloaded,
            loading: isDownloading,
            color: isDownloaded ? Colors.accent : 'rgba(209, 205, 205, 0.79)',
            size: isDownloaded ? 20 : 21,
        },
        {
            icon: SharpAddQueue,
            label: 'Add to Queue',
            onPress: handleAddToQueue,
            size: 20,
        },
        {
            icon: QueueIcon,
            label: 'Go to Queue',
            onPress: handleGoToQueue,
            size: 20,
        },
        {
            icon: Mic2,
            label: 'Lyrics',
            onPress: handleShowLyrics,
            size: 21,
        },
        {
            icon: User,
            label: 'Go to artist',
            onPress: handleGoToArtist,
            size: 21,
        },
    ];

    const Header = (
        <View style={styles.header}>
            <View style={styles.artworkContainer}>
                {song.imageUrl || song.artwork ? (
                    <Image
                        source={{ uri: song.imageUrl || song.artwork }}
                        style={styles.artwork}
                    />
                ) : (
                    <View style={styles.artworkPlaceholder}>
                        <Music size={24} color="#52525b" />
                    </View>
                )}
            </View>
            <View style={styles.headerText}>
                <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
                <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
            </View>
        </View>
    );

    return (
        <>
            <BottomSheet
                isOpen={isVisible}
                onClose={handleClose}
                snapPoints={['60%']}
                header={Header}
            >
                <View style={styles.menuContainer}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => item.onPress()}
                            disabled={item.loading}
                            style={styles.menuItem}
                            activeOpacity={0.7}
                        >
                            <View style={styles.iconWrapper}>
                                {item.special === 'like' ? (
                                    <LinearGradient
                                        colors={item.active ? [Colors.primaryDark, Colors.accent] : [Colors.border, Colors.surface]}
                                        style={styles.likedIconBox}
                                    >
                                        <item.icon
                                            size={14}
                                            strokeWidth={item.active ? 2 : 2.5}
                                            color={item.active ? 'white' : 'rgba(209, 205, 205, 0.79)'}
                                            fill={item.active ? 'white' : 'transparent'}
                                        />
                                    </LinearGradient>
                                ) : (
                                    <item.icon
                                        size={item.size || 22}
                                        color={item.color || 'rgba(209, 205, 205, 0.79)'}
                                        strokeWidth={2.2}
                                    />
                                )}
                            </View>
                            <Text style={[
                                styles.menuLabel,
                                item.active && { color: item.special === 'like' ? '#fff' : Colors.accent }
                            ]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </BottomSheet>

            <AddTrackBottomSheet ref={addTrackSheetRef} />
        </>
    );
});

GlobalSongOptionsHost.displayName = 'GlobalSongOptionsHost';

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
    },
    artworkContainer: {
        width: 45,
        height: 45,
        borderRadius: 4,
        backgroundColor: Colors.surface,
        overflow: 'hidden',
    },
    artwork: {
        width: '100%',
        height: '100%',
    },
    artworkPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    likedIconBox: {
        width: 24,
        height: 24,
        borderRadius: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        marginLeft: 14,
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
    artist: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    menuContainer: {
        paddingHorizontal: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    iconWrapper: {
        width: 32,
        alignItems: 'center',
    },
    menuLabel: {
        color: '#e2e2e2',
        fontSize: 15.5,
        fontWeight: '500',
        marginLeft: 8,
    },
});
