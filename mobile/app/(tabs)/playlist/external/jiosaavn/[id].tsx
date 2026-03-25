import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStreamStore } from '@/stores/useStreamStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { ChevronLeft, Play, Pause, Heart, MoreVertical, Search, ArrowUpDown, Share2, ArrowDownToLine, Music } from 'lucide-react-native';
import SongOptions from '@/components/SongOptions';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveAssetUrl } from '@/lib/url';
import { useDynamicColors } from '@/hooks/useDynamicColors';

import { FlashList } from '@shopify/flash-list';
import { MediaListSkeleton } from '@/components/Skeleton';
import { TrackListItem } from '@/components/TrackListItem';

const { width } = Dimensions.get('window');
const ACCENT_COLOR = '#8B5CF6';

export default function ExternalPlaylistScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const {
        currentExternalPlaylist: playlist,
        isLoadingDetail,
        fetchExternalPlaylist,
        clearDetail
    } = useStreamStore();

    const { currentTrack, isPlaying, initializeQueue } = usePlayerStore();
    
    const artworkUrl = resolveAssetUrl(playlist?.imageUrl);
    const colors = useDynamicColors(artworkUrl);

    useEffect(() => {
        if (id) {
            fetchExternalPlaylist('jiosaavn', id as string);
        }
        return () => clearDetail();
    }, [id]);

    const handlePlayAll = () => {
        if (!playlist?.songs?.length) return;

        const tracks = playlist.songs.map((s: any) => ({
            id: s.externalId,
            url: s.streamUrl,
            title: s.title,
            artist: s.artist,
            artwork: s.imageUrl || playlist.imageUrl,
            source: 'jiosaavn'
        }));

        initializeQueue(tracks, 0);
    };

    const handlePlayTrack = (track: any, index: number) => {
        const tracks = playlist.songs.map((s: any) => ({
            id: s.externalId,
            url: s.streamUrl,
            title: s.title,
            artist: s.artist,
            artwork: s.imageUrl || playlist.imageUrl,
            source: 'jiosaavn'
        }));

        initializeQueue(tracks, index);
    };

    if (isLoadingDetail || !playlist) {
        return <MediaListSkeleton />;
    }

    const isCurrentPlaylistPlaying = playlist.songs?.some((s: any) => s.externalId === currentTrack?.id) && isPlaying;

    const ListHeader = () => (
        <View>
            {/* Visual Header */}
            <LinearGradient
                colors={[`${colors.primary}90`, colors.darkened, 'black']}
                style={{ height: 440, paddingHorizontal: 20, paddingTop: 60, alignItems: 'center' }}
            >
                <Image
                    source={{ uri: artworkUrl }}
                    style={{ width: width * 0.65, height: width * 0.65, borderRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15 }}
                    contentFit="cover"
                    transition={200}
                />
                
                <View className="w-full mt-10">
                    <Text className="text-white text-3xl font-bold mb-2 leading-tight" numberOfLines={2}>{playlist.title}</Text>
                    <Text className="text-zinc-400 text-sm font-medium mb-1" numberOfLines={2}>{playlist.description || 'Curated for you'}</Text>
                    <View className="flex-row items-center">
                        <Text className="text-white text-xs font-bold uppercase tracking-wider">VIBRA • PLAYLIST</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Sub-header: Search & Sort */}
            <View className="px-5 py-2 flex-row items-center space-x-3">
                <View className="flex-1 flex-row items-center bg-zinc-800/60 rounded-md px-3 py-1.5 h-10">
                     <Search size={16} color="#b3b3b3" />
                     <Text className="text-zinc-400 text-sm ml-2 font-medium">Find in playlist</Text>
                </View>
                <TouchableOpacity className="bg-zinc-800/60 rounded-md px-3 h-10 items-center justify-center flex-row">
                     <Text className="text-white text-sm font-bold mr-2">Sort</Text>
                     <ArrowUpDown size={14} color="white" />
                </TouchableOpacity>
            </View>

            {/* Actions Bar */}
            <View className="px-5 py-4 flex-row items-center justify-between">
                <View className="flex-row items-center space-x-7">
                    <TouchableOpacity>
                        <Heart size={26} color="#b3b3b3" />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <ArrowDownToLine size={24} color="#b3b3b3" />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Share2 size={24} color="#b3b3b3" />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <MoreVertical size={24} color="#b3b3b3" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={handlePlayAll}
                    style={{ backgroundColor: ACCENT_COLOR }}
                    className="w-16 h-16 rounded-full items-center justify-center shadow-lg"
                >
                    {isCurrentPlaylistPlaying ? (
                        <Pause size={32} color="black" fill="black" />
                    ) : (
                        <Play size={32} color="black" fill="black" className="ml-1" />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderTrackItem = ({ item: song, index }: { item: any, index: number }) => {
        return (
            <TrackListItem
                track={song}
                index={index}
                isCurrent={currentTrack?.id === song.externalId}
                onPress={() => handlePlayTrack(song, index)}
                playlistImageUrl={playlist.imageUrl}
            />
        );
    };

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

            <FlashList
                data={playlist.songs || []}
                renderItem={renderTrackItem}
                keyExtractor={(item) => item.externalId}
                ListHeaderComponent={ListHeader}
                overrideProps={{ estimatedItemSize: 72 }}
                contentContainerStyle={{ paddingBottom: 110 }}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}
