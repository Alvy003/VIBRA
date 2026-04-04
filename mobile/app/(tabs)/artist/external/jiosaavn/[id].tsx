import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    useAnimatedScrollHandler, 
    interpolate, 
    Extrapolate 
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStreamStore } from '@/stores/useStreamStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { ArrowLeft, Play, Pause, MoreVertical, Music, Shuffle } from 'lucide-react-native';
import SongOptions from '@/components/SongOptions';
import { useSavedItemsStore } from '@/stores/useSavedItemsStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveAssetUrl } from '@/lib/url';
import { useDynamicColors } from '@/hooks/useDynamicColors';
import { ArtistSkeleton } from '@/components/Skeleton';

const { width } = Dimensions.get('window');
const ACCENT_COLOR = '#9333EA';

export default function ExternalArtistScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    
    const {
        currentExternalArtist: artist,
        isLoadingDetail,
        fetchExternalArtist,
        clearDetail
    } = useStreamStore();

    const { currentTrack, isPlaying, initializeQueue } = usePlayerStore();
    const { toggleSaveItem, isItemSaved } = useSavedItemsStore();
    const [showAllSongs, setShowAllSongs] = useState(false);

    const scrollY = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });
    
    const artworkUrl = resolveAssetUrl(artist?.imageUrl);
    const colors = useDynamicColors(artworkUrl);

    useEffect(() => {
        if (id) {
            setIsInitialLoading(true);
            fetchExternalArtist('jiosaavn', id as string);
        }
        return () => clearDetail();
    }, [id]);

    useEffect(() => {
        if (!isLoadingDetail && artist) {
            // Short delay to let layout settle
            const timer = setTimeout(() => setIsInitialLoading(false), 50);
            return () => clearTimeout(timer);
        }
    }, [isLoadingDetail, artist]);

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

    const floatingHeaderStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollY.value,
            [60, 100],
            [1, 0],
            Extrapolate.CLAMP
        );
        return { opacity: isInitialLoading ? 0 : opacity };
    });

    const stickyHeaderStyle = useAnimatedStyle(() => {
        // Only show if we've moved past initial state and scrolled enough
        const opacity = interpolate(
            scrollY.value,
            [180, 280],
            [0, 1],
            Extrapolate.CLAMP
        );
        return { opacity: isInitialLoading ? 0 : opacity };
    });

    const headerTitleStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollY.value,
            [300, 360],
            [0, 1],
            Extrapolate.CLAMP
        );
        const translateY = interpolate(
            scrollY.value,
            [300, 360],
            [12, 0],
            Extrapolate.CLAMP
        );
        return {
            opacity,
            transform: [{ translateY }],
        };
    });

    if (isLoadingDetail || !artist) {
        return <ArtistSkeleton />;
    }

    const isCurrentArtistPlaying = artist.topSongs?.some((s: any) => s.externalId === currentTrack?.id) && isPlaying;
    const isFollowing = isItemSaved(artist.externalId || (id as string));

    const handleFollowToggle = async () => {
        await toggleSaveItem({
            ...artist,
            title: artist.name,
            type: 'artist'
        });
    };

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            // Fallback to library if no history
            router.replace('/(tabs)/library');
        }
    };

    // 2. Sticky Navigation Header - Fades In with Gradient
    // Fallback to a greyish black (#121212) if image color isn't ready or matches the background
    const headerBaseColor = (colors.primary && colors.primary !== '#310a5b') ? colors.primary : '#121212';

    return (
        <View className="flex-1 bg-black">
            {/* 1. Floating Back Button - Fades Out Early */}
            <Animated.View 
                style={[floatingHeaderStyle, { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40 }]}
                pointerEvents="box-none"
            >
                <SafeAreaView edges={['top']} className="px-4 py-2">
                    <TouchableOpacity
                        onPress={handleBack}
                        className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
                        activeOpacity={0.7}
                    >
                        <ArrowLeft size={24} color="#ffffff" />
                    </TouchableOpacity>
                </SafeAreaView>
            </Animated.View>

            {/* 2. Sticky Navigation Header - Fades In */}
            <Animated.View 
                style={[stickyHeaderStyle, { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 }]}
                pointerEvents="box-none"
            >
                {/* Opaque Background Layer */}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#121212' }]} />
                
                {/* Gradient Layer for depth */}
                <LinearGradient
                    colors={[headerBaseColor, '#000000']}
                    style={StyleSheet.absoluteFill}
                />
                
                <SafeAreaView edges={['top']} className="px-4 py-2 flex-row items-center w-full">
                    <TouchableOpacity
                        onPress={handleBack}
                        className="w-10 h-10 items-center justify-center mr-2"
                        activeOpacity={0.7}
                    >
                        <ArrowLeft size={24} color="#ffffff" />
                    </TouchableOpacity>
                    
                    <Animated.View style={[headerTitleStyle]} className="flex-1">
                        <Text className="text-white text-lg font-bold" numberOfLines={1}>
                            {artist.name}
                        </Text>
                    </Animated.View>
                </SafeAreaView>
            </Animated.View>

            <Animated.ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 110 }}
                showsVerticalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
            >
                {/* Visual Header - Full Bleed */}
                <View style={{ height: 440 }}>
                    <Image
                        source={{ uri: artworkUrl }}
                        style={{ width: '100%', height: '100%', position: 'absolute' }}
                        contentFit="cover"
                        transition={300}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)', 'black']}
                        style={{ position: 'absolute', width: '100%', height: '100%' }}
                    />
                    
                    {/* Artist Title Overlay */}
                    <View className="absolute bottom-6 left-5 right-5">
                        <Text 
                            className="text-white text-5xl font-extrabold tracking-tighter" 
                            numberOfLines={2}
                            style={{ textShadowColor: 'rgba(0, 0, 0, 0.4)', textShadowOffset: { width: 0, height: 2 }, shadowRadius: 10 }}
                        >
                            {artist.name}
                        </Text>
                        
                        {artist.followerCount > 0 && (
                            <Text className="text-zinc-300 text-sm font-semibold mt-4">
                                {artist.followerCount.toLocaleString()} monthly listeners
                            </Text>
                        )}
                    </View>
                </View>

                {/* Actions Bar */}
                <View className="px-5 py-4 flex-row items-center justify-between bg-black">
                    <View className="flex-row items-center gap-6">
                        <TouchableOpacity 
                            onPress={handleFollowToggle}
                            className={`px-4 py-1.5 rounded-md border ${isFollowing ? `bg-transparent border-zinc-500` : 'border-zinc-500'}`}
                            activeOpacity={0.7}
                        >
                            <Text className="font-bold text-xs uppercase tracking-tight text-white">
                                {isFollowing ? 'Following' : 'Follow'}
                            </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity activeOpacity={0.7}>
                            <Shuffle size={24} color={ACCENT_COLOR} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity activeOpacity={0.7}>
                            <MoreVertical size={24} color="#b3b3b3" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={() => handlePlayTopSongs(0)}
                        style={{ backgroundColor: ACCENT_COLOR, shadowColor: ACCENT_COLOR, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 12 }}
                        className="w-14 h-14 rounded-full items-center justify-center"
                        activeOpacity={0.8}
                    >
                        {isCurrentArtistPlaying ? (
                            <Pause size={28} color="black" fill="black" />
                        ) : (
                            <Play size={28} color="black" fill="black" className="ml-1" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Promotional Banner */}
                {artist.topSongs?.[0] && (
                    <TouchableOpacity 
                        className="mx-5 mb-2 mt-2 bg-zinc-900/50 rounded-md p-3 flex-row items-center border border-zinc-800/50"
                        activeOpacity={0.7}
                        onPress={() => handlePlayTopSongs(0)}
                    >
                        <View className="w-10 h-10 rounded-sm overflow-hidden mr-3">
                            <Image 
                                source={{ uri: resolveAssetUrl(artist.topSongs[0].imageUrl || artist.imageUrl) }}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </View>
                        <View className="flex-1">
                            <Text className="text-white font-bold text-xs">Listen to the new track</Text>
                            <Text className="text-zinc-400 text-[10px]" numberOfLines={1}>{artist.topSongs[0].title}</Text>
                        </View>
                        <ArrowLeft size={16} color="#71717a" style={{ transform: [{ rotate: '180deg' }] }} />
                    </TouchableOpacity>
                )}

                {/* Popular Tracks */}
                <View className="mt-8">
                    <Text className="text-white/95 text-xl font-extrabold px-5 mb-4">Popular</Text>
                    {artist.topSongs?.slice(0, showAllSongs ? undefined : 10).map((song: any, index: number) => {
                        const isCurrent = currentTrack?.id === song.externalId;
                        const songArtwork = song.imageUrl || artist.imageUrl;

                        return (
                            <TouchableOpacity
                                key={song.externalId}
                                onPress={() => handlePlayTopSongs(index)}
                                className="flex-row items-center px-5 py-3"
                                activeOpacity={0.7}
                            >
                                <Text 
                                    style={{ color: '#d1d1d1ff' }} 
                                    className="w-6 text-sm font-medium"
                                >
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
                                        style={{ color: isCurrent ? ACCENT_COLOR : '#ffffff' }}
                                        className="font-medium text-base" 
                                        numberOfLines={1}
                                    >
                                        {song.title}
                                    </Text>
                                    <Text className="text-zinc-400 tracking-wide text-xs" numberOfLines={1}>
                                        {(artist.followerCount || 0).toLocaleString()} streams
                                    </Text>
                                </View>
                                <SongOptions song={song} />
                            </TouchableOpacity>
                        );
                    })}

                    {artist.topSongs?.length > 10 && (
                        <TouchableOpacity 
                            onPress={() => setShowAllSongs(!showAllSongs)}
                            className="mx-auto items-center justify-center border border-zinc-500 rounded-full px-6 py-2 mt-6"
                            activeOpacity={0.7}
                        >
                            <Text className="text-zinc-300 font-extrabold text-xs">
                                {showAllSongs ? 'Show less' : 'See more'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Albums Rail */}
                {artist.topAlbums?.length > 0 && (
                    <View className="py-6">
                        <View className="px-5 mb-4 flex-row items-center justify-between">
                            <Text className="text-white/95 text-xl font-extrabold">Discography</Text>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 20 }}
                        >
                            {artist.topAlbums.slice(0, 6).map((album: any) => {
                                const albumArtwork = resolveAssetUrl(album.imageUrl);
                                return (
                                    <TouchableOpacity
                                        key={album.externalId}
                                        onPress={() => {
                                            const cleanId = album.externalId.replace('jiosaavn_album_', '');
                                            // Update to the new tab-based route
                                            router.push(`/(tabs)/album/external/jiosaavn/${cleanId}` as any);
                                        }}
                                        className="mr-5 w-36"
                                    >
                                        <View className="w-36 h-36 rounded-md mb-2 bg-zinc-900 shadow-sm items-center justify-center overflow-hidden">
                                            {albumArtwork ? (
                                                <Image
                                                    source={{ uri: albumArtwork }}
                                                    style={{ width: '100%', height: '100%' }}
                                                    contentFit="cover"
                                                    transition={200}
                                                />
                                            ) : (
                                                <Music size={40} color="#3f3f46" />
                                            )}
                                        </View>
                                        <Text className="text-white text-sm font-bold" numberOfLines={1}>{album.title}</Text>
                                        <Text className="text-zinc-500 text-xs">{album.year || 'Album'}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
            </Animated.ScrollView>
        </View>
    );
}
