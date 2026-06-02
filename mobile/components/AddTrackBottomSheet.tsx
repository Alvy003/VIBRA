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
    BottomSheetFlatList,
    BottomSheetTextInput,
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
import BottomSheet from './BottomSheet';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';

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
                setIsSheetOpen(true);
            },
            close: () => {
                setIsSheetOpen(false);
            }
        }));

        // Handle Back button on Android
        React.useEffect(() => {
            const backAction = () => {
                if (isSheetOpen) {
                    setIsSheetOpen(false);
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

        const snapPoints = useMemo(() => ['96.5%'], []);
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

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
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
            } catch (error) {
                console.error("Failed to create and add to playlist", error);
            }
        };

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
                                <Music size={24} color={Colors.textMuted} />
                            </View>
                        )}
                    </View>
                    <View style={styles.playlistInfo}>
                        <Text style={styles.playlistName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.playlistCount}>{item.songs?.length || 0} songs</Text>
                    </View>
                    <View style={[styles.checkCircle, inPlaylist && styles.checkCircleActive]}>
                        {inPlaylist ? (
                            <Check size={16} color={Colors.surfaceLighter} strokeWidth={3} />
                        ) : (
                            <Plus size={16} color={Colors.textMuted} strokeWidth={2} />
                        )}
                    </View>
                </TouchableOpacity>
            );
        };

        return (
            <BottomSheet
                isOpen={isSheetOpen}
                onClose={() => {
                    setIsSheetOpen(false);
                    onClose?.();
                }}
                snapPoints={snapPoints}
                enablePanDownToClose={true}
                enableContentPanningGesture={true}
                onIndexChange={handleSheetChanges}
                backgroundColor={Colors.background}
                showHandle={true}
            >
                <View style={styles.stickyHeader}>
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
                            <Search size={18} color={Colors.textMuted} style={styles.searchIcon} />
                            <BottomSheetTextInput
                                style={styles.searchInput}
                                placeholder="Find playlist"
                                placeholderTextColor={Colors.textMuted}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                selectionColor={Colors.accent}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <X size={18} color={Colors.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>

                <BottomSheetFlatList
                    data={filteredPlaylists}
                    keyExtractor={(item: any) => item._id}
                    renderItem={renderItem}
                    extraData={[playlists, likedSongs, targetTrack]}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={
                        <View style={styles.headerContainer}>
                            {/* Liked Songs Item */}
                            <TouchableOpacity
                                style={styles.playlistItem}
                                onPress={handleToggleLike}
                                activeOpacity={0.7}
                            >
                                <LinearGradient
                                    colors={[Colors.primaryDark, Colors.accent]}
                                    style={styles.likedSongsIcon}
                                >
                                    <Heart size={20} color={Colors.white} fill={Colors.white} />
                                </LinearGradient>
                                <View style={styles.playlistInfo}>
                                    <Text style={styles.playlistName}>Liked Songs</Text>
                                    <Text style={styles.playlistCount}>{likedSongs.length} songs</Text>
                                </View>
                                <View style={[styles.checkCircle, isLiked && styles.checkCircleActive]}>
                                    {isLiked ? (
                                        <Check size={16} color={Colors.surfaceLighter} strokeWidth={3} />
                                    ) : (
                                        <Plus size={16} color={Colors.textMuted} strokeWidth={2} />
                                    )}
                                </View>
                            </TouchableOpacity>
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
            </BottomSheet>
        );
    }
);

AddTrackBottomSheet.displayName = 'AddTrackBottomSheet';

const styles = StyleSheet.create({
    headerContainer: {
        // No padding here to avoid double padding on list items
    },
    stickyHeader: {
        backgroundColor: Colors.background,
        paddingTop: 8,
        zIndex: 10,
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
        color: Colors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
    },
    newPlaylistButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    newPlaylistText: {
        color: Colors.accent,
        fontSize: 11,
        fontWeight: '600',
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
        backgroundColor: Colors.surfaceLighter,
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
        color: Colors.textPrimary,
        fontSize: 13,
        fontWeight: '600',
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
        borderRadius: 2,
        backgroundColor: Colors.surfaceLighter,
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
        borderRadius: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    playlistInfo: {
        flex: 1,
    },
    playlistName: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '400',
    },
    playlistCount: {
        color: Colors.textMuted,
        fontSize: 12,
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
        backgroundColor: Colors.accent,
        borderColor: Colors.accent,
    },
    emptyContainer: {
        paddingTop: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: Colors.textMuted,
        fontSize: 16,
    },
});

export default AddTrackBottomSheet;
