import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { ChevronLeft, Play, Pause, Heart, MoreVertical, Share2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveAssetUrl } from '@/lib/url';
import { useDynamicColors } from '@/hooks/useDynamicColors';

import { FlashList } from '@shopify/flash-list';
import { MediaListSkeleton } from '@/components/Skeleton';
import { TrackListItem } from '@/components/TrackListItem';

const { width } = Dimensions.get('window');
const ACCENT_COLOR = '#8B5CF6';

export default function AlbumScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { currentAlbum, fetchAlbumById, isLoading, musicError } = useMusicStore();
    const { currentTrack, isPlaying, initializeQueue } = usePlayerStore();
    
    const artworkUrl = resolveAssetUrl(currentAlbum?.imageUrl);
    const colors = useDynamicColors(artworkUrl);

    useEffect(() => {
        if (id) fetchAlbumById(id as string);
    }, [id]);

    if (isLoading && !currentAlbum) {
        return <MediaListSkeleton />;
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

    const songs = (currentAlbum.songs || []) as any[];
    const isCurrentAlbumPlaying = songs.some((s: any) => s._id === currentTrack?.id) && isPlaying;

    const handlePlayAlbum = () => {
        if (songs.length > 0) {
            const tracks = songs.map(s => ({
                id: s._id,
                url: s.audioUrl,
                title: s.title,
                artist: s.artist,
                artwork: s.imageUrl || currentAlbum.imageUrl,
                source: 'local'
            }));
            initializeQueue(tracks, 0);
        }
    };

    const handlePlayTrack = (song: any, index: number) => {
        const tracks = songs.map(s => ({
            id: s._id,
            url: s.audioUrl,
            title: s.title,
            artist: s.artist,
            artwork: s.imageUrl || currentAlbum.imageUrl,
            source: 'local'
        }));
        initializeQueue(tracks, index);
    };

    const ListHeader = () => (
        <View>
            {/* Visual Header */}
            <LinearGradient
                colors={[`${colors.primary}80`, colors.darkened, 'black']}
                style={{ height: 440, paddingHorizontal: 20, paddingTop: 60, alignItems: 'center' }}
            >
                <Image
                    source={{ uri: artworkUrl }}
                    style={{ width: width * 0.65, height: width * 0.65, borderRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15 }}
                    contentFit="cover"
                    transition={200}
                />
                
                <View className="w-full mt-10">
                    <Text className="text-white text-2xl font-bold mb-2 leading-tight" numberOfLines={2}>{currentAlbum.title}</Text>
                    <View className="flex-row items-center space-x-2">
                         <Text className="text-zinc-300 text-sm font-medium">{currentAlbum.artist}</Text>
                    </View>
                    <View className="flex-row items-center mt-1">
                        <Text className="text-white text-xs font-bold uppercase tracking-wider">VIBRA • ALBUM</Text>
                        <Text className="text-zinc-500 text-xs ml-2">• 2024</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Actions Bar */}
            <View className="px-5 py-4 flex-row items-center justify-between">
                <View className="flex-row items-center space-x-7">
                    <TouchableOpacity>
                        <Heart size={26} color="#b3b3b3" />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Share2 size={24} color="#b3b3b3" />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <MoreVertical size={24} color="#b3b3b3" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={handlePlayAlbum}
                    style={{ backgroundColor: ACCENT_COLOR }}
                    className="w-16 h-16 rounded-full items-center justify-center shadow-lg"
                >
                    {isCurrentAlbumPlaying ? (
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
                isCurrent={currentTrack?.id === song._id}
                onPress={() => handlePlayTrack(song, index)}
                playlistImageUrl={currentAlbum.imageUrl}
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
                data={songs}
                renderItem={renderTrackItem}
                keyExtractor={(item) => item._id}
                ListHeaderComponent={ListHeader}
                overrideProps={{ estimatedItemSize: 60 }}
                contentContainerStyle={{ paddingBottom: 110 }}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}
