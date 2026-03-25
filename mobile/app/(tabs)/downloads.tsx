// app/(tabs)/downloads.tsx
import React, { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Play, Shuffle, Download, Music } from 'lucide-react-native';
import { useDownloadStore } from '@/stores/useDownloadStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { TrackListItem } from '@/components/TrackListItem';
import { LinearGradient } from 'expo-linear-gradient';

export default function DownloadsScreen() {
    const router = useRouter();
    const { downloadedSongs } = useDownloadStore();
    const { playTrack, initializeQueue } = usePlayerStore();

    const songs = useMemo(() => {
        return Object.values(downloadedSongs).sort((a, b) => b.downloadedAt - a.downloadedAt);
    }, [downloadedSongs]);

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
                colors={['#0891b2', '#000000']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.4 }}
            />

            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="flex-row items-center px-4 py-4 justify-between">
                    <View className="w-10" />
                    <Text className="text-white text-lg font-bold">Downloads</Text>
                    <View className="w-10" />
                </View>

                {/* Hero section */}
                <View className="px-6 py-8">
                    <Text className="text-white text-4xl font-black mb-2">Offline Music</Text>
                    <Text className="text-zinc-400 text-base mb-6">
                        {songs.length} tracks available for offline playback
                    </Text>

                    <View className="flex-row items-center space-x-4">
                        <TouchableOpacity 
                            onPress={() => handlePlayAll(false)}
                            className="flex-1 flex-row items-center justify-center bg-cyan-500 py-4 rounded-full"
                        >
                            <Play size={22} color="black" fill="black" />
                            <Text className="text-black font-bold ml-2 text-lg">Play All</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            onPress={() => handlePlayAll(true)}
                            className="w-16 h-16 items-center justify-center bg-zinc-800 rounded-full"
                        >
                            <Shuffle size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* List */}
                <FlatList
                    data={songs}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                        <TrackListItem
                            track={{
                                id: item.id,
                                title: item.title,
                                artist: item.artist,
                                imageUrl: item.artwork,
                                url: item.localUri,
                                duration: item.duration
                            }}
                            index={index}
                            isCurrent={false}
                            onPress={() => {
                                playTrack({
                                    id: item.id,
                                    title: item.title,
                                    artist: item.artist,
                                    url: item.localUri,
                                    artwork: item.artwork,
                                    duration: item.duration
                                });
                            }}
                        />
                    )}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    ListEmptyComponent={
                        <View className="py-20 items-center justify-center px-10">
                            <View className="w-20 h-20 bg-zinc-900 rounded-full items-center justify-center mb-6">
                                <Download size={40} color="#52525b" />
                            </View>
                            <Text className="text-white text-xl font-bold mb-2">No downloads yet</Text>
                            <Text className="text-zinc-400 text-center">
                                Tracks you download will appear here for offline listening.
                            </Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </View>
    );
}