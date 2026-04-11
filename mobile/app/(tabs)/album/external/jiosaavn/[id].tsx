import React, { useEffect, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    Alert
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
    Heart,
    MoreVertical,
    Share2,
    CircleArrowDown,
    Check
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveAssetUrl } from '@/lib/url';
import { useDynamicColors } from '@/hooks/useDynamicColors';
import { useDownloadStore } from '@/stores/useDownloadStore';
import { DownloadedIcon } from '@/components/DownloadedIcon';
import { SharpPlay, SharpPause, SharpShuffle } from '@/components/SharpIcons';
import { FlashList as OriginalFlashList } from '@shopify/flash-list';
const AnimatedFlashList = Animated.createAnimatedComponent(OriginalFlashList) as any;
import { MediaListSkeleton } from '@/components/Skeleton';
import { TrackListItem } from '@/components/TrackListItem';

const { width } = Dimensions.get('window');
const ACCENT_COLOR = '#7B2CF5';

interface ExternalAlbumHeaderProps {
    album: any;
    artworkUrl: string | null | undefined;
    colors: any;
    isAlbumDownloaded: boolean;
    isCurrentAlbumPlaying: boolean;
    onDownload: () => void;
    onPlay: () => void;
    onPause: () => void;
    width: number;
}

const ExternalAlbumHeader = React.memo<ExternalAlbumHeaderProps>(({
    album,
    artworkUrl,
    colors,
    isAlbumDownloaded,
    isCurrentAlbumPlaying,
    onDownload,
    onPlay,
    onPause,
    width,
}) => (
    <View style={{ backgroundColor: colors.primary }}>
            <LinearGradient
                colors={[
                    'transparent',
                    'rgba(0,0,0,0.05)',
                    'rgba(0,0,0,0.15)',
                    'rgba(0,0,0,0.3)',
                    'rgba(0,0,0,0.5)',
                    'rgba(0,0,0,0.7)',
                    'rgba(0,0,0,0.85)',
                    '#000000',
                    '#000000',
                ]}
                locations={[0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.78, 0.9, 1]}
                style={{ paddingTop: 60, paddingBottom: 10 }}
            >
            <View className="items-center px-6">
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

                <View className="w-full mt-5">
                    <Text className="text-white text-[24px] font-bold mb-3 leading-tight tracking-tight" numberOfLines={1}>
                        {album.title}
                    </Text>
                    <Text className="text-white text-sm font-bold mb-4" numberOfLines={1}>{album.artist}</Text>
                    <View className="flex-row items-center">
                        <Text className="text-zinc-400 text-[12px] font-medium tracking-wider">
                            Album <Text className="text-zinc-400 font-medium lowercase">• {album.year || '2024'}</Text>
                        </Text>
                    </View>
                </View>
            </View>

            <View className="px-6 pt-4 pb-0 flex-row items-center justify-between">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
                    <TouchableOpacity activeOpacity={0.7}>
                        <Heart size={22} color="#b3b3b3" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onDownload} activeOpacity={0.7}>
                        {isAlbumDownloaded ? (
                            <DownloadedIcon size={22} />
                        ) : (
                            <CircleArrowDown size={24} color="#b3b3b3" />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.7}>
                        <Share2 size={22} color="#b3b3b3" />
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.7}>
                        <MoreVertical size={22} color="#b3b3b3" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={isCurrentAlbumPlaying ? onPause : onPlay}
                    style={{ backgroundColor: ACCENT_COLOR }}
                    className="w-[52px] h-[52px] rounded-full items-center justify-center shadow-2xl"
                    activeOpacity={0.8}
                >
                    {isCurrentAlbumPlaying ? (
                        <SharpPause size={26} color="black" />
                    ) : (
                        <SharpPlay size={26} color="black" style={{ marginLeft: 3 }} />
                    )}
                </TouchableOpacity>
            </View>
        </LinearGradient>
    </View>
));

// ─────────────────────────────────────────────────────────────────────────────

