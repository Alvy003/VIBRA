import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { useSavedItemsStore } from '@/stores/useSavedItemsStore';
import { useUser } from '@clerk/clerk-expo';
import { Plus, List as ListIcon, Search, Download, Music, Heart, LayoutGrid, ArrowUpDown } from 'lucide-react-native';
import { resolveAssetUrl } from '@/lib/url';
import { useRouter } from 'expo-router';
import { useDownloadStore } from '@/stores/useDownloadStore';
import { RefreshControl } from 'react-native';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 40) / 2;

type LibraryFilter = "all" | "playlists" | "albums" | "artists";
type ViewMode = "list" | "grid";

const FilterChip = ({ label, isActive, onPress }: { label: string, isActive: boolean, onPress: () => void }) => (
    <TouchableOpacity 
        onPress={onPress}
        style={[styles.filterChip, isActive && styles.filterChipActive]}
    >
        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
);

export default function LibraryScreen() {
    const { user } = useUser();
    const router = useRouter();
    const { albums, fetchAlbums, likedSongs, fetchLikedSongs } = useMusicStore();
    const { playlists, fetchUserPlaylists } = usePlaylistStore();
    const { savedItems, fetchSavedItems } = useSavedItemsStore();
    const [filter, setFilter] = useState<LibraryFilter>("all");
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchAlbums();
        fetchUserPlaylists();
        fetchLikedSongs();
        fetchSavedItems();
    }, []);

    const { downloadedSongs } = useDownloadStore();
    const downloadCount = Object.keys(downloadedSongs).length;

    const filteredData = useMemo(() => {
        const items: any[] = [];
        
        if (filter === 'all' || filter === 'playlists') {
            items.push({
                id: 'liked-songs',
                type: 'special',
                title: 'Liked Songs',
                subtitle: `Pinned • Playlist • ${likedSongs.length} songs`,
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
                    gradient: ['#06b6d4', '#0891b2'],
                    onPress: () => router.push('/(tabs)/downloads' as any)
                });
            }
        }

        if (filter === 'all' || filter === 'playlists') {
            playlists.forEach(p => items.push({ ...p, type: 'playlist' }));
            savedItems.filter(i => i.type === 'playlist').forEach(i => items.push({ ...i, type: 'playlist' }));
        }

        if (filter === 'all' || filter === 'albums') {
            albums.filter(a => a.isActive !== false).forEach(a => items.push({ ...a, type: 'album' }));
            savedItems.filter(i => i.type === 'album').forEach(i => items.push({ ...i, type: 'album' }));
        }

        return items;
    }, [filter, albums, playlists, likedSongs, savedItems, downloadCount]);

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await Promise.all([
            fetchAlbums(),
            fetchUserPlaylists(),
            fetchLikedSongs(),
            fetchSavedItems()
        ]);
        setIsRefreshing(false);
    }, [fetchAlbums, fetchUserPlaylists, fetchLikedSongs, fetchSavedItems]);

    const handleItemPress = (item: any) => {
        if (item.type === 'special') {
            item.onPress();
            return;
        }

        const isAlbum = item.type === 'album';
        const rawId = item.externalId || item._id;
        const id = rawId.replace(/jiosaavn_(album|playlist)_/, '');
        
        // FIX: Correctly detect external jiosaavn items for proper routing
        let route = '';
        if (isAlbum) {
            route = item.externalId ? `/(tabs)/album/external/jiosaavn/${id}` : `/(tabs)/album/${id}`;
        } else {
            route = item.externalId ? `/(tabs)/playlist/external/jiosaavn/${id}` : `/(tabs)/playlist/${id}`;
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
            {/* Spotify-style Header */}
            <View className="px-4 py-4 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
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
                    <Text className="text-white text-2xl font-bold">Your Library</Text>
                </View>
                <View className="flex-row items-center space-x-5">
                    <TouchableOpacity>
                        <Search size={22} color="#ffffff" />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Plus size={24} color="#ffffff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Filter Row */}
            <View className="flex-row px-4 py-2 space-x-2">
                <FilterChip label="Playlists" isActive={filter === 'playlists'} onPress={() => setFilter(filter === 'playlists' ? 'all' : 'playlists')} />
                <FilterChip label="Albums" isActive={filter === 'albums'} onPress={() => setFilter(filter === 'albums' ? 'all' : 'albums')} />
                <FilterChip label="Artists" isActive={filter === 'artists'} onPress={() => setFilter(filter === 'artists' ? 'all' : 'artists')} />
            </View>

            {/* Sub-header: Sort & Mode Toggle */}
            <View className="px-4 py-3 flex-row items-center justify-between">
                <TouchableOpacity className="flex-row items-center">
                    <ArrowUpDown size={14} color="#ffffff" className="mr-2" />
                    <Text className="text-white text-sm font-bold">Recents</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}>
                    {!!(viewMode === 'list') ? (
                        <LayoutGrid size={20} color="#ffffff" />
                    ) : (
                        <ListIcon size={20} color="#ffffff" />
                    )}
                </TouchableOpacity>
            </View>

            <FlatList
                key={viewMode} // Re-render when mode changes to update numColumns
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
                        tintColor="#8B5CF6"
                        colors={['#8B5CF6']}
                        progressBackgroundColor="#18181b"
                    />
                }
                ListEmptyComponent={
                    <View className="py-20 items-center justify-center px-10">
                        <Text className="text-zinc-400 text-center">Your library is empty. Start adding some music!</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const LibraryListItem = React.memo(({ item, onPress }: any) => {
    const isSpecial = item.type === 'special';
    const isAlbum = item.type === 'album';
    const resolvedUri = resolveAssetUrl(item.imageUrl);
    
    return (
        <TouchableOpacity 
            className="flex-row items-center p-3 mb-1 rounded-xl"
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View className="w-16 h-16 rounded-md mr-4 bg-zinc-900 overflow-hidden items-center justify-center">
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
                            <Music size={24} color="#52525b" />
                        )}
                    </View>
                )}
            </View>
            <View className="flex-1">
                <Text className="text-white font-bold text-base" numberOfLines={1}>
                    {item.title || item.name}
                </Text>
                <Text className="text-zinc-400 text-sm mt-0.5" numberOfLines={1}>
                    {isSpecial ? item.subtitle : (isAlbum ? `Album • ${item.artist}` : `Playlist • ${item.artist || 'Vibra'}`)}
                </Text>
            </View>
        </TouchableOpacity>
    );
});

