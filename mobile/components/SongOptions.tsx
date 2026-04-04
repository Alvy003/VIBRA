// components/SongOptions.tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, Alert } from 'react-native';
import { 
    BottomSheetModal, 
    BottomSheetView, 
    BottomSheetBackdrop,
    BottomSheetFooter
} from '@gorhom/bottom-sheet';
import { 
    MoreVertical, 
    ListPlus, 
    Heart, 
    Share2, 
    ListStart, 
    ListEnd, 
    Download, 
    CheckCircle2, 
    Loader2, 
    Music,
    X
} from 'lucide-react-native';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { useDownloadStore } from '@/stores/useDownloadStore';
import PlaylistPicker from './PlaylistPicker';
import * as Haptics from 'expo-haptics';

interface SongOptionsProps {
    song: any;
    trigger?: React.ReactNode;
}

export default function SongOptions({ song, trigger }: SongOptionsProps) {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const [pickerVisible, setPickerVisible] = useState(false);
    
    const { addToQueue, setPlayNext } = usePlayerStore();
    const { addTrackToPlaylist } = usePlaylistStore();
    const { downloadTrack, isDownloaded, isDownloading, removeDownload } = useDownloadStore();

    const songId = song.id || song.externalId || song._id;
    const downloaded = isDownloaded(songId);
    const downloading = isDownloading[songId];

    // Snap points for the bottom sheet
    const snapPoints = useMemo(() => ['55%'], []);

    const handlePresentModalPress = useCallback(() => {
        bottomSheetModalRef.current?.present();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const handleCloseModal = useCallback(() => {
        bottomSheetModalRef.current?.dismiss();
    }, []);

    const handlePlayNext = () => {
        const track = {
            id: songId,
            url: song.streamUrl || song.audioUrl,
            title: song.title,
            artist: song.artist,
            artwork: song.imageUrl || song.artwork,
            source: song.source || 'jiosaavn'
        };
        setPlayNext(track);
        handleCloseModal();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleAddToQueue = () => {
        const track = {
            id: songId,
            url: song.streamUrl || song.audioUrl,
            title: song.title,
            artist: song.artist,
            artwork: song.imageUrl || song.artwork,
            source: song.source || 'jiosaavn'
        };
        addToQueue(track);
        handleCloseModal();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleAddToPlaylist = (playlistId: string) => {
        addTrackToPlaylist(playlistId, song)
            .then(() => {
                setPickerVisible(false);
                handleCloseModal();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            })
            .catch(err => {
                // Error handled in store/logging
            });
    };

    const handleDownload = async () => {
        if (downloaded) {
            Alert.alert(
                "Remove Download",
                "Are you sure you want to delete this track from your device?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Remove", style: "destructive", onPress: () => {
                        removeDownload(songId);
                        handleCloseModal();
                    } }
                ]
            );
        } else {
            handleCloseModal();
            await downloadTrack(song);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        []
    );

    const menuItems = [
        { icon: ListStart, label: 'Play Next', onPress: handlePlayNext },
        { icon: ListEnd, label: 'Add to Queue', onPress: handleAddToQueue },
        { 
            icon: downloaded ? CheckCircle2 : (downloading ? Loader2 : Download), 
            label: downloaded ? 'Downloaded' : (downloading ? 'Downloading...' : 'Download'), 
            onPress: handleDownload,
            active: downloaded,
            loading: downloading,
            color: downloaded ? '#8B5CF6' : '#d1cdcdff'
        },
        { icon: ListPlus, label: 'Add to Playlist', onPress: () => {
            setPickerVisible(true);
        } },
        { icon: Share2, label: 'Share', onPress: () => { } },
    ];

    return (
        <>
            <TouchableOpacity onPress={handlePresentModalPress}>
                {trigger || <MoreVertical size={20} color="#b3b3b3" />}
            </TouchableOpacity>

            <BottomSheetModal
                ref={bottomSheetModalRef}
                index={0}
                snapPoints={snapPoints}
                backdropComponent={renderBackdrop}
                backgroundStyle={{ backgroundColor: '#121212' }}
                handleIndicatorStyle={{ backgroundColor: '#404040', width: 40 }}
            >
                <BottomSheetView style={styles.contentContainer}>
                    {/* Header */}
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

                    {/* Menu Items */}
                    <View style={styles.menuContainer}>
                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={item.onPress}
                                disabled={item.loading}
                                style={styles.menuItem}
                                activeOpacity={0.6}
                            >
                                <View style={styles.iconWrapper}>
                                    <item.icon 
                                        size={22} 
                                        color={item.color || "#d1cdcdff"} 
                                    />
                                </View>
                                <Text style={[
                                    styles.menuLabel,
                                    item.active && { color: '#A78BFA' }
                                ]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </BottomSheetView>
            </BottomSheetModal>

            <PlaylistPicker 
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelect={handleAddToPlaylist}
            />
        </>
    );
}

const styles = StyleSheet.create({
    contentContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#262626',
        marginBottom: 8,
    },
    artworkContainer: {
        width: 50,
        height: 50,
        borderRadius: 6,
        backgroundColor: '#1a1a1a',
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
    headerText: {
        marginLeft: 16,
        flex: 1,
    },
    title: {
        color: 'white',
        fontSize: 15,
        fontWeight: '700',
    },
    artist: {
        color: '#a3a3a3',
        fontSize: 12,
        marginTop: 2,
    },
    menuContainer: {
        marginTop: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
    },
    iconWrapper: {
        width: 32,
        alignItems: 'center',
    },
    menuLabel: {
        color: '#e6e6e6ff',
        fontSize: 15,
        fontWeight: '500',
        marginLeft: 12,
    },
});
