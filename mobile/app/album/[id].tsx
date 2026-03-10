import React, { useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { ChevronLeft, Play, Pause, MoreVertical, Clock } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AlbumScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { currentAlbum, fetchAlbumById, isLoading, musicError } = useMusicStore();
    const { currentTrack, isPlaying, playTrack, togglePlay, initializeQueue } = usePlayerStore();

    useEffect(() => {
        if (id) fetchAlbumById(id as string);
    }, [id]);

    if (isLoading && !currentAlbum) {
        return (
            <View className="flex-1 bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#9333ea" />
            </View>
        );
    }

    if (musicError || !currentAlbum) {
        return (
            <View className="flex-1 bg-black items-center justify-center px-6">
                <Text className="text-red-500 text-center mb-4">{musicError || "Album not found"}</Text>
                <TouchableOpacity onPress={() => router.back()} className="bg-zinc-800 px-6 py-2 rounded-full">
                    <Text className="text-white">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const songs = currentAlbum.songs as any[];

    const handlePlayAlbum = () => {
        if (songs.length > 0) {
            // Set the whole album as queue and play first song
            const tracks = songs.map(s => ({
                id: s._id,
                url: s.audioUrl,
                title: s.title,
                artist: s.artist,
                artwork: s.imageUrl,
            }));
            initializeQueue(tracks, 0);
        }
    };

    const handlePlaySong = (song: any) => {
        if (currentTrack?.id === song._id) {
            togglePlay();
        } else {
            playTrack({
                id: song._id,
                url: song.audioUrl,
                title: song.title,
                artist: song.artist,
                artwork: song.imageUrl,
            });
        }
    };

    return (
        <View style={styles.container}>
            {/* Immersive Background */}
            <Image
                source={{ uri: currentAlbum.imageUrl }}
                style={StyleSheet.absoluteFill}
                blurRadius={20}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />

            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
                {/* Header Actions */}
                <View className="flex-row items-center justify-between px-4 py-2">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 items-center justify-center rounded-full bg-black/20"
                    >
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                    <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-black/20">
                        <MoreVertical color="white" size={20} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    {/* Album Art & Info */}
                    <View className="items-center px-6 pt-4 pb-8">
                        <Image
                            source={{ uri: currentAlbum.imageUrl }}
                            className="w-64 h-64 rounded-3xl shadow-2xl"
                        />
                        <Text className="text-white text-2xl font-bold mt-6 text-center">{currentAlbum.title}</Text>
                        <Text className="text-zinc-300 text-lg mt-1">{currentAlbum.artist}</Text>
                        <Text className="text-zinc-500 mt-2 text-sm">{songs.length} Songs • 2024</Text>

                        <View className="flex-row items-center mt-6 space-x-4">
                            <TouchableOpacity
                                onPress={handlePlayAlbum}
                                className="bg-white px-8 h-12 rounded-full flex-row items-center justify-center"
                            >
                                <Play size={20} color="black" fill="black" />
                                <Text className="text-black font-bold ml-2">Play</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="w-12 h-12 rounded-full border border-white/20 items-center justify-center">
                                <Play size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Songs List */}
                    <View className="px-4">
                        {songs.map((song, index) => {
                            const isCurrent = currentTrack?.id === song._id;
                            return (
                                <TouchableOpacity
                                    key={song._id}
                                    onPress={() => handlePlaySong(song)}
                                    className="flex-row items-center py-3 px-2 rounded-xl mb-1"
                                    style={isCurrent ? { backgroundColor: 'rgba(255,255,255,0.1)' } : null}
                                >
                                    <Text className="text-zinc-500 w-8 font-medium">{index + 1}</Text>
                                    <View className="flex-1">
                                        <Text className={`font-semibold ${isCurrent ? 'text-purple-400' : 'text-white'}`}>
                                            {song.title}
                                        </Text>
                                        <Text className="text-zinc-500 text-xs mt-0.5">{song.artist}</Text>
                                    </View>
                                    <View className="flex-row items-center space-x-4">
                                        <Text className="text-zinc-500 text-xs">
                                            {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                                        </Text>
                                        <MoreVertical size={16} color="#71717a" />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
});