export default function ExternalAlbumScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [isInitialLoading, setIsInitialLoading] = React.useState(true);

    const {
        currentExternalAlbum: album,
        isLoadingDetail,
        fetchExternalAlbum,
        clearDetail
    } = useStreamStore();

    const { currentTrack, isPlaying, initializeQueue, pauseTrack } = usePlayerStore();
    const { downloadAlbum, downloadedAlbums, downloadedSongs } = useDownloadStore();

    const artworkUrl = useMemo(() => resolveAssetUrl(album?.imageUrl), [album?.imageUrl]);
    const colors = useDynamicColors(artworkUrl);

    useEffect(() => {
        if (id) {
            setIsInitialLoading(true);
            fetchExternalAlbum('jiosaavn', id as string);
        }
        return () => clearDetail();
    }, [id]);

    useEffect(() => {
        if (!isLoadingDetail && album) {
            const timer = setTimeout(() => setIsInitialLoading(false), 50);
            return () => clearTimeout(timer);
        }
    }, [isLoadingDetail, album]);

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
    const cachedAlbum = downloadedAlbums[id as string];
    const displayAlbum = album || (cachedAlbum ? {
        ...cachedAlbum,
        songs: cachedAlbum.songIds.map((sid: string) => downloadedSongs[sid]).filter(Boolean).map((s: any) => ({
            ...s,
            externalId: s.id,
            streamUrl: s.localUri,
            imageUrl: s.artwork
        }))
    } : null);

    const isCurrentAlbumPlaying = displayAlbum?.songs?.some((s: any) => s.externalId === currentTrack?.id) && isPlaying;
    const isAlbumDownloaded = !!downloadedAlbums[(album as any)?.externalId || (id as string)];

    const handlePlayAll = useCallback(() => {
        if (!album?.songs?.length) return;
        const tracks = album.songs.map((s: any) => ({
            id: s.externalId,
            url: s.streamUrl,
            title: s.title,
            artist: s.artist,
            artwork: s.imageUrl || album.imageUrl,
            source: 'jiosaavn'
        }));
        initializeQueue(tracks, 0, { type: 'album', id: album.externalId, title: album.title });
    }, [album, initializeQueue]);

    const handlePlayTrack = useCallback((track: any, index: number) => {
        if (!displayAlbum) return;
        const tracks = displayAlbum.songs.map((s: any) => ({
            id: s.externalId,
            url: s.streamUrl,
            title: s.title,
            artist: s.artist,
            artwork: s.imageUrl || displayAlbum.imageUrl,
            source: 'jiosaavn'
        }));
        initializeQueue(tracks, index, { type: 'album', id: displayAlbum.externalId, title: displayAlbum.title });
    }, [displayAlbum, initializeQueue]);

    const handleDownloadAlbum = useCallback(async () => {
        if (!album?.songs?.length) return;
        Alert.alert(
            "Download Album",
            `Do you want to download all ${album.songs.length} songs in "${album.title}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Download",
                    onPress: async () => {
                        await downloadAlbum(album, album.songs.map((s: any) => ({
                            ...s,
                            id: s.externalId,
                            artwork: s.imageUrl || album.imageUrl
                        })));
                    }
                }
            ]
        );
    }, [album, downloadAlbum]);

    const renderHeader = useCallback(() => (
        <ExternalAlbumHeader
            album={displayAlbum}
            artworkUrl={artworkUrl}
            colors={colors}
            isAlbumDownloaded={isAlbumDownloaded}
            isCurrentAlbumPlaying={isCurrentAlbumPlaying}
            onDownload={handleDownloadAlbum}
            onPlay={handlePlayAll}
            onPause={pauseTrack}
            width={width}
        />
    ), [displayAlbum, artworkUrl, colors, isAlbumDownloaded, isCurrentAlbumPlaying, handleDownloadAlbum, handlePlayAll, pauseTrack]);

    const displaySongs = useMemo(() => {
        return (album?.songs || []).map((s: any) => ({
            ...s,
            imageUrl: s.imageUrl || album?.imageUrl
        }));
    }, [album?.songs, album?.imageUrl]);

    const renderTrackItem = useCallback(({ item: song, index }: { item: any, index: number }) => (
        <TrackListItem
            track={song}
            index={index}
            isCurrent={currentTrack?.id === song.externalId}
            onPress={() => handlePlayTrack(song, index)}
            playlistImageUrl={album?.imageUrl}
        />
    ), [currentTrack?.id, album?.imageUrl, handlePlayTrack]);

    if ((isLoadingDetail || !album) && !downloadedAlbums[id as string]) {
        return <MediaListSkeleton />;
    }

    if (!displayAlbum) {
        return <MediaListSkeleton />;
    }

    return (
        <View className="flex-1 bg-black">
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
                        <ArrowLeft size={24} color="#ffffff" />
                    </TouchableOpacity>
                </SafeAreaView>
            </View>

            <Animated.View
                style={[stickyHeaderStyle, { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 }]}
                pointerEvents="box-none"
            >
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#121212' }]} />

                <LinearGradient
                    colors={[headerBaseColor, '#000000']}
                    style={StyleSheet.absoluteFill}
                />

                <SafeAreaView edges={['top']} className="px-4 py-2 flex-row items-center w-full">
                    <View className="w-10 mr-2" />
                    <Animated.View style={[headerTitleStyle]} className="flex-1">
                        <Text className="text-white text-sm font-bold" numberOfLines={1}>
                            {album?.title}
                        </Text>
                    </Animated.View>

                    <Animated.View style={[headerPlayButtonStyle]} className="ml-2">
                        <TouchableOpacity
                            onPress={isCurrentAlbumPlaying ? pauseTrack : handlePlayAll}
                            style={{ backgroundColor: ACCENT_COLOR }}
                            className="w-11 h-11 rounded-full items-center justify-center shadow-lg"
                            activeOpacity={0.8}
                        >
                            {isCurrentAlbumPlaying ? (
                                <Pause size={20} color="black" fill="black" />
                            ) : (
                                <Play size={20} color="black" fill="black" className="ml-0.5" />
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </SafeAreaView>
            </Animated.View>

                <AnimatedFlashList
                    data={displaySongs}
                    renderItem={renderTrackItem}
                    keyExtractor={(item: any) => item.externalId || item.id}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    ListHeaderComponent={renderHeader}
                    estimatedItemSize={80}
                    contentContainerStyle={{ paddingBottom: 100 }}
                />
        </View>
    );
}
