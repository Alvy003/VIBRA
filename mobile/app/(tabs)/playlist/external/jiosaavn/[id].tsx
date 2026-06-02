import React, { useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    Alert,
    StyleSheet,
    BackHandler,
    Share
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, useGlobalSearchParams } from 'expo-router';
import { useStreamStore } from '@/stores/useStreamStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedScrollHandler,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';
import {
    ArrowLeft,
    Play,
    Pause,
    MoreVertical,
    CircleArrowDown,
    CirclePlus,
    Shuffle,
    Check,
    Share2,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveAssetUrl } from '@/lib/url';
import { useDynamicColors } from '@/hooks/useDynamicColors';
import { FlashList as OriginalFlashList } from '@shopify/flash-list';
import { MediaListSkeleton } from '@/components/Skeleton';
import { TrackListItem } from '@/components/TrackListItem';
import { useSavedItemsStore } from '@/stores/useSavedItemsStore';
import { useDownloadStore } from '@/stores/useDownloadStore';
import CollectionOptions, { CollectionOptionsRef } from '@/components/CollectionOptions';
import { DownloadedIcon } from '@/components/DownloadedIcon';
import { SharpPlay, SharpPause, SharpShuffle } from '@/components/SharpIcons';
import Colors from '@/constants/Colors';

const { width } = Dimensions.get('window');
const ACCENT_COLOR = Colors.accent;
const AnimatedFlashList = Animated.createAnimatedComponent(OriginalFlashList) as any;

interface ExternalPlaylistHeaderProps {
    displayPlaylist: any;
    artworkUrl: string | null | undefined;
    colors: any;
    isSaved: boolean;
    isPlaylistDownloaded: boolean;
    isCurrentPlaylistPlaying: boolean;
    shuffleMode: boolean;
    onToggleSave: () => void;
    onDownload: () => void;
    onToggleShuffle: () => void;
    onPlayAll: () => void;
    onPause: () => void;
    onOptions: () => void;
    onShare: () => void;
    width: number;
}

