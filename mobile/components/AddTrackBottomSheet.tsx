// components/AddTrackBottomSheet.tsx
import React, { useCallback, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Dimensions,
    BackHandler,
} from 'react-native';
import {
    BottomSheetModal,
    BottomSheetBackdrop,
    BottomSheetFlatList,
    BottomSheetTextInput,
    BottomSheetView
} from '@gorhom/bottom-sheet';
import {
    Plus,
    Music,
    X,
    Check,
    Search,
    Heart
} from 'lucide-react-native';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { useMusicStore } from '@/stores/useMusicStore';
import { resolveAssetUrl } from '@/lib/url';
import { CreatePlaylistModal } from './library/CreatePlaylistModal';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AddTrackBottomSheetProps {
    onClose?: () => void;
}

export interface AddTrackBottomSheetRef {
    open: (track: any) => void;
    close: () => void;
}

const AddTrackBottomSheet = forwardRef<AddTrackBottomSheetRef, AddTrackBottomSheetProps>(
    ({ onClose }, ref) => {
        const insets = useSafeAreaInsets();
        const bottomSheetModalRef = useRef<BottomSheetModal>(null);
        const { playlists, createPlaylist, addTrackToPlaylist, removeTrackFromPlaylist, fetchUserPlaylists } = usePlaylistStore();
        const { likedSongs, toggleLikeSong, isSongLiked, isSongMatch } = useMusicStore();

        const [targetTrack, setTargetTrack] = useState<any>(null);
        const [searchQuery, setSearchQuery] = useState('');
        const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
        const [isSheetOpen, setIsSheetOpen] = useState(false);

        useImperativeHandle(ref, () => ({
            open: (track: any) => {
                setTargetTrack(track);
                setSearchQuery('');
                setIsCreateModalVisible(false);
                fetchUserPlaylists();
                bottomSheetModalRef.current?.present();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            },
            close: () => {
                bottomSheetModalRef.current?.dismiss();
            }
        }));

        // Handle Back button on Android
        React.useEffect(() => {
            const backAction = () => {
                if (isSheetOpen) {
                    bottomSheetModalRef.current?.dismiss();
                    return true;
                }
                return false;
            };

            const backHandler = BackHandler.addEventListener(
                "hardwareBackPress",
                backAction
            );

            return () => backHandler.remove();
        }, [isSheetOpen]);

        const handleSheetChanges = useCallback((index: number) => {
            setIsSheetOpen(index >= 0);
        }, []);

        const snapPoints = useMemo(() => ['100%'], []);
        const topInset = insets.top;

        const filteredPlaylists = useMemo(() => {
            if (!searchQuery.trim()) return playlists;
            return playlists.filter(p =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }, [playlists, searchQuery]);

        const isLiked = isSongLiked(targetTrack);

        const handleToggleLike = async () => {
            if (!targetTrack) return;
            await toggleLikeSong(targetTrack);
        };

        const handleTogglePlaylist = async (playlist: any) => {
            if (!targetTrack) return;
            const inPlaylist = playlist.songs?.some((s: any) => isSongMatch(targetTrack, s));

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            try {
                if (inPlaylist) {
                    const idToRemove = targetTrack._id || targetTrack.externalId || targetTrack.id;
                    await removeTrackFromPlaylist(playlist._id, String(idToRemove));
                } else {
                    await addTrackToPlaylist(playlist._id, targetTrack);
                }
            } catch (error) {
                console.error("Failed to toggle playlist membership", error);
            }
        };

        const handleCreatePlaylist = async (name: string) => {
            if (!name.trim() || !targetTrack) return;
            try {
                const newPlaylist = await createPlaylist(name);
                await addTrackToPlaylist(newPlaylist._id, targetTrack);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
                console.error("Failed to create and add to playlist", error);
            }
        };

        const renderBackdrop = useCallback(
            (props: any) => (
                <BottomSheetBackdrop
                    {...props}
                    disappearsOnIndex={-1}
                    appearsOnIndex={0}
                    opacity={0.6}
                />
            ),
            []
        );

        const renderItem = ({ item }: { item: any }) => {
            const inPlaylist = item.songs?.some((s: any) => isSongMatch(targetTrack, s));

            const artworkUrl = item.imageUrl || (item.songs && item.songs[0]?.imageUrl);

            return (
                <TouchableOpacity
                    style={styles.playlistItem}
                    onPress={() => handleTogglePlaylist(item)}
                    activeOpacity={0.7}
                >
                    <View style={styles.playlistImageContainer}>
                        {artworkUrl ? (
                            <Image
                                source={{ uri: resolveAssetUrl(artworkUrl) }}
                                style={styles.playlistImage}
                            />
                        ) : (
                            <View style={styles.playlistPlaceholder}>
                                <Music size={24} color="#52525b" />
                            </View>
                        )}
                    </View>
                    <View style={styles.playlistInfo}>
                        <Text style={styles.playlistName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.playlistCount}>{item.songs?.length || 0} songs</Text>
                    </View>
                    <View style={[styles.checkCircle, inPlaylist && styles.checkCircleActive]}>
                        {inPlaylist ? (
                            <Check size={16} color="#18181b" strokeWidth={3} />
                        ) : (
                            <Plus size={16} color="#71717a" strokeWidth={2} />
                        )}
                    </View>
                </TouchableOpacity>
            );
        };

        return (
            <BottomSheetModal
                ref={bottomSheetModalRef}
                index={0}
                snapPoints={snapPoints}
                enablePanDownToClose={true}
                enableContentPanningGesture={true}
                topInset={topInset}
                backdropComponent={renderBackdrop}
                onDismiss={() => {
                    setIsSheetOpen(false);
                    onClose?.();
                }}
                onChange={handleSheetChanges}
                backgroundStyle={{ backgroundColor: '#09090b' }}
                handleIndicatorStyle={{ backgroundColor: '#3f3f46', width: 40 }}
            >
                <BottomSheetFlatList
                    data={filteredPlaylists}
                    keyExtractor={(item: any) => item._id}
                    renderItem={renderItem}
                    extraData={[playlists, likedSongs, targetTrack]}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={
                        <View style={styles.headerContainer}>
                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={styles.headerTitle}>Save in</Text>
                                <TouchableOpacity
                                    onPress={() => setIsCreateModalVisible(true)}
                                    style={styles.newPlaylistButton}
                                >
                                    <Text style={styles.newPlaylistText}>New playlist</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Search Bar */}
                            <View style={styles.searchContainer}>
                                <View style={styles.searchWrapper}>
                                    <Search size={18} color="#71717a" style={styles.searchIcon} />
                                    <BottomSheetTextInput
                                        style={styles.searchInput}
                                        placeholder="Find playlist"
                                        placeholderTextColor="#71717a"
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                                            <X size={18} color="#71717a" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {/* Create Modal is now separate */}

                            {/* Liked Songs Item */}
                            <TouchableOpacity
                                style={styles.playlistItem}
                                onPress={handleToggleLike}
                                activeOpacity={0.7}
                            >
                                <LinearGradient
                                    colors={['#7B2CF5', '#6D28D9']}
                                    style={styles.likedSongsIcon}
                                >
                                    <Heart size={20} color="white" fill="white" />
                                </LinearGradient>
                                <View style={styles.playlistInfo}>
                                    <Text style={styles.playlistName}>Liked Songs</Text>
                                    <Text style={styles.playlistCount}>{likedSongs.length} songs</Text>
                                </View>
                                <View style={[styles.checkCircle, isLiked && styles.checkCircleActive]}>
                                    {isLiked ? (
                                        <Check size={16} color="#18181b" strokeWidth={3} />
                                    ) : (
                                        <Plus size={16} color="#71717a" strokeWidth={2} />
                                    )}
                                </View>
                            </TouchableOpacity>
                            <View style={styles.divider} />
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No playlists found</Text>
                        </View>
                    }
                />
                <CreatePlaylistModal
                    visible={isCreateModalVisible}
                    onClose={() => setIsCreateModalVisible(false)}
                    onCreate={handleCreatePlaylist}
                />
            </BottomSheetModal>
        );
    }
);

