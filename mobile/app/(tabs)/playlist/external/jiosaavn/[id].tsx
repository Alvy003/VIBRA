import React, { useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    Alert,
    StyleSheet
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveAssetUrl } from '@/lib/url';
import { useDynamicColors } from '@/hooks/useDynamicColors';
import { FlashList as OriginalFlashList } from '@shopify/flash-list';
const FlashList = OriginalFlashList as any;
import { MediaListSkeleton } from '@/components/Skeleton';
import { TrackListItem } from '@/components/TrackListItem';
import { useSavedItemsStore } from '@/stores/useSavedItemsStore';
import { useDownloadStore } from '@/stores/useDownloadStore';
import PlaylistOptions from '@/components/PlaylistOptions';
import { DownloadedIcon } from '@/components/DownloadedIcon';

const { width } = Dimensions.get('window');
const ACCENT_COLOR = '#9333EA';

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
    width,
}) => (
    <View style={{ backgroundColor: colors.primary }}>
        <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)', '#000000']}
            locations={[0, 0.4, 0.7, 1]}
            style={{ paddingTop: 100, paddingBottom: 20 }}
        >
            <View className="items-center px-6">
                {/* Artwork */}
                <View style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.6,
                    shadowRadius: 24,
                    elevation: 20
                }}>
                    <Image
                        source={{ uri: artworkUrl ?? undefined }}
                        style={{ width: width * 0.65, height: width * 0.65, borderRadius: 4 }}
                        contentFit="cover"
                        transition={0}
                        cachePolicy="memory-disk"
                    />
                </View>

                {/* Title & Info */}
                <View className="w-full mt-10">
                    <Text className="text-white text-3xl font-extrabold mb-2 leading-tight tracking-tight">
                        {displayPlaylist.title}
                    </Text>
                    <Text className="text-zinc-300 text-sm font-medium mb-4 leading-5" numberOfLines={2}>
                        {displayPlaylist.description || 'Curated for you by Vibra'}
                    </Text>

                    {/* Metadata Row */}
                    <View className="flex-row items-center">
                        <View className="w-6 h-6 rounded-full bg-purple-600 items-center justify-center mr-2 ring-1 ring-white/20">
                            <Text className="text-white text-[10px] font-black">V</Text>
                        </View>
                        <Text className="text-white text-xs font-bold uppercase tracking-wider">
                            Vibra <Text className="text-zinc-400 font-medium lowercase italic">• {displayPlaylist.songs?.length || 0} tracks</Text>
                        </Text>
                    </View>
                </View>
            </View>

            {/* Action Bar */}
            <View className="px-6 pt-8 pb-2 flex-row items-center justify-between">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
                    <TouchableOpacity onPress={onToggleSave} activeOpacity={0.7}>
                        {isSaved ? (
                            <View style={{ width: 26, height: 26, backgroundColor: ACCENT_COLOR, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                                <Check size={18} color="black" strokeWidth={4} />
                            </View>
                        ) : (
                            <CirclePlus size={26} color="#b3b3b3" />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onDownload} activeOpacity={0.7}>
                        {isPlaylistDownloaded ? (
                            <DownloadedIcon size={26} />
                        ) : (
                            <CircleArrowDown size={28} color="#b3b3b3" />
                        )}
                    </TouchableOpacity>

                    <PlaylistOptions
                        playlist={displayPlaylist}
                        isDiscovery={true}
                        isDownloaded={isPlaylistDownloaded}
                        onDownload={onDownload}
                        trigger={
                            <View style={{ height: 40, width: 40, alignItems: 'center', justifyContent: 'center' }}>
                                <MoreVertical size={24} color="#b3b3b3" />
                            </View>
                        }
                    />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
                    <TouchableOpacity onPress={onToggleShuffle} activeOpacity={0.7}>
                        <Shuffle size={26} color={shuffleMode ? ACCENT_COLOR : "#b3b3b3"} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={isCurrentPlaylistPlaying ? onPause : onPlayAll}
                        style={{ backgroundColor: ACCENT_COLOR }}
                        className="w-16 h-16 rounded-full items-center justify-center shadow-2xl"
                        activeOpacity={0.8}
                    >
                        {isCurrentPlaylistPlaying ? (
                            <Pause size={32} color="black" fill="black" />
                        ) : (
                            <Play size={32} color="black" fill="black" className="ml-1" />
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
    const router = useRouter();
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

    const artworkUrl = useMemo(() => resolveAssetUrl(playlist?.imageUrl), [playlist?.imageUrl]);
    const colors = useDynamicColors(artworkUrl);

    useEffect(() => {
        if (id) {
            setIsInitialLoading(true);
            fetchExternalPlaylist('jiosaavn', id as string);
        }
        return () => clearDetail();
    }, [id]);

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

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/library');
        }
    };

    const headerBaseColor = (colors.primary && colors.primary !== '#310a5b') ? colors.primary : '#121212';

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

    const renderHeader = useCallback(() => (
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
            width={width}
        />
    ), [displayPlaylist, artworkUrl, colors, isSaved, isPlaylistDownloaded, isCurrentPlaylistPlaying, shuffleMode, handleDownloadPlaylist, handlePlayAll]);

    const renderTrackItem = useCallback(({ item, index }: { item: any, index: number }) => (
        <TrackListItem
            track={item}
            index={index}
            isCurrent={currentTrack?.id === item.externalId}
            onPress={() => handlePlayTrack(item, index)}
            playlistImageUrl={displayPlaylist?.imageUrl}
        />
    ), [currentTrack?.id, displayPlaylist?.imageUrl, handlePlayTrack]);

    if ((isLoadingDetail || !displayPlaylist) && !cachedPlaylist) {
        return <MediaListSkeleton />;
    }

    if (!displayPlaylist) {
        return (
            <View className="flex-1 bg-black items-center justify-center p-6">
                <Text className="text-white text-lg mb-4">Playlist not found</Text>
                <TouchableOpacity onPress={() => router.navigate('/(tabs)/library' as any)} className="bg-zinc-800 px-6 py-2 rounded-full">
                    <Text className="text-white">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const filteredSongs = displayPlaylist.songs || [];

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
                        <ArrowLeft size={24} color="#ffffff" style={{ marginLeft: -2 }} />
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
                        <ArrowLeft size={24} color="#ffffff" style={{ marginLeft: -2 }} />
                    </TouchableOpacity>

                    <Animated.View style={[headerTitleStyle]} className="flex-1">
                        <Text className="text-white text-base font-bold" numberOfLines={1}>
                            {displayPlaylist.title}
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
                                <Pause size={20} color="black" fill="black" />
                            ) : (
                                <Play size={20} color="black" fill="black" className="ml-0.5" />
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </SafeAreaView>
            </Animated.View>

            <Animated.FlatList
                data={filteredSongs}
                renderItem={renderTrackItem}
                keyExtractor={(item: any) => item.externalId || item.id}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{ paddingBottom: 110 }}
                showsVerticalScrollIndicator={false}
            // Use FlatList optimized for dynamic headers
            />
        </View>
    );
}
