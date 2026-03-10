import React, { useEffect, useMemo } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStreamStore } from '@/stores/useStreamStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { ChevronLeft, Play, Pause, Disc, Clock, Music, Star, MoreVertical } from 'lucide-react-native';
import SongOptions from '@/components/SongOptions';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ExternalAlbumScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const {
        currentExternalAlbum: album,
        isLoadingDetail,
        fetchExternalAlbum,
        clearDetail
    } = useStreamStore();

    const { currentTrack, isPlaying, togglePlay, playTrack, initializeQueue } = usePlayerStore();

    useEffect(() => {
        if (id) {
            fetchExternalAlbum('jiosaavn', id as string);
        }
        return () => clearDetail();
    }, [id]);

    const handlePlayAll = () => {
        if (!album?.songs?.length) return;

        const tracks = album.songs.map((s: any) => ({
            id: s.externalId,
            url: s.streamUrl,
            title: s.title,
            artist: s.artist,
            artwork: s.imageUrl || album.imageUrl,
            source: 'jiosaavn'
        }));

        initializeQueue(tracks, 0);
    };

    const handlePlayTrack = (track: any, index: number) => {
        const tracks = album.songs.map((s: any) => ({
            id: s.externalId,
            url: s.streamUrl,
            title: s.title,
            artist: s.artist,
            artwork: s.imageUrl || album.imageUrl,
            source: 'jiosaavn'
        }));

        initializeQueue(tracks, index);
    };

    if (isLoadingDetail || !album) {
        return (
            <View className="flex-1 bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#9333ea" />
            </View>
        );
    }

    const isCurrentAlbumPlaying = album.songs.some((s: any) => s.externalId === currentTrack?.id) && isPlaying;

    return (
        <View className="flex-1 bg-zinc-950">
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 110 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Immersive Header */}
                <View className="relative h-80">
                    <Image
                        source={{ uri: album.imageUrl }}
                        className="absolute inset-0 w-full h-full"
                        resizeMode="cover"
                    />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', 'rgb(9, 9, 11)']}
                        className="absolute inset-0"
                    />

                    <SafeAreaView edges={['top']} className="px-6">
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="w-10 h-10 rounded-full bg-black/20 items-center justify-center border border-white/10"
                        >
                            <ChevronLeft size={24} color="white" />
                        </TouchableOpacity>
                    </SafeAreaView>

                    <View className="absolute bottom-6 left-6 right-6">
                        <View className="flex-row items-end space-x-4">
                            <View className="shadow-2xl">
                                <Image
                                    source={{ uri: album.imageUrl }}
                                    className="w-32 h-32 rounded-2xl border border-white/10"
                                />
                            </View>
                            <View className="flex-1 pb-1">
                                <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Album</Text>
                                <Text className="text-white text-2xl font-bold mb-1" numberOfLines={2}>{album.title}</Text>
                                <Text className="text-zinc-300 text-sm font-medium">{album.artist}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Stats & Actions */}
                <View className="px-6 py-6 flex-row items-center justify-between">
                    <View className="flex-row items-center space-x-4">
                        <TouchableOpacity
                            onPress={handlePlayAll}
                            className="w-14 h-14 rounded-full bg-purple-600 items-center justify-center shadow-lg"
                        >
                            {isCurrentAlbumPlaying ? (
                                <Pause size={28} color="white" fill="white" />
                            ) : (
                                <Play size={28} color="white" fill="white" />
                            )}
                        </TouchableOpacity>
                        <View>
                            <Text className="text-zinc-500 text-xs font-bold uppercase">{album.songs.length} Tracks</Text>
                            <Text className="text-zinc-300 text-xs">{album.year || 'Unknown Year'}</Text>
                        </View>
                    </View>

                    <View className="flex-row items-center space-x-2">
                        <TouchableOpacity className="w-10 h-10 rounded-full border border-white/10 items-center justify-center">
                            <Star size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity className="w-10 h-10 rounded-full border border-white/10 items-center justify-center">
                            <MoreVertical size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Track List */}
                <View className="px-2">
                    {album.songs.map((song: any, index: number) => {
                        const isCurrent = currentTrack?.id === song.externalId;
                        return (
                            <TouchableOpacity
                                key={song.externalId}
                                onPress={() => handlePlayTrack(song, index)}
                                className={`flex-row items-center px-4 py-3 rounded-2xl ${isCurrent ? 'bg-purple-500/10' : ''}`}
                            >
                                <View className="w-6 items-center">
                                    <Text className={`text-xs font-medium ${isCurrent ? 'text-purple-400' : 'text-zinc-500'}`}>
                                        {index + 1}
                                    </Text>
                                </View>
                                <Image
                                    source={{ uri: song.imageUrl || album.imageUrl }}
                                    className="w-12 h-12 rounded-xl mx-3 bg-zinc-900"
                                />
                                <View className="flex-1">
                                    <Text className={`font-bold text-sm ${isCurrent ? 'text-purple-400' : 'text-white'}`} numberOfLines={1}>
                                        {song.title}
                                    </Text>
                                    <Text className="text-zinc-500 text-xs" numberOfLines={1}>
                                        {song.artist}
                                    </Text>
                                </View>
                                <View className="flex-row items-center space-x-3">
                                    {song.duration > 0 && (
                                        <Text className="text-zinc-500 text-xs tabular-nums">
                                            {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                                        </Text>
                                    )}
                                    <SongOptions song={song} />
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}