AddTrackBottomSheet.displayName = 'AddTrackBottomSheet';

const styles = StyleSheet.create({
    headerContainer: {
        // No padding here to avoid double padding on list items
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    newPlaylistButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    newPlaylistText: {
        color: '#7B2CF5',
        fontSize: 11,
        fontWeight: '500',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    searchWrapper: {
        flex: 1,
        height: 35,
        backgroundColor: '#171718ff',
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: 'white',
        fontSize: 13,
        fontWeight: '800',
        padding: 0,
    },
    listContent: {
        paddingBottom: 40,
    },
    playlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    playlistImageContainer: {
        width: 52,
        height: 52,
        borderRadius: 4,
        backgroundColor: '#18181b',
        overflow: 'hidden',
        marginRight: 14,
    },
    playlistImage: {
        width: '100%',
        height: '100%',
    },
    playlistPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    likedSongsIcon: {
        width: 52,
        height: 52,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    playlistInfo: {
        flex: 1,
    },
    playlistName: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    playlistCount: {
        color: '#a1a1aa',
        fontSize: 13,
        marginTop: 2,
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#3f3f46',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkCircleActive: {
        backgroundColor: '#7B2CF5',
        borderColor: '#7B2CF5',
    },
    divider: {
        height: 1,
        backgroundColor: '#18181b',
        marginVertical: 12,
    },
    emptyContainer: {
        paddingTop: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#52525b',
        fontSize: 16,
    },
    createOverlay: {
        backgroundColor: '#18181b',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    createInput: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#3f3f46',
        marginBottom: 16,
    },
    createActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    cancelBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    cancelBtnText: {
        color: 'white',
        fontWeight: '600',
    },
    createBtn: {
        backgroundColor: '#7B2CF5',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    createBtnText: {
        color: 'white',
        fontWeight: '600',
    },
});

export default AddTrackBottomSheet;
