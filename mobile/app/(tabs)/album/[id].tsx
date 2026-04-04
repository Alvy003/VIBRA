import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
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
import { useMusicStore } from '@/stores/useMusicStore';
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
import { DownloadedIcon } from '@/components/DownloadedIcon';
import { useDownloadStore } from '@/stores/useDownloadStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveAssetUrl } from '@/lib/url';
import { useDynamicColors } from '@/hooks/useDynamicColors';
import { FlashList as OriginalFlashList } from '@shopify/flash-list';
const FlashList = OriginalFlashList as any;
import { MediaListSkeleton } from '@/components/Skeleton';
import { TrackListItem } from '@/components/TrackListItem';

const { width } = Dimensions.get('window');
const ACCENT_COLOR = '#8B5CF6';

// ─── AlbumHeader MUST be defined outside the screen function ─────────────────
// Defining it inside would cause React to create a new component type every render
// → FlashList unmounts/remounts the header → image flickers.
interface AlbumHeaderProps {
    currentAlbum: any;
    artworkUrl: string | null | undefined;
    colors: any;
    isAlbumDownloaded: boolean;
    isCurrentAlbumPlaying: boolean;
    onDownload: () => void;
    onPlay: () => void;
    onPause: () => void;
    width: number;
}

const AlbumHeader = memo<AlbumHeaderProps>(({
    currentAlbum,
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
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)', '#000000']}
            locations={[0, 0.4, 0.7, 1]}
            style={{ paddingTop: 100, paddingBottom: 24 }}
        >
            <View className="items-center px-6">
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

                <View className="w-full mt-10">
                    <Text className="text-white text-3xl font-extrabold mb-2 leading-tight tracking-tight">
                        {currentAlbum?.title}
                    </Text>
                    <Text className="text-zinc-300 text-sm font-medium mb-4">{currentAlbum?.artist}</Text>
                    <View className="flex-row items-center">
                        <View className="w-6 h-6 rounded-full bg-purple-600 items-center justify-center mr-2 ring-1 ring-white/20">
                            <Text className="text-white text-[10px] font-black">V</Text>
                        </View>
                        <Text className="text-white text-xs font-bold uppercase tracking-wider">
                            VIBRA • ALBUM <Text className="text-zinc-400 font-medium lowercase italic">• 2024</Text>
                        </Text>
                    </View>
                </View>
            </View>

            <View className="px-6 pt-8 pb-4 flex-row items-center justify-between">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
                    <TouchableOpacity activeOpacity={0.7}>
                        <Heart size={26} color="#b3b3b3" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onDownload} activeOpacity={0.7}>
                        {isAlbumDownloaded ? (
                            <DownloadedIcon size={26} />
                        ) : (
                            <CircleArrowDown size={28} color="#b3b3b3" />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.7}>
                        <Share2 size={24} color="#b3b3b3" />
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.7}>
                        <MoreVertical size={24} color="#b3b3b3" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={isCurrentAlbumPlaying ? onPause : onPlay}
                    style={{ backgroundColor: ACCENT_COLOR }}
                    className="w-16 h-16 rounded-full items-center justify-center shadow-2xl"
                    activeOpacity={0.8}
                >
                    {isCurrentAlbumPlaying ? (
                        <Pause size={32} color="black" fill="black" />
                    ) : (
                        <Play size={32} color="black" fill="black" className="ml-1" />
                    )}
                </TouchableOpacity>
            </View>
        </LinearGradient>
    </View>
));

// ─────────────────────────────────────────────────────────────────────────────

