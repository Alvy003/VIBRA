import React, { useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStreamStore } from '@/stores/useStreamStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { ChevronLeft, Play, Pause, User, MoreVertical, Star, BadgeCheck, Music, Disc, Clock } from 'lucide-react-native';
import SongOptions from '@/components/SongOptions';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ExternalArtistScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const {
        currentExternalArtist: artist,
        isLoadingDetail,
        fetchExternalArtist,
        clearDetail
    } = useStreamStore();

    const { currentTrack, isPlaying, togglePlay, initializeQueue } = usePlayerStore();

    useEffect(() => {
        if (id) {
            fetchExternalArtist('jiosaavn', id as string);
        }
        return () => clearDetail();
    }, [id]);

    const handlePlayTopSongs = (startIndex = 0) => {
        if (!artist?.topSongs?.length) return;

        const tracks = artist.topSongs.map((s: any) => ({
            id: s.externalId,
            url: s.streamUrl,
            title: s.title,
            artist: s.artist,
            artwork: s.imageUrl || artist.imageUrl,
            source: 'jiosaavn'
        }));

        initializeQueue(tracks, startIndex);
    };

    if (isLoadingDetail || !artist) {
        return (
            <View className="flex-1 bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#9333ea" />
            </View>
        );
    }

    const isCurrentArtistPlaying = artist.topSongs?.some((s: any) => s.externalId === currentTrack?.id) && isPlaying;

    return (
        <View className="flex-1 bg-zinc-950">
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 110 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Immersive Header */}
                <View className="relative h-96">
                    <Image
                        source={{ uri: artist.imageUrl }}
                        className="absolute inset-0 w-full h-full"
                        resizeMode="cover"
                    />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)', 'rgb(9, 9, 11)']}
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

                    <View className="absolute bottom-8 left-0 right-0 items-center px-6">
                        <View className="w-40 h-40 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl mb-4">
                            <Image
                                source={{ uri: artist.imageUrl }}
                                className="w-full h-full"
                            />
                        </View>
                        <View className="flex-row items-center space-x-2">
                            <Text className="text-white text-3xl font-bold text-center" numberOfLines={1}>{artist.name}</Text>
                            {artist.isVerified && <BadgeCheck size={24} color="#3b82f6" />}
                        </View>
                        {artist.followerCount > 0 && (
                            <Text className="text-zinc-400 text-sm font-medium mt-1">
                                {artist.followerCount.toLocaleString()} Followers
                            </Text>
                        )}
                    </View>
                </View>

                {/* Actions */}
                <View className="px-6 py-4 flex-row items-center justify-between">
                    <View className="flex-row items-center space-x-6">
                        <TouchableOpacity
                            onPress={() => handlePlayTopSongs(0)}
                            className="px-8 py-3 rounded-full bg-purple-600 flex-row items-center space-x-2 shadow-lg"
                        >
                            {isCurrentArtistPlaying ? (
                                <Pause size={20} color="white" fill="white" />
                            ) : (
                                <Play size={20} color="white" fill="white" />
                            )}
                            <Text className="text-white font-bold uppercase tracking-wider text-sm">Play</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className="px-6 py-3 rounded-full border border-white/20">
                            <Text className="text-white font-bold uppercase tracking-wider text-sm">Follow</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity className="w-10 h-10 rounded-full border border-white/10 items-center justify-center">
                        <MoreVertical size={20} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Popular Tracks */}
                <View className="mt-4 px-2">
                    <View className="px-4 mb-4">
                        <Text className="text-white text-lg font-bold">Popular</Text>
                    </View>
                    {artist.topSongs?.map((song: any, index: number) => {
                        const isCurrent = currentTrack?.id === song.externalId;
                        return (
                            <TouchableOpacity
                                key={song.externalId}
                                onPress={() => handlePlayTopSongs(index)}
                                className={`flex-row items-center px-4 py-3 rounded-2xl ${isCurrent ? 'bg-purple-500/10' : ''}`}
                            >
                                <View className="w-6 items-center">
                                    <Text className={`text-xs font-medium ${isCurrent ? 'text-purple-400' : 'text-zinc-500'}`}>
                                        {index + 1}
                                    </Text>
                                </View>
                                <Image
                                    source={{ uri: song.imageUrl || artist.imageUrl }}
                                    className="w-12 h-12 rounded-xl mx-3 bg-zinc-900"
                                />
                                <View className="flex-1">
                                    <Text className={`font-bold text-sm ${isCurrent ? 'text-purple-400' : 'text-white'}`} numberOfLines={1}>
                                        {song.title}
                                    </Text>
                                    <Text className="text-zinc-500 text-xs" numberOfLines={1}>
                                        {song.album || artist.name}
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

                {/* Albums Rail */}
                {artist.topAlbums?.length > 0 && (
                    <View className="mt-8">
                        <View className="px-6 mb-4 flex-row items-center justify-between">
                            <Text className="text-white text-lg font-bold">Albums</Text>
                            <TouchableOpacity>
                                <Text className="text-zinc-400 text-xs font-bold uppercase">See All</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 20 }}
                        >
                            {artist.topAlbums.map((album: any) => (
                                <TouchableOpacity
                                    key={album.externalId}
                                    onPress={() => {
                                        const cleanId = album.externalId.replace('jiosaavn_album_', '');
                                        router.push(`/album/external/jiosaavn/${cleanId}` as any);
                                    }}
                                    className="mr-6 w-36"
                                >
                                    <Image
                                        source={{ uri: album.imageUrl }}
                                        className="w-36 h-36 rounded-2xl mb-2 bg-zinc-900 border border-white/5"
                                    />
                                    <Text className="text-white text-sm font-bold" numberOfLines={1}>{album.title}</Text>
                                    <Text className="text-zinc-500 text-xs">{album.year || 'Album'}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
