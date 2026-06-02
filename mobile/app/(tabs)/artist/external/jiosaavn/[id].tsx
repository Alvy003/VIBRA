import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ScrollView, StyleSheet, InteractionManager, BackHandler } from 'react-native';
import { Image } from 'expo-image';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    useAnimatedScrollHandler, 
    interpolate, 
    Extrapolate 
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter, useGlobalSearchParams } from 'expo-router';
import { useStreamStore } from '@/stores/useStreamStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { ArrowLeft, MoreVertical, Music } from 'lucide-react-native';
import SongOptions from '@/components/SongOptions';
import { useSavedItemsStore } from '@/stores/useSavedItemsStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveAssetUrl } from '@/lib/url';
import { useDynamicColors } from '@/hooks/useDynamicColors';
import { ArtistSkeleton } from '@/components/Skeleton';
import { SharpPause, SharpPlay, SharpShuffle } from '@/components/SharpIcons';
import Colors from '@/constants/Colors';

interface ArtistHeaderProps {
    artist: any;
    artworkUrl: string | null | undefined;
    isCurrentArtistPlaying: boolean;
    onPlayTopSongs: (index: number) => void;
}

const ArtistHeader = React.memo<ArtistHeaderProps>(({
    artist,
    artworkUrl,
    isCurrentArtistPlaying,
    onPlayTopSongs
}) => (
    <View style={{ height: 440 }}>
        <Image
            source={{ uri: artworkUrl ?? undefined }}
            style={{ width: '100%', height: '100%', position: 'absolute' }}
            contentFit="cover"
            transition={0}
            cachePolicy="memory-disk"
        />
        <LinearGradient
            colors={['transparent', 'rgba(9,9,11,0.2)', 'rgba(9,9,11,0.8)', Colors.background]}
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
));

const { width } = Dimensions.get('window');

export default function ExternalArtistScreen() {
    const { id } = useLocalSearchParams();
    const { from } = useGlobalSearchParams();
    const router = useRouter();
    const scrollRef = React.useRef<ScrollView>(null);
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

    const handleBack = useCallback(() => {
        // If we have a clear context of where we came from, use it to switch back to that tab
        if (from === 'search') {
            router.push('/(tabs)/search');
            return;
        } 
        
        if (from === 'library') {
            router.push('/(tabs)/library');
            return;
        }

        if (from === 'home') {
            router.push('/(tabs)');
            return;
        }

        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/library');
        }
    }, [from, router]);

    useEffect(() => {
        if (id) {
            // Reset scroll position on ID change
            scrollRef.current?.scrollTo({ y: 0, animated: false });
            
            setIsInitialLoading(true);
            fetchExternalArtist('jiosaavn', id as string);
        }
        return () => clearDetail();
    }, [id]);

    // Handle system back gesture
    useEffect(() => {
        const backAction = () => {
            handleBack();
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [handleBack]); // Depend on handleBack to avoid stale closures

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


    // 2. Sticky Navigation Header - Fades In with Gradient
    // Fallback to a greyish black (#121212) if image color isn't ready or matches the background
    const headerBaseColor = (colors.primary && colors.primary !== '#310a5b') ? colors.primary : Colors.surface;

    return (
        <View className="flex-1" style={{ backgroundColor: '#09090b' }}>
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
                        <ArrowLeft size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                </SafeAreaView>
            </Animated.View>

            {/* 2. Sticky Navigation Header - Fades In */}
            <Animated.View 
                style={[stickyHeaderStyle, { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 }]}
                pointerEvents="box-none"
            >
                {/* Opaque Background Layer */}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface }]} />
                
                {/* Gradient Layer for depth */}
                <LinearGradient
                    colors={[headerBaseColor, Colors.background]}
                    style={StyleSheet.absoluteFill}
                />
                
                <SafeAreaView edges={['top']} className="px-4 py-2 flex-row items-center w-full">
                    <TouchableOpacity
                        onPress={handleBack}
                        className="w-10 h-10 items-center justify-center mr-2"
                        activeOpacity={0.7}
                    >
                        <ArrowLeft size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    
                    <Animated.View style={[headerTitleStyle]} className="flex-1">
                        <Text className="text-white text-lg font-semibold" numberOfLines={1}>
                            {artist.name}
                        </Text>
                    </Animated.View>
                </SafeAreaView>
            </Animated.View>

            <Animated.ScrollView
                ref={scrollRef as any}
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 110 }}
                showsVerticalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
            >
                <ArtistHeader
                    artist={artist}
                    artworkUrl={artworkUrl}
                    isCurrentArtistPlaying={isCurrentArtistPlaying}
                    onPlayTopSongs={handlePlayTopSongs}
                />

                {/* Actions Bar */}
                <View className="px-5 py-4 flex-row items-center justify-between" style={{ backgroundColor: Colors.background }}>
                    <View className="flex-row items-center gap-6">
                        <TouchableOpacity 
                            onPress={handleFollowToggle}
                            className={`px-4 py-1.5 rounded-md border ${isFollowing ? `bg-transparent border-zinc-500` : 'border-zinc-500'}`}
                            activeOpacity={0.7}
                        >
                            <Text className="font-semibold text-xs uppercase tracking-tight text-white">
                                {isFollowing ? 'Following' : 'Follow'}
                            </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity activeOpacity={0.7}>
                            <MoreVertical size={24} color="#b3b3b3" />
                        </TouchableOpacity>
                    </View>
                   
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
                        <TouchableOpacity activeOpacity={0.7}>
                            <SharpShuffle size={24} color={Colors.accent} />
                        </TouchableOpacity>
                    
                        <TouchableOpacity
                            onPress={() => handlePlayTopSongs(0)}
                            style={{ backgroundColor: Colors.accent, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 12 }}
                            className="w-14 h-14 rounded-full items-center justify-center"
                            activeOpacity={0.8}
                        >
                            {isCurrentArtistPlaying ? (
                                <SharpPause size={28} color="black" />
                            ) : (
                                <SharpPlay size={28} color="black" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>


                {/* Popular Tracks */}
                <View className="mt-4">
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
                                <View className="w-12 h-12 rounded-sm mx-3 overflow-hidden items-center justify-center" style={{ backgroundColor: Colors.surfaceLighter }}>
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
                                        style={{ color: isCurrent ? Colors.accent : '#ffffff' }}
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
                                        <View className="w-36 h-36 rounded-md mb-2 shadow-sm items-center justify-center overflow-hidden" style={{ backgroundColor: Colors.surfaceLighter }}>
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
                                        <Text className="text-white text-sm font-semibold" numberOfLines={1}>{album.title}</Text>
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
