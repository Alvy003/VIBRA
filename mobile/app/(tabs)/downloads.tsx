import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Play, Shuffle, Download, Music, User, Disc } from 'lucide-react-native';
import { useDownloadStore, DownloadedSong, DownloadedCollection } from '@/stores/useDownloadStore';
import { DownloadedIcon } from '@/components/DownloadedIcon';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { TrackListItem } from '@/components/TrackListItem';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { resolveAssetUrl } from '@/lib/url';

const { width } = Dimensions.get('window');

type DownloadTab = 'songs' | 'playlists' | 'albums';

export default function DownloadsScreen() {
    const router = useRouter();
    const { downloadedSongs, downloadedPlaylists, downloadedAlbums } = useDownloadStore();
    const { playTrack, initializeQueue } = usePlayerStore();
    const [activeTab, setActiveTab] = useState<DownloadTab>('songs');

    const songs = useMemo(() => {
        return Object.values(downloadedSongs).sort((a, b) => b.downloadedAt - a.downloadedAt);
    }, [downloadedSongs]);

    const playlists = useMemo(() => {
        return Object.values(downloadedPlaylists).sort((a, b) => b.downloadedAt - a.downloadedAt);
    }, [downloadedPlaylists]);

    const albums = useMemo(() => {
        return Object.values(downloadedAlbums).sort((a, b) => b.downloadedAt - a.downloadedAt);
    }, [downloadedAlbums]);

    const handlePlayAll = async (shuffle = false) => {
        if (songs.length === 0) return;

        const queueSongs = shuffle ? [...songs].sort(() => Math.random() - 0.5) : songs;

        // Map downloaded songs to Player tracks
        const playerTracks = queueSongs.map(s => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            url: s.localUri,
            artwork: s.artwork,
            duration: s.duration
        }));

        await initializeQueue(playerTracks, 0);
    };

    return (
        <View className="flex-1 bg-black">
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#4c1d95', '#000000']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.5 }}
            />

            <SafeAreaView className="flex-1 pt-6">
                {/* Header */}
                <View className="flex-row items-center px-4 py-4">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 items-center justify-center"
                    >
                        <ArrowLeft size={28} color="white" />
                    </TouchableOpacity>
                    <View className="flex-1 items-center">
                        <Text className="text-white text-lg font-bold">Downloads</Text>
                    </View>
                    <View className="w-10" />
                </View>

                {/* Hero section */}
                <View className="px-6 pb-6 pt-2">
                    <Text className="text-white text-4xl font-black mb-2">
                        {activeTab === 'songs' ? 'Offline Music' : activeTab === 'playlists' ? 'Offline Playlists' : 'Offline Albums'}
                    </Text>
                    <Text className="text-zinc-400 text-base mb-6">
                        {activeTab === 'songs' ? songs.length : activeTab === 'playlists' ? playlists.length : albums.length} items available
                    </Text>

                    <View className="flex-row items-center space-x-4">
                        <TouchableOpacity
                            onPress={() => handlePlayAll(false)}
                            className="flex-1 flex-row items-center justify-center bg-[#7B2CF5] py-3.5 rounded-full"
                        >
                            <Play size={20} color="white" fill="white" />
                            <Text className="text-white font-bold ml-2 text-lg">Play All</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handlePlayAll(true)}
                            className="w-14 h-14 items-center justify-center bg-zinc-800/80 rounded-full"
                        >
                            <Shuffle size={22} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tabs */}
                <View className="flex-row px-4 mb-4 border-b border-zinc-800/50">
                    {(['songs', 'playlists', 'albums'] as const).map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            className={`pb-3 px-4 mr-2 ${activeTab === tab ? 'border-b-2 border-[#7B2CF5]' : ''}`}
                        >
                            <Text className={`text-sm font-bold capitalize ${activeTab === tab ? 'text-white' : 'text-zinc-500'}`}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* List */}
                <FlatList
                    data={(activeTab === 'songs' ? songs : activeTab === 'playlists' ? playlists : albums) as any[]}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => {
                        if (activeTab === 'songs') {
                            const song = item as DownloadedSong;
                            return (
                                <TrackListItem
                                    track={{
                                        id: song.id,
                                        title: song.title,
                                        artist: song.artist,
                                        imageUrl: song.artwork,
                                        url: song.localUri,
                                        duration: song.duration
                                    }}
                                    index={index}
                                    isCurrent={false}
                                    onPress={() => {
                                        playTrack({
                                            id: song.id,
                                            title: song.title,
                                            artist: song.artist,
                                            url: song.localUri,
                                            artwork: song.artwork,
                                            duration: song.duration
                                        });
                                    }}
                                />
                            );
                        }

                        const collection = item as DownloadedCollection;
                        const resolvedUri = resolveAssetUrl(collection.artwork);
                        const isAlbum = activeTab === 'albums';

                        return (
                            <TouchableOpacity
                                className="flex-row items-center px-4 py-3 mb-1"
                                onPress={() => {
                                    let route = '';
                                    const rawId = collection.id;
                                    if (isAlbum) {
                                        route = rawId.startsWith('jiosaavn_')
                                            ? `/(tabs)/album/external/jiosaavn/${rawId.replace('jiosaavn_album_', '')}`
                                            : `/(tabs)/album/${rawId}`;
                                    } else {
                                        route = rawId.startsWith('jiosaavn_')
                                            ? `/(tabs)/playlist/external/jiosaavn/${rawId.replace('jiosaavn_playlist_', '')}`
                                            : `/(tabs)/playlist/${rawId}`;
                                    }
                                    router.push(route as any);
                                }}
                            >
                                <View className="w-14 h-14 bg-zinc-900 rounded-md overflow-hidden mr-4 items-center justify-center">
                                    {resolvedUri ? (
                                        <Image source={{ uri: resolvedUri }} style={{ width: '100%', height: '100%' }} />
                                    ) : (
                                        isAlbum ? <Disc size={24} color="#52525b" /> : <Music size={24} color="#52525b" />
                                    )}
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row items-center">
                                        <View className="mr-2">
                                            <DownloadedIcon size={12} />
                                        </View>
                                        <Text className="text-white font-medium text-base flex-1" numberOfLines={1}>{collection.title}</Text>
                                    </View>
                                    <Text className="text-zinc-500 text-xs mt-1" numberOfLines={1}>
                                        {isAlbum ? 'Album' : 'Playlist'} • {collection.artist} • {collection.songIds?.length || 0} songs
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    ListEmptyComponent={
                        <View className="py-20 items-center justify-center px-10">
                            <View className="w-20 h-20 bg-zinc-900 rounded-full items-center justify-center mb-6">
                                <Download size={40} color="#52525b" />
                            </View>
                            <Text className="text-white text-xl font-bold mb-2">No {activeTab} yet</Text>
                            <Text className="text-zinc-400 text-center">
                                Downloaded {activeTab} will appear here for offline listening.
                            </Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </View>
    );
}