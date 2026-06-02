import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { useSavedItemsStore } from '@/stores/useSavedItemsStore';
import { useUser } from '@clerk/clerk-expo';
import { Plus, List as ListIcon, Search, Download, Music, Heart, LayoutGrid, ArrowUpDown, ArrowDown, User as UserIcon, X } from 'lucide-react-native';
import { resolveAssetUrl } from '@/lib/url';
import { useRouter } from 'expo-router';
import { useDownloadStore } from '@/stores/useDownloadStore';
import { RefreshControl } from 'react-native';
import { CreatePlaylistModal } from '@/components/library/CreatePlaylistModal';
import { DownloadedIcon } from '@/components/DownloadedIcon';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import { UserProfileIcon } from '@/components/UserProfileIcon';
import { LibraryPlusMenu } from '@/components/library/LibraryPlusMenu';
import CollectionOptions, { CollectionOptionsRef } from '@/components/CollectionOptions';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 40) / 2;

type LibraryFilter = "all" | "playlists" | "albums" | "artists";
type SubFilter = "by-you" | "by-vibra" | null;
type ViewMode = "list" | "grid";

const FilterChip = ({ label, isActive, onPress, showX = false }: { label: string, isActive: boolean, onPress: () => void, showX?: boolean }) => (
    <Animated.View entering={FadeIn.duration(200)}>
        <TouchableOpacity
            onPress={onPress}
            style={[styles.filterChip, isActive && styles.filterChipActive]}
            className="flex-row items-center"
        >
            <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{label}</Text>
        </TouchableOpacity>
    </Animated.View>
);

