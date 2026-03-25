import React, { useEffect, useMemo } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { ChevronLeft, Play, Pause, MoreVertical, Heart } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveAssetUrl } from '@/lib/url';

export default function FavoritesScreen() {
    const router = useRouter();
    const { likedSongs, fetchLikedSongs, isLoading } = useMusicStore();
    const { currentTrack, isPlaying, playTrack, togglePlay, initializeQueue } = usePlayerStore();

    useEffect(() => {
        fetchLikedSongs();
    }, []);

    const handlePlayAll = () => {
        if (likedSongs.length > 0) {
            const tracks = likedSongs.map(s => ({
                id: s._id,
                url: s.audioUrl,
                title: s.title,
                artist: s.artist,
                artwork: s.imageUrl,
            }));
            initializeQueue(tracks, 0);
        }
    };

    const handlePlaySong = (song: any, index: number) => {
        if (currentTrack?.id === song._id) {
            togglePlay();
        } else {
            const tracks = likedSongs.map(s => ({
                id: s._id,
                url: s.audioUrl,
                title: s.title,
                artist: s.artist,
                artwork: s.imageUrl,
            }));
            initializeQueue(tracks, index);
        }
    };

    if (isLoading && likedSongs.length === 0) {
        return (
            <View className="flex-1 bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#9333ea" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#4c1d95', '#1e1b4b', '#000000']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
                <View className="flex-row items-center px-4 py-2">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 items-center justify-center rounded-full bg-black/20"
                    >
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                    <View className="items-center px-6 pt-4 pb-8">
                        <View style={styles.artworkContainer} className="shadow-2xl">
                            <LinearGradient
                                colors={['#9333ea', '#4f46e5']}
                                style={styles.artworkGradient}
                            >
                                <Heart size={64} color="white" fill="white" />
                            </LinearGradient>
                        </View>
                        <Text className="text-white text-3xl font-bold mt-6 text-center">Liked Songs</Text>
                        <Text className="text-zinc-400 text-lg mt-1">{likedSongs.length} songs</Text>

                        <TouchableOpacity
                            onPress={handlePlayAll}
                            className="bg-purple-600 w-16 h-16 rounded-full items-center justify-center mt-6 shadow-lg"
                        >
                            <Play size={30} color="white" fill="white" />
                        </TouchableOpacity>
                    </View>

                    <View className="px-4">
                        {likedSongs.length > 0 ? (
                            likedSongs.map((song, index) => {
                                const isCurrent = currentTrack?.id === song._id;
                                return (
                                    <SongListItem 
                                        key={song._id} 
                                        song={song} 
                                        index={index} 
                                        isCurrent={isCurrent} 
                                        onPress={() => handlePlaySong(song, index)}
                                    />
                                );
                            })
                        ) : (
                            <View className="py-20 items-center justify-center">
                                <Text className="text-zinc-500 text-lg">No liked songs yet</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const SongListItem = React.memo(({ song, index, isCurrent, onPress }: any) => {
    const resolvedUri = useMemo(() => resolveAssetUrl(song.imageUrl), [song.imageUrl]);
    
    return (
        <TouchableOpacity
            onPress={onPress}
            className="flex-row items-center py-3 px-2 rounded-xl mb-1"
            style={isCurrent ? { backgroundColor: 'rgba(255,255,255,0.1)' } : null}
        >
            <Image
                source={{ uri: resolvedUri }}
                className="w-12 h-12 rounded-lg mr-4 bg-zinc-900"
            />
            <View className="flex-1">
                <Text className={`font-semibold ${isCurrent ? 'text-purple-400' : 'text-white'}`} numberOfLines={1}>
                    {song.title}
                </Text>
                <Text className="text-zinc-500 text-xs mt-0.5" numberOfLines={1}>
                    {song.artist}
                </Text>
            </View>
            <MoreVertical size={20} color="#71717a" />
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    artworkContainer: {
        width: 200,
        height: 200,
        borderRadius: 24,
        overflow: 'hidden',
    },
    artworkGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
