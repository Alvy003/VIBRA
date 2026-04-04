import React, { useState, useMemo } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TextInput, 
    FlatList, 
    TouchableOpacity, 
    Dimensions,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, X, Music, Disc, User, Heart, Download } from 'lucide-react-native';
import { Image } from 'expo-image';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { useMusicStore } from '@/stores/useMusicStore';
import { useSavedItemsStore } from '@/stores/useSavedItemsStore';
import { useDownloadStore } from '@/stores/useDownloadStore';
import { resolveAssetUrl } from '@/lib/url';

const { width } = Dimensions.get('window');

export default function LibrarySearchScreen() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    
    const { playlists } = usePlaylistStore();
    const { albums, likedSongs } = useMusicStore();
    const { savedItems } = useSavedItemsStore();

    const allItems = useMemo(() => {
        const items: any[] = [];
        
        // Add Liked Songs
        items.push({
            id: 'liked-songs',
            type: 'special',
            title: 'Liked Songs',
            subtitle: `Playlist • ${likedSongs.length} songs`,
            icon: Heart,
            imageUrl: null,
            songs: likedSongs
        });

        // Add Downloads
        const downloadedSongsArray = Object.values(useDownloadStore.getState().downloadedSongs);
        items.push({
            id: 'downloads',
            type: 'special',
            title: 'Downloads',
            subtitle: `Playlist • ${downloadedSongsArray.length} tracks`,
            icon: Download,
            imageUrl: null,
            songs: downloadedSongsArray
        });

        // Add Playlists
        playlists.forEach(p => items.push({ ...p, type: 'playlist', title: p.name }));
        
        // Add Saved Items (Albums, Artists, external Playlists)
        savedItems.forEach(i => items.push({ ...i }));

        // Add Local Albums
        albums.forEach(a => items.push({ ...a, type: 'album' }));

        return items;
    }, [playlists, albums, likedSongs, savedItems]);

    const filteredItems = useMemo(() => {
        if (!query.trim()) return [];
        const lowQuery = query.toLowerCase();
        return allItems.filter(item => 
            (item.title || item.name || '').toLowerCase().includes(lowQuery) ||
            (item.artist || '').toLowerCase().includes(lowQuery)
        );
    }, [allItems, query]);

    const renderItem = ({ item }: { item: any }) => {
        const isArtist = item.type === 'artist';
        const isSpecial = item.type === 'special';
        const isPlaylist = item.type === 'playlist';
        const playlistSongs = (isPlaylist || isSpecial) ? (item.songs || []) : [];
        const coverUrl = item.imageUrl || (playlistSongs.length > 0 ? playlistSongs[0].imageUrl : null);
        const resolvedUri = resolveAssetUrl(coverUrl);

        return (
            <TouchableOpacity 
                style={styles.itemContainer}
                onPress={() => {
                    // Routing logic similar to LibraryScreen
                    const isAlbum = item.type === 'album';
                    
                    if (item.id === 'liked-songs') {
                        router.push('/favorites' as any);
                        return;
                    }
                    if (item.id === 'downloads') {
                        router.push('/(tabs)/downloads' as any);
                        return;
                    }

                    const rawId = item.externalId || item._id || item.id;
                    const id = rawId.replace(/jiosaavn_(album|playlist|artist)_/, '');
                    
                    let route = '';
                    if (isAlbum) {
                        route = item.externalId ? `/(tabs)/album/external/jiosaavn/${id}` : `/(tabs)/album/${id}`;
                    } else if (isPlaylist) {
                        route = item.externalId ? `/(tabs)/playlist/external/jiosaavn/${id}` : `/(tabs)/playlist/${id}`;
                    } else if (isArtist) {
                        route = item.externalId ? `/(tabs)/artist/external/jiosaavn/${id}` : `/(tabs)/artist/${id}`;
                    }
                    
                    if (route) router.push(route as any);
                }}
            >
                <View style={[
                    styles.imageContainer,
                    isArtist && styles.artistImageContainer
                ]}>
                    {isSpecial ? (
                        <View style={[
                            styles.specialIcon,
                            item.id === 'liked-songs' ? styles.likedBg : styles.downloadBg
                        ]}>
                            <item.icon size={24} color="#fff" fill={item.id === 'liked-songs' ? "#fff" : "none"} />
                        </View>
                    ) : (
                        resolvedUri ? (
                            <Image 
                                source={{ uri: resolvedUri }}
                                style={styles.image}
                                contentFit="cover"
                            />
                        ) : (
                            <View style={styles.placeholderIcon}>
                                {isArtist ? <User size={24} color="#52525b" /> : <Music size={24} color="#52525b" />}
                            </View>
                        )
                    )}
                </View>
                <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>{item.title || item.name}</Text>
                    <Text style={styles.subtitle} numberOfLines={1}>
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • {item.artist || 'Vibra'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.input}
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Search Your Library"
                        placeholderTextColor="#a1a1aa"
                        autoFocus
                        selectionColor="#8B5CF6"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <X size={20} color="#a1a1aa" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {query.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyTitle}>Find your favourites</Text>
                    <Text style={styles.emptySubtitle}>Search everything you've saved, followed or created.</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredItems}
                    keyExtractor={(item, index) => item.id || item._id || index.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.noResults}>
                            <Text style={styles.noResultsText}>No results found for "{query}"</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#282828',
    },
    backButton: {
        marginRight: 12,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3e3e3e',
        borderRadius: 4,
        paddingHorizontal: 12,
        height: 40,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        color: '#a1a1aa',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    listContent: {
        paddingVertical: 16,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    imageContainer: {
        width: 50,
        height: 50,
        borderRadius: 4,
        backgroundColor: '#282828',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    artistImageContainer: {
        borderRadius: 25,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholderIcon: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    specialIcon: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    likedBg: {
        backgroundColor: '#5038a0',
    },
    downloadBg: {
        backgroundColor: '#06b6d4',
    },
    info: {
        flex: 1,
        marginLeft: 12,
    },
    title: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    subtitle: {
        color: '#a1a1aa',
        fontSize: 13,
        marginTop: 2,
    },
    noResults: {
        paddingTop: 40,
        alignItems: 'center',
    },
    noResultsText: {
        color: '#a1a1aa',
        fontSize: 14,
    }
});
