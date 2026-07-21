// components/CollectionOptions.tsx
import ConfirmationModal from '@/components/modals/ConfirmationModal';
import * as Sentry from '@sentry/react-native';
import EditPlaylistModal from '@/components/modals/EditPlaylistModal';
import Colors from '@/constants/Colors';
import { useDownloadStore } from '@/stores/useDownloadStore';
import { usePlayerUIStore } from '@/stores/usePlayerUIStore';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { useSavedItemsStore } from '@/stores/useSavedItemsStore';
import { useUser } from '@clerk/clerk-expo';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
    Disc,
    ListMusic,
    Pencil,
    Share2,
    User
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BottomSheet from './BottomSheet';
import { DownloadStateIcon } from './DownloadedIcon';
import SaveStateIcon from './SaveStateIcon';

export type CollectionType = 'album' | 'playlist' | 'artist';

export interface CollectionOptionsRef {
    open: (item: any, type: CollectionType) => void;
    close: () => void;
}

interface CollectionOptionsProps {
    item?: any;
    type?: CollectionType;
    trigger?: React.ReactNode;
}

const CollectionOptions = React.forwardRef<CollectionOptionsRef, CollectionOptionsProps>(({ item: initialItem, type: initialType, trigger }, ref) => {
    const router = useRouter();
    const { user } = useUser();
    const [visible, setVisible] = useState(false);
    const [activeItem, setActiveItem] = useState<any>(initialItem);
    const [activeType, setActiveType] = useState<CollectionType | undefined>(initialType);

    const { isItemSaved, toggleSaveItem } = useSavedItemsStore();
    const { downloadAlbum, downloadPlaylist, downloadedAlbums, downloadedPlaylists } = useDownloadStore();
    const { setArtistModalVisible } = usePlayerUIStore();
    const { deletePlaylist, updatePlaylist } = usePlaylistStore();
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

    const currentItem = activeItem || initialItem;
    const currentType = activeType || initialType;

    const handleCloseModal = useCallback(() => {
        setVisible(false);
    }, []);

    React.useImperativeHandle(ref, () => ({
        open: (newItem: any, newType: CollectionType) => {
            setActiveItem(newItem);
            setActiveType(newType);
            setVisible(true);
        },
        close: handleCloseModal
    }));

    if (!currentItem || !currentType) return null;

    const externalId = currentItem.externalId || currentItem.id || currentItem._id;
    const isSaved = isItemSaved(externalId);
    const isDownloaded = currentType === 'album' ? !!downloadedAlbums[externalId] : (currentType === 'playlist' ? !!downloadedPlaylists[externalId] : false);
    const isOwner = currentType === 'playlist' && (currentItem.isLocal === true || (currentItem.userId === user?.id && !!user?.id && !currentItem.externalId && currentItem.source !== 'vibra'));

    const handleShare = async () => {
        handleCloseModal();
        try {
            const cleanId = String(externalId).replace(/^(jiosaavn_track_|jiosaavn_album_|jiosaavn_playlist_|jiosaavn_artist_)/, '');
            let url = '';
            if (currentType === 'album') url = `https://vibra-969f.onrender.com/album/${cleanId}`;
            else if (currentType === 'playlist') url = `https://vibra-969f.onrender.com/playlist/external/jiosaavn/${cleanId}`;
            else if (currentType === 'artist') url = `https://vibra-969f.onrender.com/artist/${cleanId}`;

            const message = `Check out this ${currentType} "${currentItem.title || currentItem.name}" on Vibra!\n\nListen here: ${url}`;
            await Share.share({
                message,
                title: currentItem.title || currentItem.name,
            });
        } catch (error) {
            Sentry.captureException(error);
        }
    };

    const handleToggleSave = async () => {
        await toggleSaveItem({
            ...currentItem,
            externalId,
            type: currentType
        });
    };

    const handleDownload = async () => {
        if (currentType === 'artist') return;
        
        if (isDownloaded) {
            return;
        }

        handleCloseModal();
        if (currentType === 'album') {
            await downloadAlbum(currentItem, currentItem.songs || []);
        } else {
            await downloadPlaylist(currentItem, currentItem.songs || []);
        }
    };

    const handleDeletePlaylist = () => {
        if (!isOwner) return;
        setIsDeleteModalVisible(true);
    };

    const confirmDelete = async () => {
        setIsDeleteModalVisible(false);
        handleCloseModal();
        try {
            await deletePlaylist(externalId);
            if (router.canGoBack()) router.back();
        } catch (error) {
            // Error handled by store
        }
    };

    const menuItems = [
        { 
            label: isSaved ? 'In Library' : 'Save to Library', 
            icon: () => null, 
            onPress: handleToggleSave,
            show: currentType !== 'artist' && !isOwner,
            special: 'save',
            active: isSaved
        },
        { 
            label: isDownloaded ? 'Downloaded' : 'Download', 
            icon: () => null, 
            onPress: handleDownload,
            show: currentType !== 'artist',
            special: 'download',
            active: isDownloaded
        },
        { label: 'Share', icon: Share2, onPress: handleShare, show: true },
        { label: 'Edit Details', icon: Pencil, onPress: () => { handleCloseModal(); setIsEditModalVisible(true); }, show: isOwner },
        { 
            label: 'Go to Artist', 
            icon: User, 
            onPress: () => { 
                handleCloseModal(); 
                if (currentItem.artistId) {
                    router.push(`/artist/${currentItem.artistId}` as any);
                } else {
                    setArtistModalVisible(true);
                }
            }, 
            show: currentType === 'album' || currentType === 'playlist'
        },
    ].filter(item => item.show);

    const Header = (
        <View style={styles.header}>
            <View style={[
                styles.artworkContainer,
                currentType === 'artist' && { borderRadius: 24 }
            ]}>
                {currentItem.imageUrl || currentItem.artwork ? (
                    <Image
                        source={{ uri: currentItem.imageUrl || currentItem.artwork }}
                        style={styles.artwork}
                        contentFit="cover"
                        transition={200}
                    />
                ) : (
                    <View style={styles.artworkPlaceholder}>
                        {currentType === 'album' ? (
                            <Disc size={24} color={Colors.textMuted} />
                        ) : currentType === 'artist' ? (
                            <User size={24} color={Colors.textMuted} />
                        ) : (
                            <ListMusic size={24} color={Colors.textMuted} />
                        )}
                    </View>
                )}
            </View>
            <View style={styles.headerText}>
                <Text style={styles.title} numberOfLines={1}>{currentItem.title || currentItem.name}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                    {currentType === 'artist' ? (
                        'Artist'
                    ) : (
                        currentType.charAt(0).toUpperCase() + currentType.slice(1) + ' • ' + (
                            currentType === 'album' ? (currentItem.artist || 'Unknown Artist') :
                            (isOwner ? 'By You' : 'By Vibra')
                        )
                    )}
                </Text>
            </View>
        </View>
    );

    return (
        <>
            {trigger && (
                <TouchableOpacity onPress={() => setVisible(true)} style={styles.triggerBtn}>
                    {trigger}
                </TouchableOpacity>
            )}

            <BottomSheet
                isOpen={visible}
                onClose={handleCloseModal}
                snapPoints={['55%']}
                header={Header}
            >
                <View style={styles.menuContainer}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => item.onPress()}
                            style={styles.menuItem}
                            activeOpacity={0.7}
                        >
                            <View style={styles.iconWrapper}>
                                {item.special === 'save' ? (
                                    <SaveStateIcon
                                        variant="small"
                                        isSaved={item.active}
                                        outlineColor={Colors.textSecondary}
                                        checkmarkColor="black"
                                    />
                                ) : item.special === 'download' ? (
                                    <DownloadStateIcon
                                        variant="small"
                                        status={item.active ? 'downloaded' : 'idle'}
                                        color={Colors.textSecondary}
                                        accentColor={Colors.accent}
                                    />
                                ) : (
                                    <item.icon
                                        size={22}
                                        color={(item as any).color || Colors.textSecondary}
                                        strokeWidth={2.2}
                                    />
                                )}
                            </View>
                            <Text style={[
                                styles.menuLabel,
                                item.active && item.special !== 'save' && item.special !== 'download' && { color: Colors.accent }
                            ]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </BottomSheet>

            <EditPlaylistModal
                visible={isEditModalVisible}
                onClose={() => setIsEditModalVisible(false)}
                onSave={async (name, desc) => {
                    try {
                        await updatePlaylist(externalId, name, desc);
                    } catch (error) {
                        // Error handled by store
                    }
                }}
                initialName={currentItem.name || currentItem.title || ""}
                initialDescription={currentItem.description || ""}
                initialImageUrl={currentItem.imageUrl || (currentItem.songs?.[0]?.imageUrl)}
                onDelete={handleDeletePlaylist}
            />

            <ConfirmationModal
                visible={isDeleteModalVisible}
                title="Delete Playlist"
                message={`Are you sure you want to delete "${currentItem.name || currentItem.title}"? This action cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalVisible(false)}
                isDestructive
            />
        </>
    );
});

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
    },
    artworkContainer: {
        width: 48,
        height: 48,
        borderRadius: 4,
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
        marginLeft: 14,
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
    subtitle: {
        color: Colors.whiteAlpha40,
        fontSize: 11,
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
    saveIconBox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuLabel: {
        color: '#e2e2e2',
        fontSize: 15.5,
        fontWeight: '500',
        marginLeft: 10,
    },
    triggerBtn: {
        padding: 8,
        marginRight: -8,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default CollectionOptions;