export default function LibraryScreen() {
    const { user } = useUser();
    const router = useRouter();
    const { albums, likedSongs, fetchLikedSongs } = useMusicStore();
    const { playlists, fetchUserPlaylists, createPlaylist } = usePlaylistStore();
    const { savedItems, fetchSavedItems } = useSavedItemsStore();
    const [filter, setFilter] = useState<LibraryFilter>("all");
    const [subFilter, setSubFilter] = useState<SubFilter>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [sortBy, setSortBy] = useState<"recents" | "name" | "artist">("recents");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isDownloadedFilterActive, setIsDownloadedFilterActive] = useState(false);
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
    const optionsRef = useRef<CollectionOptionsRef>(null);

    useEffect(() => {
        fetchUserPlaylists();
        fetchLikedSongs();
        fetchSavedItems();
    }, []);

    const { downloadedSongs, downloadedPlaylists, downloadedAlbums } = useDownloadStore();
    const downloadCount = Object.keys(downloadedSongs).length;

    const filteredData = useMemo(() => {
        const items: any[] = [];

        if (filter === 'all' || filter === 'playlists') {
            if (isDownloadedFilterActive) {
                items.push({
                    id: 'downloads',
                    type: 'special',
                    title: 'Downloads',
                    subtitle: `${downloadCount} tracks available offline`,
                    icon: ArrowDown,
                    gradient: ['#0f172a', '#1e293b', '#334155'],
                    onPress: () => router.push('/(tabs)/downloads?from=library' as any)
                });
            } else {
                items.push({
                    id: 'liked-songs',
                    type: 'special',
                    title: 'Liked Songs',
                    subtitle: `Playlist • ${likedSongs.length} songs`,
                    icon: Heart,
                    gradient: [Colors.primaryDark, Colors.accent],
                    onPress: () => router.push('/favorites?from=library' as any)
                });

                if (downloadCount > 0) {
                    items.push({
                        id: 'downloads',
                        type: 'special',
                        title: 'Downloads',
                        subtitle: `${downloadCount} tracks available offline`,
                        icon: ArrowDown,
                        gradient: ['#0f172a', '#1e293b', '#334155'],
                        onPress: () => router.push('/(tabs)/downloads?from=library' as any)
                    });
                }
            }
        }

        if (filter === 'all' || filter === 'playlists') {
            const userPlaylists = playlists.map(p => ({ ...p, type: 'playlist', title: p.name, createdAt: p.createdAt || 0, isLocal: true }));
            const savedPlaylists = savedItems.filter(i => i.type === 'playlist').map(i => ({ ...i, type: 'playlist', createdAt: i.createdAt || 0, isLocal: false }));

            let combinedPlaylists = [...userPlaylists, ...savedPlaylists];

            if (subFilter === 'by-you') {
                combinedPlaylists = userPlaylists;
            } else if (subFilter === 'by-vibra') {
                combinedPlaylists = savedPlaylists;
            }

            // Apply Download Filter
            if (isDownloadedFilterActive) {
                combinedPlaylists = combinedPlaylists.filter(p => !!downloadedPlaylists[(p as any).externalId || (p as any)._id]);
            }

            items.push(...combinedPlaylists);
        }

        if (filter === 'all' || filter === 'albums') {
            let albumsList = [
                ...albums.filter(a => a.isActive !== false).map(a => ({ ...a, type: 'album', createdAt: a.createdAt || 0 })),
                ...savedItems.filter(i => i.type === 'album').map(i => ({ ...i, type: 'album', createdAt: i.createdAt || 0 }))
            ];

            if (isDownloadedFilterActive) {
                albumsList = albumsList.filter(a => !!downloadedAlbums[(a as any).externalId || (a as any)._id]);
            }

            items.push(...albumsList);
        }

        if (filter === 'all' || filter === 'artists') {
            let artistsList = savedItems.filter(i => i.type === 'artist').map(i => ({ ...i, type: 'artist', createdAt: i.createdAt || 0 }));

            if (isDownloadedFilterActive) {
                artistsList = [];
            }

            items.push(...artistsList);
        }

        // Apply Sorting
        return items.sort((a, b) => {
            if (sortBy === 'recents') {
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            } else if (sortBy === 'name') {
                return (a.title || a.name || '').localeCompare(b.title || b.name || '');
            } else if (sortBy === 'artist') {
                return (a.artist || '').localeCompare(b.artist || '');
            }
            return 0;
        });
    }, [filter, subFilter, albums, playlists, likedSongs, savedItems, downloadCount, sortBy, isDownloadedFilterActive, downloadedPlaylists, downloadedAlbums]);

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await Promise.all([
            fetchUserPlaylists(),
            fetchLikedSongs(),
            fetchSavedItems()
        ]);
        setIsRefreshing(false);
    }, [fetchUserPlaylists, fetchLikedSongs, fetchSavedItems]);

    const handleItemPress = (item: any) => {
        if (item.type === 'special') {
            item.onPress();
            return;
        }

        const isAlbum = item.type === 'album';
        const isPlaylist = item.type === 'playlist';
        const isArtist = item.type === 'artist';
        const rawId = item.externalId || item._id;
        const id = rawId.replace(/jiosaavn_(album|playlist|artist)_/, '');

        let route = '';
        const isExternal = !!item.externalId && item.source !== 'ai';

        if (isAlbum) {
            route = isExternal ? `/(tabs)/album/external/jiosaavn/${id}?from=library` : `/(tabs)/album/${id}?from=library`;
        } else if (isPlaylist) {
            route = isExternal ? `/(tabs)/playlist/external/jiosaavn/${id}?from=library` : `/(tabs)/playlist/${id}?from=library`;
        } else if (isArtist) {
            route = isExternal ? `/(tabs)/artist/external/jiosaavn/${id}?from=library` : `/(tabs)/artist/${id}?from=library`;
        }

        router.push(route as any);
    };

    const handleOpenOptions = (item: any, type: any) => {
        if (item.type === 'special') return;
        optionsRef.current?.open(item, type);
    };

    const renderItem = ({ item }: { item: any }) => {
        if (viewMode === 'grid') {
            return <LibraryGridItem item={item} onPress={() => handleItemPress(item)} onLongPress={() => handleOpenOptions(item, item.type)} />;
        }
        return <LibraryListItem item={item} onPress={() => handleItemPress(item)} onLongPress={() => handleOpenOptions(item, item.type)} />;
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
            <View className="py-4 flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                <View className="flex-row items-center gap-3">
                    <Text className="text-white text-2xl font-extrabold">Your Library</Text>
                </View>
                <View className="flex-row items-center gap-6">
                    <TouchableOpacity onPress={() => router.push('/(tabs)/library-search?from=library' as any)}>
                        <Search size={22} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsPlusMenuOpen(true)}>
                        <Plus size={26} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <UserProfileIcon size={34} />
                </View>
            </View>

            <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center px-2 py-2">
                    {filter !== 'all' || isDownloadedFilterActive ? (
                        <Animated.View entering={FadeIn.duration(200)} layout={Layout.springify()}>
                            <TouchableOpacity
                                onPress={() => {
                                    setFilter('all');
                                    setSubFilter(null);
                                    setIsDownloadedFilterActive(false);
                                }}
                                style={styles.closeButton}
                                className="mr-2"
                            >
                                <X size={20} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </Animated.View>
                    ) : null}

                    <View className="flex-row space-x-2">
                        {filter === 'all' && !isDownloadedFilterActive ? (
                            <>
                                <FilterChip
                                    label="Playlists"
                                    isActive={false}
                                    onPress={() => { setFilter('playlists'); }}
                                />
                                <FilterChip
                                    label="Albums"
                                    isActive={false}
                                    onPress={() => { setFilter('albums'); }}
                                />
                                <FilterChip
                                    label="Artists"
                                    isActive={false}
                                    onPress={() => { setFilter('artists'); }}
                                />
                                <FilterChip
                                    label="Downloaded"
                                    isActive={isDownloadedFilterActive}
                                    onPress={() => setIsDownloadedFilterActive(!isDownloadedFilterActive)}
                                />
                            </>
                        ) : filter === 'all' && isDownloadedFilterActive ? (
                            <FilterChip
                                label="Downloaded"
                                isActive={true}
                                onPress={() => setIsDownloadedFilterActive(false)}
                            />
                        ) : (
                            <>
                                <FilterChip
                                    label={filter.charAt(0).toUpperCase() + filter.slice(1)}
                                    isActive={true}
                                    onPress={() => { setFilter('all'); setSubFilter(null); }}
                                />
                                {filter === 'playlists' && (
                                    <>
                                        <FilterChip
                                            label="By you"
                                            isActive={subFilter === 'by-you'}
                                            onPress={() => {
                                                setSubFilter(subFilter === 'by-you' ? null : 'by-you');
                                            }}
                                        />
                                        <FilterChip
                                            label="By Vibra"
                                            isActive={subFilter === 'by-vibra'}
                                            onPress={() => {
                                                setSubFilter(subFilter === 'by-vibra' ? null : 'by-vibra');
                                            }}
                                        />
                                    </>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </View>

            <View className="px-5 py-3 mt-0 flex-row items-center justify-between border-b-2">
                <TouchableOpacity
                    className="flex-row items-center"
                    onPress={() => {
                        setSortBy(prev => prev === 'recents' ? 'name' : prev === 'name' ? 'artist' : 'recents');
                    }}
                >
                    <View className="mr-2">
                        <ArrowUpDown size={14} color={Colors.textPrimary} />
                    </View>
                    <Text className="text-white text-sm font-semibold">
                        {sortBy === 'recents' ? 'Recents' : sortBy === 'name' ? 'Name' : 'Artist'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}>
                    {!!(viewMode === 'list') ? (
                        <LayoutGrid size={18} color={Colors.textPrimary} />
                    ) : (
                        <ListIcon size={18} color={Colors.textPrimary} />
                    )}
                </TouchableOpacity>
            </View>

            <FlatList
                key={viewMode}
                data={filteredData}
                keyExtractor={(item) => item.id || item._id}
                renderItem={renderItem}
                numColumns={viewMode === 'grid' ? 2 : 1}
                columnWrapperStyle={viewMode === 'grid' ? { paddingHorizontal: 16, justifyContent: 'space-between' } : undefined}
                contentContainerStyle={{
                    paddingHorizontal: viewMode === 'list' ? 4 : 0,
                    paddingTop: 0,
                    paddingBottom: 120
                }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.textSecondary}
                        colors={[Colors.textSecondary]}
                        progressBackgroundColor={Colors.surfaceLighter}
                    />
                }
                ListEmptyComponent={
                    <View className="py-20 items-center justify-center px-10">
                        <Text className="text-zinc-400 text-center">Your library is empty. Start adding some music!</Text>
                    </View>
                }
            />
            <CreatePlaylistModal
                visible={isCreateModalVisible}
                onClose={() => setIsCreateModalVisible(false)}
                onCreate={async (name) => {
                    try {
                        const newPlaylist = await createPlaylist(name);
                        router.push(`/(tabs)/playlist/${newPlaylist._id}?from=library` as any);
                    } catch (err) {
                        console.error("Failed to create playlist:", err);
                    }
                }}
            />
            <LibraryPlusMenu
                isOpen={isPlusMenuOpen}
                onClose={() => setIsPlusMenuOpen(false)}
                onOptionSelected={(option) => {
                    if (option === 'ai') {
                        router.push('/(tabs)/chat' as any);
                    } else if (option === 'new') {
                        setIsCreateModalVisible(true);
                    } else if (option === 'spotify' || option === 'youtube') {
                        router.push({ pathname: '/(tabs)/chat', params: { import: 'spotify' } } as any);
                    }
                }}
            />
            <CollectionOptions ref={optionsRef} />
        </SafeAreaView>
    );
}

const LibraryListItem = React.memo(({ item, onPress, onLongPress }: any) => {
    const { user } = useUser();
    const { downloadedPlaylists, downloadedAlbums } = useDownloadStore();
    const isSpecial = item.type === 'special';
    const isAlbum = item.type === 'album';
    const isArtist = item.type === 'artist';
    const isPlaylist = item.type === 'playlist';
    const playlistSongs = (isPlaylist || isSpecial) ? (item.songs || []) : [];
    const coverUrl = item.imageUrl || (playlistSongs.length > 0 ? playlistSongs[0].imageUrl : null);
    const resolvedUri = resolveAssetUrl(coverUrl);

    const isOwner = isPlaylist && item.isLocal && item.userId === user?.id;
    const creatorName = isOwner ? (user?.firstName || user?.username || 'You') : 'Vibra';

    return (
        <TouchableOpacity
            className="flex-row items-center p-2.5 rounded-xl"
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
        >
            <View className={`w-16 h-16 mr-4 bg-zinc-900 overflow-hidden items-center justify-center ${isArtist ? 'rounded-full' : 'rounded-sm'}`}>
                {isSpecial ? (
                    <LinearGradient
                        colors={item.gradient}
                        style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <item.icon
                            size={28}
                            color={Colors.textPrimary}
                            strokeWidth={2}
                            {...(item.icon === Heart ? { fill: Colors.textPrimary } : {})}
                        />
                    </LinearGradient>
                ) : (
                    <View className="w-full h-full items-center justify-center">
                        {!!resolvedUri ? (
                            <Image
                                source={{ uri: resolvedUri }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                            />
                        ) : (
                            isArtist ? <UserIcon size={32} color={Colors.textSecondary} /> : <Music size={24} color={Colors.textSecondary} />
                        )}
                    </View>
                )}
            </View>
            <View className="flex-1">
                <Text className="text-white font-medium text-lg" numberOfLines={1}>
                    {item.title || item.name}
                </Text>
                <View className="flex-row items-center mt-0.5">
                    {((isPlaylist && downloadedPlaylists[item.externalId || item._id]) || (isAlbum && downloadedAlbums[item.externalId || item._id])) && (
                        <View className="mr-1.5">
                            <DownloadedIcon size={12} />
                        </View>
                    )}
                    <Text className="text-zinc-400 text-sm flex-1" numberOfLines={1}>
                        {isSpecial ? item.subtitle : (isAlbum ? `Album • ${item.artist}` : isArtist ? `Artist` : `Playlist • ${(item.artist === 'Vibra AI' ? 'Vibra' : item.artist) || creatorName}`)}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

const LibraryGridItem = React.memo(({ item, onPress, onLongPress }: any) => {
    const { user } = useUser();
    const { downloadedPlaylists, downloadedAlbums } = useDownloadStore();
    const isSpecial = item.type === 'special';
    const isAlbum = item.type === 'album';
    const isArtist = item.type === 'artist';
    const isPlaylist = item.type === 'playlist';
    const playlistSongs = (isPlaylist || isSpecial) ? (item.songs || []) : [];
    const coverUrl = item.imageUrl || (playlistSongs.length > 0 ? playlistSongs[0].imageUrl : null);
    const resolvedUri = resolveAssetUrl(coverUrl);

    const isOwner = isPlaylist && item.isLocal && item.userId === user?.id;
    const creatorName = isOwner ? (user?.firstName || user?.username || 'You') : 'Vibra';

    return (
        <TouchableOpacity
            style={{ width: COLUMN_WIDTH, marginBottom: 20 }}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
        >
            <View style={{ width: COLUMN_WIDTH, height: COLUMN_WIDTH }} className={`bg-zinc-900 overflow-hidden items-center justify-center mb-3 ${isArtist ? 'rounded-full' : 'rounded-sm'}`}>
                {isSpecial ? (
                    <LinearGradient
                        colors={item.gradient}
                        style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <item.icon size={28} color={Colors.textPrimary} fill={Colors.textPrimary} />
                    </LinearGradient>
                ) : (
                    <View className="w-full h-full items-center justify-center">
                        {!!resolvedUri ? (
                            <Image
                                source={{ uri: resolvedUri }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                            />
                        ) : (
                            isArtist ? <UserIcon size={48} color={Colors.textSecondary} /> : <Music size={40} color={Colors.textSecondary} />
                        )}
                    </View>
                )}
            </View>
            <View className="mt-2">
                <Text className="text-white font-medium text-sm" numberOfLines={1}>
                    {item.title || item.name}
                </Text>
                <View className="flex-row items-center mt-0.5">
                    {((isPlaylist && downloadedPlaylists[item.externalId || item._id]) || (isAlbum && downloadedAlbums[item.externalId || item._id])) && (
                        <View className="mr-1">
                            <DownloadedIcon size={10} />
                        </View>
                    )}
                    <Text className="text-zinc-400 text-xs flex-1" numberOfLines={1}>
                        {isAlbum ? `Album • ${item.artist}` : isArtist ? 'Artist' : `Playlist • ${(item.artist === 'Vibra AI' ? 'Vibra' : item.artist) || creatorName}`}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        marginHorizontal: 4,
    },
    filterChipActive: {
        backgroundColor: Colors.accent,
    },
    filterChipText: {
        color: Colors.textPrimary,
        fontSize: 12,
        fontWeight: '600',
    },
    filterChipTextActive: {
        color: '#000000ff',
        fontWeight: '600',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