const ExternalPlaylistHeader = React.memo<ExternalPlaylistHeaderProps>(({
    displayPlaylist,
    artworkUrl,
    colors,
    isSaved,
    isPlaylistDownloaded,
    isCurrentPlaylistPlaying,
    shuffleMode,
    onToggleSave,
    onDownload,
    onToggleShuffle,
    onPlayAll,
    onPause,
    onOptions,
    onShare,
    width,
}) => (
    <View style={{ backgroundColor: colors.primary }}>
        <LinearGradient
            colors={[
                'transparent',
                'rgba(9,9,11,0.05)',
                'rgba(9,9,11,0.15)',
                'rgba(9,9,11,0.3)',
                'rgba(9,9,11,0.5)',
                'rgba(9,9,11,0.7)',
                'rgba(9,9,11,0.85)',
                Colors.background,
                Colors.background,
            ]}
            locations={[0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.78, 0.9, 1]}
            style={{ paddingTop: 60, paddingBottom: 10 }}
        >
            <View className="items-center px-6">
                {/* Artwork */}
                <View style={{
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.6,
                    shadowRadius: 24,
                    elevation: 20,
                }}>
                    <Image
                        source={{ uri: artworkUrl ?? undefined }}
                        style={{ width: width * 0.62, height: width * 0.62, borderRadius: 2 }}
                        contentFit="cover"
                        transition={0}
                        cachePolicy="memory-disk"
                    />
                </View>

                {/* Title & Info */}
                <View className="w-full mt-5">
                    <Text className="text-white text-[24px] font-semibold mb-2 leading-tight tracking-tight" numberOfLines={1}>
                        {displayPlaylist.title}
                    </Text>
                    <Text className="text-zinc-300 text-sm font-medium mb-4 leading-5" numberOfLines={1}>
                        {displayPlaylist.description || 'Curated for you by Vibra'}
                    </Text>

                    {/* Metadata Row */}
                    <View className="flex-row items-center">
                        <Image
                            source={require('@/assets/images/vibra-white.png')}
                            style={{ width: 18, height: 18 }}
                            contentFit="contain"
                        />
                        <Text className="text-white text-[11px] font-semibold tracking-wider">
                            Vibra <Text className="text-zinc-400 font-medium lowercase">• {displayPlaylist.songs?.length || 0} tracks</Text>
                        </Text>
                    </View>
                </View>
            </View>

             {/* Action Bar */}
            <View className="px-6 pt-4 pb-0 flex-row items-center justify-between">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
                    <TouchableOpacity onPress={onToggleSave} activeOpacity={0.7}>
                        {isSaved ? (
                            <View style={{ width: 22, height: 22, backgroundColor: ACCENT_COLOR, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}>
                                <Check size={14} color="black" strokeWidth={4} />
                            </View>
                        ) : (
                            <CirclePlus size={24} color="#b3b3b3" />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onDownload} activeOpacity={0.7}>
                        {isPlaylistDownloaded ? (
                            <DownloadedIcon size={22} />
                        ) : (
                            <CircleArrowDown size={24} color="#b3b3b3" />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onOptions} activeOpacity={0.7}>
                        <MoreVertical size={22} color="#b3b3b3" />
                    </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
                    <TouchableOpacity onPress={onToggleShuffle} activeOpacity={0.7}>
                        <View style={{ alignItems: 'center' }}>
                            <SharpShuffle size={24} color={shuffleMode ? ACCENT_COLOR : "#b3b3b3"} />
                            {shuffleMode && (
                                <View style={{
                                width: 4,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: ACCENT_COLOR,
                                marginTop: 2,
                                position: 'absolute',
                                bottom: -6
                                }} />
                            )}
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={isCurrentPlaylistPlaying ? onPause : onPlayAll}
                        style={{ backgroundColor: ACCENT_COLOR }}
                        className="w-[52px] h-[52px] rounded-full items-center justify-center shadow-2xl"
                        activeOpacity={0.8}
                    >
                        {isCurrentPlaylistPlaying ? (
                            <SharpPause size={26} color="black" />
                        ) : (
                            <SharpPlay size={26} color="black" style={{ marginLeft: 3 }} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </LinearGradient>
    </View>
));

// ─────────────────────────────────────────────────────────────────────────────

export default function ExternalPlaylistScreen() {
    const { id } = useLocalSearchParams();
    const { from } = useGlobalSearchParams();
    const router = useRouter();
    const listRef = React.useRef<any>(null);
    const optionsRef = React.useRef<CollectionOptionsRef>(null);
    const [isInitialLoading, setIsInitialLoading] = React.useState(true);

    const {
        currentExternalPlaylist: playlist,
        isLoadingDetail,
        fetchExternalPlaylist,
        clearDetail
    } = useStreamStore();

    const {
        currentTrack,
        isPlaying,
        initializeQueue,
        pauseTrack,
        shuffleMode,
        toggleShuffle
    } = usePlayerStore();

    const { isItemSaved, toggleSaveItem } = useSavedItemsStore();
    const { downloadPlaylist, downloadedSongs, downloadedPlaylists } = useDownloadStore();

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

    const artworkUrl = useMemo(() => resolveAssetUrl(playlist?.imageUrl), [playlist?.imageUrl]);
    const colors = useDynamicColors(artworkUrl);

    useEffect(() => {
        if (id) {
            // Reset scroll position on ID change
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
            
            setIsInitialLoading(true);
            fetchExternalPlaylist('jiosaavn', id as string);
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
        if (!isLoadingDetail && playlist) {
            const timer = setTimeout(() => setIsInitialLoading(false), 50);
            return () => clearTimeout(timer);
        }
    }, [isLoadingDetail, playlist]);

    const scrollY = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

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
            [300, 380],
            [0, 1],
            Extrapolate.CLAMP
        );
        const translateY = interpolate(
            scrollY.value,
            [300, 380],
            [10, 0],
            Extrapolate.CLAMP
        );
        return {
            opacity,
            transform: [{ translateY }],
        };
    });

    const headerPlayButtonStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollY.value,
            [320, 420],
            [0, 1],
            Extrapolate.CLAMP
        );
        const scale = interpolate(
            scrollY.value,
            [320, 420],
            [0.6, 1],
            Extrapolate.CLAMP
        );
        return {
            opacity,
            transform: [{ scale }],
        };
    });


    const headerBaseColor = (colors.primary && colors.primary !== '#310a5b') ? colors.primary : Colors.surface;

    // Offline/Cached Data Fallback
    const cachedPlaylist = downloadedPlaylists[id as string];
    const displayPlaylist = playlist || (cachedPlaylist ? {
        ...cachedPlaylist,
        songs: cachedPlaylist.songIds.map((sid: string) => downloadedSongs[sid]).filter(Boolean).map((s: any) => ({
            ...s,
            externalId: s.id,
            streamUrl: s.localUri,
            imageUrl: s.artwork
        }))
    } : null);

    const isCurrentPlaylistPlaying = displayPlaylist?.songs?.some((s: any) => s.externalId === currentTrack?.id) && isPlaying;
    const isSaved = isItemSaved(displayPlaylist?.externalId || (displayPlaylist as any)?._id || id);
    const isPlaylistDownloaded = !!downloadedPlaylists[displayPlaylist?.externalId || (displayPlaylist as any)?._id || id];

    const handlePlayAll = useCallback(() => {
        if (!displayPlaylist?.songs?.length) return;
        const tracks = displayPlaylist.songs.map((s: any) => ({
            id: s.externalId,
            url: s.streamUrl,
            title: s.title,
            artist: s.artist,
            artwork: s.imageUrl || displayPlaylist.imageUrl,
            source: 'jiosaavn'
        }));
        initializeQueue(tracks, 0, { type: 'playlist', id: displayPlaylist.externalId || (displayPlaylist as any)?._id || id, title: displayPlaylist.title });
    }, [displayPlaylist, initializeQueue, id]);

    const handlePlayTrack = useCallback((track: any, index: number) => {
        if (!displayPlaylist) return;
        const tracks = (displayPlaylist.songs || []).map((s: any) => ({
            id: s.externalId,
            url: s.streamUrl,
            title: s.title,
            artist: s.artist,
            artwork: s.imageUrl || displayPlaylist.imageUrl,
            source: 'jiosaavn'
        }));
        initializeQueue(tracks, index, { type: 'playlist', id: displayPlaylist.externalId || (displayPlaylist as any)?._id || id, title: displayPlaylist.title });
    }, [displayPlaylist, initializeQueue, id]);

    const handleDownloadPlaylist = useCallback(async () => {
        if (!displayPlaylist?.songs?.length) return;
        Alert.alert(
            "Download Playlist",
            `Do you want to download all ${displayPlaylist.songs.length} songs in "${displayPlaylist.title}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Download",
                    onPress: async () => {
                        await downloadPlaylist(displayPlaylist, displayPlaylist.songs.map((s: any) => ({
                            ...s,
                            id: s.externalId,
                            artwork: s.imageUrl || displayPlaylist.imageUrl
                        })));
                    }
                }
            ]
        );
    }, [displayPlaylist, downloadPlaylist]);

    const handleShare = useCallback(async () => {
        if (!displayPlaylist) return;
        try {
            const cleanId = (displayPlaylist.externalId || id as string).replace(/^jiosaavn_playlist_/, '');
            const message = `Check out this playlist "${displayPlaylist.title}" on Vibra!\n\nListen here: https://vibra-969f.onrender.com/playlist/external/jiosaavn/${cleanId}`;
            await Share.share({ message, title: displayPlaylist.title });
        } catch (error) {
            console.error('Error sharing playlist:', error);
        }
    }, [displayPlaylist, id]);

    const headerComponent = useMemo(() => (
        <ExternalPlaylistHeader
            displayPlaylist={displayPlaylist}
            artworkUrl={artworkUrl}
            colors={colors}
            isSaved={isSaved}
            isPlaylistDownloaded={isPlaylistDownloaded}
            isCurrentPlaylistPlaying={isCurrentPlaylistPlaying}
            shuffleMode={shuffleMode}
            onToggleSave={() => toggleSaveItem(displayPlaylist)}
            onDownload={handleDownloadPlaylist}
            onToggleShuffle={toggleShuffle}
            onPlayAll={handlePlayAll}
            onPause={pauseTrack}
            onOptions={() => optionsRef.current?.open(displayPlaylist, 'playlist')}
            onShare={handleShare}
            width={width}
        />
    ), [displayPlaylist, artworkUrl, colors, isSaved, isPlaylistDownloaded, isCurrentPlaylistPlaying, shuffleMode, handleDownloadPlaylist, toggleShuffle, handlePlayAll, pauseTrack, handleShare]);

    const displaySongs = useMemo(() => {
        const allSongs = displayPlaylist?.songs || [];
        return allSongs.map((s: any) => ({
            ...s,
            imageUrl: s.imageUrl || displayPlaylist?.imageUrl
        }));
    }, [displayPlaylist?.songs, displayPlaylist?.imageUrl]);

    const renderTrackItem = useCallback(({ item: song, index }: { item: any, index: number }) => (
        <TrackListItem
            track={song}
            index={index}
            isCurrent={currentTrack?.id === (song._id || song.id || song.externalId)}
            onPress={() => handlePlayTrack(song, index)}
            playlistImageUrl={displayPlaylist?.imageUrl}
        />
    ), [currentTrack?.id, displayPlaylist?.imageUrl, handlePlayTrack]);

    if ((isLoadingDetail || !displayPlaylist) && !cachedPlaylist) {
        return <MediaListSkeleton />;
    }

    if (!displayPlaylist) {
        return (
            <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: Colors.background }}>
                <Text className="text-white text-lg mb-4">Playlist not found</Text>
                <TouchableOpacity onPress={() => router.navigate('/(tabs)/library' as any)} className="bg-zinc-800 px-6 py-2 rounded-full">
                    <Text className="text-white">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 mb-5" style={{ backgroundColor: Colors.background }}>
            <View
                style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40 }}
                pointerEvents="box-none"
            >
                <SafeAreaView edges={['top']} className="px-4 py-2">
                    <TouchableOpacity
                        onPress={handleBack}
                        className="w-10 h-10 items-center justify-center"
                        activeOpacity={0.7}
                    >
                        <ArrowLeft size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                </SafeAreaView>
            </View>

            <Animated.View
                style={[stickyHeaderStyle, { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 }]}
                pointerEvents="box-none"
            >
                <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface }]} />

                <LinearGradient
                    colors={[headerBaseColor, Colors.background]}
                    style={StyleSheet.absoluteFill}
                />

                <SafeAreaView edges={['top']} className="px-4 py-2 flex-row items-center w-full">
                    <View className="w-10 mr-2" />
                    <Animated.View style={[headerTitleStyle]} className="flex-1">
                        <Text className="text-white text-base font-semibold" numberOfLines={1}>
                            {displayPlaylist?.title}
                        </Text>
                    </Animated.View>

                    <Animated.View style={[headerPlayButtonStyle]} className="ml-2">
                        <TouchableOpacity
                            onPress={isCurrentPlaylistPlaying ? pauseTrack : handlePlayAll}
                            style={{ backgroundColor: ACCENT_COLOR }}
                            className="w-11 h-11 rounded-full items-center justify-center shadow-lg"
                            activeOpacity={0.8}
                        >
                            {isCurrentPlaylistPlaying ? (
                                <SharpPause size={22} color="black" />
                            ) : (
                                <SharpPlay size={22} color="black" style={{ marginLeft: 3 }} />
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </SafeAreaView>
            </Animated.View>

            <AnimatedFlashList
                ref={listRef}
                data={displaySongs}
                renderItem={renderTrackItem}
                keyExtractor={(item: any) => item._id || item.id || item.externalId}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                ListHeaderComponent={headerComponent}
                estimatedItemSize={80}
                contentContainerStyle={{ paddingBottom: 100 }}
            />
            <CollectionOptions ref={optionsRef} />
        </View>
    );
}
