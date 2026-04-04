import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { useSavedItemsStore } from '@/stores/useSavedItemsStore';
import { useUser } from '@clerk/clerk-expo';
import { Plus, List as ListIcon, Search, Download, Music, Heart, LayoutGrid, ArrowUpDown, User as UserIcon, X } from 'lucide-react-native';
import { resolveAssetUrl } from '@/lib/url';
import { useRouter } from 'expo-router';
import { useDownloadStore } from '@/stores/useDownloadStore';
import { RefreshControl } from 'react-native';
import { CreatePlaylistModal } from '@/components/library/CreatePlaylistModal';
import { DownloadedIcon } from '@/components/DownloadedIcon';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';

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
                    icon: Download,
                    gradient: ['#8B5CF6', '#7c3aed'],
                    onPress: () => router.push('/(tabs)/downloads' as any)
                });
            } else {
                items.push({
                    id: 'liked-songs',
                    type: 'special',
                    title: 'Liked Songs',
                    subtitle: `Playlist • ${likedSongs.length} songs`,
                    icon: Heart,
                    gradient: ['#9333ea', '#4f46e5'],
                    onPress: () => router.push('/favorites' as any)
                });

                if (downloadCount > 0) {
                    items.push({
                        id: 'downloads',
                        type: 'special',
                        title: 'Downloads',
                        subtitle: `${downloadCount} tracks available offline`,
                        icon: Download,
                        gradient: ['#8B5CF6', '#7c3aed'],
                        onPress: () => router.push('/(tabs)/downloads' as any)
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
        if (isAlbum) {
            route = item.externalId ? `/(tabs)/album/external/jiosaavn/${id}` : `/(tabs)/album/${id}`;
        } else if (isPlaylist) {
            route = item.externalId ? `/(tabs)/playlist/external/jiosaavn/${id}` : `/(tabs)/playlist/${id}`;
        } else if (isArtist) {
            route = item.externalId ? `/(tabs)/artist/external/jiosaavn/${id}` : `/(tabs)/artist/${id}`;
        }

        router.push(route as any);
    };

    const renderItem = ({ item }: { item: any }) => {
        if (viewMode === 'grid') {
            return <LibraryGridItem item={item} onPress={() => handleItemPress(item)} />;
        }
        return <LibraryListItem item={item} onPress={() => handleItemPress(item)} />;
    };

    return (
        <SafeAreaView className="flex-1 bg-black">
            <View className="px-4 py-4 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                    <Text className="text-white text-2xl font-extrabold">Your Library</Text>
                </View>
                <View className="flex-row items-center gap-6">
                    <TouchableOpacity onPress={() => router.push('/library-search' as any)}>
                        <Search size={22} color="#ffffff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsCreateModalVisible(true)}>
                        <Plus size={24} color="#ffffff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push('/profile' as any)}
                        activeOpacity={0.7}
                    >
                        <Image
                            source={{ uri: user?.imageUrl || 'https://avatar.iran.liara.run/public/boy' }}
                            style={{ width: 32, height: 32, borderRadius: 16 }}
                            cachePolicy="memory-disk"
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <View className="flex-row items-center justify-between mt-0">
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
                                <X size={20} color="#fff" />
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

            <View className="px-4 py-3 mt-1 flex-row items-center justify-between">
                <TouchableOpacity
                    className="flex-row items-center"
                    onPress={() => {
                        setSortBy(prev => prev === 'recents' ? 'name' : prev === 'name' ? 'artist' : 'recents');
                    }}
                >
                    <View className="mr-2">
                        <ArrowUpDown size={14} color="#ffffff" />
                    </View>
                    <Text className="text-white text-sm font-semibold">
                        {sortBy === 'recents' ? 'Recents' : sortBy === 'name' ? 'Name' : 'Artist'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}>
                    {!!(viewMode === 'list') ? (
                        <LayoutGrid size={18} color="#e9e9e9ff" />
                    ) : (
                        <ListIcon size={18} color="#e9e9e9ff" />
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
                    paddingTop: 8,
                    paddingBottom: 120
                }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        tintColor="#a1a1aa"
                        colors={['#a1a1aa']}
                        progressBackgroundColor="#18181b"
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
                        router.push(`/(tabs)/playlist/${newPlaylist._id}` as any);
                    } catch (err) {
                        console.error("Failed to create playlist:", err);
                    }
                }}
            />
        </SafeAreaView>
    );
}

const LibraryListItem = React.memo(({ item, onPress }: any) => {
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
            activeOpacity={0.7}
        >
            <View className={`w-16 h-16 mr-4 bg-zinc-900 overflow-hidden items-center justify-center ${isArtist ? 'rounded-full' : 'rounded-md'}`}>
                {isSpecial ? (
                    <View
                        style={{ backgroundColor: item.gradient[0] }}
                        className="w-full h-full items-center justify-center"
                    >
                        <item.icon size={28} color="#fff" fill="#fff" />
                    </View>
                ) : (
                    <View className="w-full h-full items-center justify-center">
                        {!!resolvedUri ? (
                            <Image
                                source={{ uri: resolvedUri }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                            />
                        ) : (
                            isArtist ? <UserIcon size={32} color="#52525b" /> : <Music size={24} color="#52525b" />
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
                        {isSpecial ? item.subtitle : (isAlbum ? `Album • ${item.artist}` : isArtist ? `Artist` : `Playlist • ${item.artist || creatorName}`)}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

const LibraryGridItem = React.memo(({ item, onPress }: any) => {
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
            activeOpacity={0.7}
        >
            <View style={{ width: COLUMN_WIDTH, height: COLUMN_WIDTH }} className={`bg-zinc-900 overflow-hidden items-center justify-center mb-3 ${isArtist ? 'rounded-full' : 'rounded-sm'}`}>
                {isSpecial ? (
                    <View
                        style={{ backgroundColor: item.gradient[0] }}
                        className="w-full h-full items-center justify-center"
                    >
                        <item.icon size={48} color="#fff" fill="#fff" />
                    </View>
                ) : (
                    <View className="w-full h-full items-center justify-center">
                        {!!resolvedUri ? (
                            <Image
                                source={{ uri: resolvedUri }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                            />
                        ) : (
                            isArtist ? <UserIcon size={48} color="#52525b" /> : <Music size={40} color="#52525b" />
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
                        {isAlbum ? `Album • ${item.artist}` : isArtist ? 'Artist' : `Playlist • ${creatorName}`}
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
        backgroundColor: '#18181b',
        marginHorizontal: 4,
    },
    filterChipActive: {
        backgroundColor: '#8B5CF6',
    },
    filterChipText: {
        color: '#e4e4e7',
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
        backgroundColor: '#27272a',
        justifyContent: 'center',
        alignItems: 'center',
    }
});