export default function AlbumScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const { currentAlbum, fetchAlbumById, isLoading, musicError } = useMusicStore();
    const { currentTrack, isPlaying, initializeQueue, pauseTrack } = usePlayerStore();
    const { downloadAlbum, downloadedAlbums } = useDownloadStore();

    const artworkUrl = useMemo(() => resolveAssetUrl(currentAlbum?.imageUrl), [currentAlbum?.imageUrl]);
    const colors = useDynamicColors(artworkUrl);

    useEffect(() => {
        if (id) {
            setIsInitialLoading(true);
            fetchAlbumById(id as string);
        }
    }, [id]);

    useEffect(() => {
        if (!isLoading && currentAlbum) {
            const timer = setTimeout(() => setIsInitialLoading(false), 50);
            return () => clearTimeout(timer);
        }
    }, [isLoading, currentAlbum]);

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

    const songs = (currentAlbum?.songs || []) as any[];
    const isCurrentAlbumPlaying = songs.some((s: any) => s._id === currentTrack?.id) && isPlaying;
    const isAlbumDownloaded = !!downloadedAlbums[id as string];

    const handlePlayAlbum = useCallback(() => {
        if (songs.length > 0) {
            const tracks = songs.map(s => ({
                id: s._id,
                url: s.audioUrl,
                title: s.title,
                artist: s.artist,
                artwork: s.imageUrl || currentAlbum?.imageUrl,
                source: 'local'
            }));
            initializeQueue(tracks, 0);
        }
    }, [songs, currentAlbum, initializeQueue]);

    const handlePlayTrack = useCallback((song: any, index: number) => {
        const tracks = songs.map(s => ({
            id: s._id,
            url: s.audioUrl,
            title: s.title,
            artist: s.artist,
            artwork: s.imageUrl || currentAlbum?.imageUrl,
            source: 'local'
        }));
        initializeQueue(tracks, index);
    }, [songs, currentAlbum, initializeQueue]);

    const handleDownloadAlbum = useCallback(async () => {
        if (!songs.length || !currentAlbum) return;
        Alert.alert(
            "Download Album",
            `Do you want to download all ${songs.length} songs in "${currentAlbum.title}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Download",
                    onPress: async () => {
                        await downloadAlbum(currentAlbum, songs.map(s => ({
                            ...s,
                            id: s._id,
                            artwork: s.imageUrl || currentAlbum.imageUrl
                        })));
                    }
                }
            ]
        );
    }, [songs, currentAlbum, downloadAlbum]);

    const renderHeader = useCallback(() => (
        <AlbumHeader
            currentAlbum={currentAlbum}
            artworkUrl={artworkUrl}
            colors={colors}
            isAlbumDownloaded={isAlbumDownloaded}
            isCurrentAlbumPlaying={isCurrentAlbumPlaying}
            onDownload={handleDownloadAlbum}
            onPlay={handlePlayAlbum}
            onPause={pauseTrack}
            width={width}
        />
    ), [currentAlbum, artworkUrl, colors, isAlbumDownloaded, isCurrentAlbumPlaying, handleDownloadAlbum, handlePlayAlbum, pauseTrack]);

    const renderTrackItem = useCallback(({ item: song, index }: { item: any, index: number }) => (
        <TrackListItem
            track={song}
            index={index}
            isCurrent={currentTrack?.id === song._id}
            onPress={() => handlePlayTrack(song, index)}
            playlistImageUrl={currentAlbum?.imageUrl}
        />
    ), [currentTrack?.id, currentAlbum?.imageUrl, handlePlayTrack]);

    if (isLoading && !currentAlbum) {
        return <MediaListSkeleton />;
    }

    if (musicError || !currentAlbum) {
        return (
            <View className="flex-1 bg-black items-center justify-center px-6">
                <Text className="text-red-500 text-center mb-4">{musicError || "Album not found"}</Text>
                <TouchableOpacity onPress={() => router.navigate('/(tabs)/library' as any)} className="bg-zinc-800 px-6 py-2 rounded-full">
                    <Text className="text-white">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

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
                            {currentAlbum?.title}
                        </Text>
                    </Animated.View>

                    <Animated.View style={[headerPlayButtonStyle]} className="ml-2">
                        <TouchableOpacity
                            onPress={isCurrentAlbumPlaying ? pauseTrack : handlePlayAlbum}
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

            <Animated.FlatList
                data={songs}
                renderItem={renderTrackItem}
                keyExtractor={(item: any) => item._id}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{ paddingBottom: 110 }}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}