const LibraryGridItem = React.memo(({ item, onPress }: any) => {
    const isSpecial = item.type === 'special';
    const isAlbum = item.type === 'album';
    const resolvedUri = resolveAssetUrl(item.imageUrl);

    return (
        <TouchableOpacity 
            style={{ width: COLUMN_WIDTH, marginBottom: 20 }}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={{ width: COLUMN_WIDTH, height: COLUMN_WIDTH }} className="rounded-md bg-zinc-900 overflow-hidden items-center justify-center mb-3">
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
                            <Music size={40} color="#52525b" />
                        )}
                    </View>
                )}
            </View>
            <Text className="text-white font-bold text-sm" numberOfLines={1}>
                {item.title || item.name}
            </Text>
            <Text className="text-zinc-500 text-xs mt-1" numberOfLines={1}>
                {isSpecial ? 'Playlist' : (isAlbum ? `Album • ${item.artist}` : `Playlist • ${item.artist || 'Vibra'}`)}
            </Text>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#18181b',
        borderWidth: 1,
        borderColor: '#27272a',
    },
    filterChipActive: {
        backgroundColor: '#8B5CF6',
        borderColor: '#8B5CF6',
    },
    filterChipText: {
        color: '#e4e4e7',
        fontSize: 13,
        fontWeight: '700',
    },
    filterChipTextActive: {
        color: '#ffffff',
    }
});
