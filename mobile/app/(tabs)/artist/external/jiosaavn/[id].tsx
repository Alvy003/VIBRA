import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStreamStore } from '@/stores/useStreamStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { ChevronLeft, Play, Pause, MoreVertical, BadgeCheck, Share2, Music } from 'lucide-react-native';
import SongOptions from '@/components/SongOptions';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveAssetUrl } from '@/lib/url';
import { useDynamicColors } from '@/hooks/useDynamicColors';

const { width } = Dimensions.get('window');
const ACCENT_COLOR = '#8B5CF6';

export default function ExternalArtistScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const {
        currentExternalArtist: artist,
        isLoadingDetail,
        fetchExternalArtist,
        clearDetail
    } = useStreamStore();

    const { currentTrack, isPlaying, initializeQueue } = usePlayerStore();
    
    const artworkUrl = resolveAssetUrl(artist?.imageUrl);
    const colors = useDynamicColors(artworkUrl);

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
                <ActivityIndicator size="large" color={ACCENT_COLOR} />
            </View>
        );
    }

    const isCurrentArtistPlaying = artist.topSongs?.some((s: any) => s.externalId === currentTrack?.id) && isPlaying;

    return (
        <View className="flex-1 bg-black">
            {/* Header / Navigation */}
            <SafeAreaView edges={['top']} className="absolute z-10 px-4 flex-row items-center justify-between w-full">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-8 h-8 rounded-full bg-black/40 items-center justify-center"
                >
                    <ChevronLeft size={24} color="#ffffff" />
                </TouchableOpacity>
            </SafeAreaView>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 110 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Visual Header */}
                <LinearGradient
                    colors={[`${colors.primary}90`, colors.darkened, 'black']}
                    style={{ height: 440, paddingHorizontal: 20, paddingTop: 60, alignItems: 'center' }}
                >
                    <View style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 }}>
                        <Image
                            source={{ uri: artworkUrl }}
                            style={{ width: width * 0.55, height: width * 0.55, borderRadius: width * 0.275 }}
                            contentFit="cover"
                            transition={200}
                        />
                    </View>
                    
                    <View className="w-full mt-8 items-center">
                        <View className="flex-row items-center space-x-2">
                             <Text className="text-white text-3xl font-bold leading-tight" numberOfLines={1}>{artist.name}</Text>
                             <BadgeCheck size={24} color={ACCENT_COLOR} fill="white" />
                        </View>
                        <Text className="text-white text-xs font-bold uppercase tracking-wider mt-2">VIBRA • ARTIST</Text>
                        {artist.followerCount > 0 && (
                            <Text className="text-zinc-400 text-sm font-medium mt-1">
                                {artist.followerCount.toLocaleString()} Monthly Listeners
                            </Text>
                        )}
                    </View>
                </LinearGradient>

                {/* Actions Bar */}
                <View className="px-5 py-2 flex-row items-center justify-between">
                    <View className="flex-row items-center space-x-7">
                        <TouchableOpacity className="px-5 py-1.5 rounded-full border border-zinc-600">
                             <Text className="text-white font-bold text-xs uppercase tracking-widest">Follow</Text>
                        </TouchableOpacity>
                        <TouchableOpacity>
                            <Share2 size={24} color="#b3b3b3" />
                        </TouchableOpacity>
                        <TouchableOpacity>
                            <MoreVertical size={24} color="#b3b3b3" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={() => handlePlayTopSongs(0)}
                        style={{ backgroundColor: ACCENT_COLOR }}
                        className="w-16 h-16 rounded-full items-center justify-center shadow-lg"
                    >
                        {isCurrentArtistPlaying ? (
                            <Pause size={32} color="black" fill="black" />
                        ) : (
                            <Play size={32} color="black" fill="black" className="ml-1" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Popular Tracks */}
                <View className="mt-8">
                    <Text className="text-white text-xl font-bold px-5 mb-4">Popular</Text>
                    {artist.topSongs?.map((song: any, index: number) => {
                        const isCurrent = currentTrack?.id === song.externalId;
                        const songArtwork = song.imageUrl || artist.imageUrl;

                        return (
                            <TouchableOpacity
                                key={song.externalId}
                                onPress={() => handlePlayTopSongs(index)}
                                className="flex-row items-center px-5 py-3"
                                activeOpacity={0.7}
                            >
                                <Text className={`w-6 text-sm font-medium ${isCurrent ? 'text-[#8B5CF6]' : 'text-zinc-500'}`}>
                                    {index + 1}
                                </Text>
                                <View className="w-12 h-12 rounded-sm mx-3 overflow-hidden bg-zinc-900 items-center justify-center">
                                    {!!songArtwork ? (
                                        <Image
                                            source={{ uri: resolveAssetUrl(songArtwork) }}
                                            style={{ width: '100%', height: '100%' }}
                                            contentFit="cover"
                                            placeholder={null}
                                        />
                                    ) : (
                                        <Music size={20} color="#52525b" />
                                    )}
                                </View>
                                <View className="flex-1">
                                    <Text 
                                        className={`font-semibold text-base ${isCurrent ? 'text-[#8B5CF6]' : 'text-white'}`} 
                                        numberOfLines={1}
                                    >
                                        {song.title}
                                    </Text>
                                    <Text className="text-zinc-500 text-xs" numberOfLines={1}>
                                        {(artist.followerCount || 0).toLocaleString()} streams
                                    </Text>
                                </View>
                                <SongOptions song={song} />
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Albums Rail */}
                {artist.topAlbums?.length > 0 && (
                    <View className="mt-10">
                        <View className="px-5 mb-4 flex-row items-center justify-between">
                            <Text className="text-white text-xl font-bold">Discography</Text>
                            <TouchableOpacity>
                                <Text className="text-zinc-400 text-xs font-bold uppercase tracking-widest">See All</Text>
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
                                        // Update to the new tab-based route
                                        router.push(`/(tabs)/album/external/jiosaavn/${cleanId}` as any);
                                    }}
                                    className="mr-5 w-36"
                                >
                                    <Image
                                        source={{ uri: resolveAssetUrl(album.imageUrl) }}
                                        className="w-36 h-36 rounded-md mb-2 bg-zinc-900 shadow-sm"
                                        contentFit="cover"
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
