import CollectionOptions, { CollectionOptionsRef } from '@/components/CollectionOptions';
import { DownloadStateIcon } from '@/components/DownloadedIcon';
import ConfirmationModal from '@/components/modals/ConfirmationModal';
import SaveStateIcon from '@/components/SaveStateIcon';
import { SharpPause, SharpPlay, SharpShuffle } from '@/components/SharpIcons';
import { MediaListSkeleton } from '@/components/Skeleton';
import { TrackListItem } from '@/components/TrackListItem';
import Colors from '@/constants/Colors';
import { useDynamicColors } from '@/hooks/useDynamicColors';
import { resolveAssetUrl } from '@/lib/url';
import { useDownloadStore } from '@/stores/useDownloadStore';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSavedItemsStore } from '@/stores/useSavedItemsStore';
import { FlashList as OriginalFlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ArrowLeft,
    MoreVertical,
    Share2
} from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Dimensions,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    Extrapolate,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
const AnimatedFlashList = Animated.createAnimatedComponent(OriginalFlashList) as any;

const { width } = Dimensions.get('window');
const ACCENT_COLOR = Colors.accent;

// ─── AlbumHeader MUST be defined outside the screen function ─────────────────
// Defining it inside would cause React to create a new component type every render
// → FlashList unmounts/remounts the header → image flickers.
interface AlbumHeaderProps {
    currentAlbum: any;
    artworkUrl: string | null | undefined;
    colors: any;
    isSaved: boolean;
    isAlbumDownloaded: boolean;
    isCurrentAlbumPlaying: boolean;
    onToggleSave: () => void;
    onDownload: () => void;
    onPlay: () => void;
    onPause: () => void;
    onOptions: () => void;
    shuffleMode: boolean;
    onToggleShuffle: () => void;
    onShare: () => void;
    width: number;
}

const AlbumHeader = memo<AlbumHeaderProps>(({
    currentAlbum,
    artworkUrl,
    colors,
    isSaved,
    isAlbumDownloaded,
    isCurrentAlbumPlaying,
    shuffleMode,
    onToggleSave,
    onDownload,
    onToggleShuffle,
    onPlay,
    onPause,
    onOptions,
    onShare,
    width,
}) => (
    <View style={{ backgroundColor: colors.primary }}>
        <LinearGradient
            colors={[
                'rgba(0, 0, 0, 0.5)',    // status bar/top area
                'rgba(0, 0, 0, 0.65)',   // Muted, rich primary color behind cover art
                'rgba(9, 9, 11, 0.85)',  // Faster transition to dark background below cover art
                'rgba(9, 9, 11, 0.98)',  // Deep transition
                Colors.background,
                Colors.background,
            ]}
            locations={[0, 0.3, 0.5, 0.7, 0.85, 1]}
            style={{ paddingTop: 60, paddingBottom: 10 }}
        >
            <View className="items-center px-6">
            <View style={{
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 16 },
                    shadowOpacity: 0.45,
                    shadowRadius: 24,
                    elevation: 20,
                }}>
                    <Image
                        source={{ uri: artworkUrl ?? undefined }}
                        style={{
                            width: width * 0.62,
                            height: width * 0.62,
                            borderRadius: 3,
                            borderWidth: 0.5,
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                        }}
                        contentFit="cover"
                        transition={0}
                        cachePolicy="memory-disk"
                    />
                </View>

                <View className="w-full mt-10">
                    <Text className="text-white text-2xl font-bold mb-2 leading-tight tracking-tight" numberOfLines={1}>
                        {currentAlbum?.title}
                    </Text>
                    <Text className="text-zinc-400 text-sm font-medium mb-4" numberOfLines={2}>{currentAlbum?.artist}</Text>
                    <View className="flex-row items-center">
                        <Text className="text-white text-[11px] font-bold tracking-wider">
                            ALBUM <Text className="text-zinc-400 font-medium lowercase">• 2024</Text>
                        </Text>
                    </View>
                </View>
            </View>

            <View className="px-6 pt-8 pb-4 flex-row items-center justify-between">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
                    <TouchableOpacity onPress={onToggleSave} activeOpacity={0.7}>
                        <SaveStateIcon
                            variant="medium"
                            isSaved={isSaved}
                            checkmarkColor="black"
                            outlineColor="#b3b3b3"
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onDownload} activeOpacity={0.7}>
                        <DownloadStateIcon
                            variant="medium"
                            status={isAlbumDownloaded ? 'downloaded' : 'idle'}
                            color="#b3b3b3"
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onShare} activeOpacity={0.7}>
                        <Share2 size={22} color="#b3b3b3" />
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
            </View>
        </LinearGradient>
    </View>
));

// ─────────────────────────────────────────────────────────────────────────────

export default function AlbumScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isDownloadConfirmVisible, setIsDownloadConfirmVisible] = useState(false);

    const { currentAlbum, fetchAlbumById, isLoading, musicError } = useMusicStore();
    const { currentTrack, isPlaying, initializeQueue, pauseTrack, shuffleMode, toggleShuffle } = usePlayerStore();
    const { downloadAlbum, downloadedAlbums } = useDownloadStore();
    const { isItemSaved, toggleSaveItem } = useSavedItemsStore();
    const optionsRef = useRef<CollectionOptionsRef>(null);

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

    const headerBaseColor = (colors.primary && colors.primary !== '#310a5b') ? colors.primary : Colors.surface;

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
            initializeQueue(tracks, 0, { type: 'album', id: currentAlbum?._id || (id as string), title: currentAlbum?.title });
        }
    }, [songs, currentAlbum, id, initializeQueue]);

    const handlePlayTrack = useCallback((song: any, index: number) => {
        const tracks = songs.map(s => ({
            id: s._id,
            url: s.audioUrl,
            title: s.title,
            artist: s.artist,
            artwork: s.imageUrl || currentAlbum?.imageUrl,
            source: 'local'
        }));
        initializeQueue(tracks, index, { type: 'album', id: currentAlbum?._id || (id as string), title: currentAlbum?.title });
    }, [songs, currentAlbum, id, initializeQueue]);

    const handleDownloadAlbum = useCallback(() => {
        if (!songs.length || !currentAlbum) return;
        setIsDownloadConfirmVisible(true);
    }, [songs.length, currentAlbum]);

    const confirmDownloadAlbum = useCallback(async () => {
        setIsDownloadConfirmVisible(false);
        if (!currentAlbum) return;
        await downloadAlbum(currentAlbum, songs.map(s => ({
            ...s,
            id: s._id,
            artwork: s.imageUrl || currentAlbum.imageUrl
        })));
    }, [songs, currentAlbum, downloadAlbum]);

    const isSaved = isItemSaved(id as string);

    const handleShare = useCallback(async () => {
        if (!currentAlbum) return;
        try {
            const cleanId = (id as string).replace(/^jiosaavn_album_/, '');
            const message = `Check out this album "${currentAlbum.title}" on Vibra!\n\nListen here: https://vibra-969f.onrender.com/album/${cleanId}`;
            await Share.share({ message, title: currentAlbum.title });
        } catch (error) {
            console.error('Error sharing album:', error);
        }
    }, [currentAlbum, id]);

    const renderHeader = useCallback(() => (
        <AlbumHeader
            currentAlbum={currentAlbum}
            artworkUrl={artworkUrl}
            colors={colors}
            isSaved={isSaved}
            isAlbumDownloaded={isAlbumDownloaded}
            isCurrentAlbumPlaying={isCurrentAlbumPlaying}
            shuffleMode={shuffleMode}
            onToggleSave={() => toggleSaveItem({ ...currentAlbum, id, type: 'album' })}
            onDownload={handleDownloadAlbum}
            onToggleShuffle={toggleShuffle}
            onPlay={handlePlayAlbum}
            onPause={pauseTrack}
            onOptions={() => optionsRef.current?.open(currentAlbum, 'album')}
            onShare={handleShare}
            width={width}
        />
    ), [currentAlbum, artworkUrl, colors, isSaved, isAlbumDownloaded, isCurrentAlbumPlaying, shuffleMode, handleDownloadAlbum, toggleShuffle, handlePlayAlbum, pauseTrack, handleShare]);

    const displaySongs = useMemo(() => {
        return (currentAlbum?.songs || []).map((s: any) => ({
            ...s,
            imageUrl: s.imageUrl || currentAlbum?.imageUrl
        }));
    }, [currentAlbum?.songs, currentAlbum?.imageUrl]);

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
        <View className="flex-1" style={{ backgroundColor: Colors.background }}>
            {/* 1. Sticky Back Button */}
            <View
                style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40 }}
                pointerEvents="box-none"
            >
                <SafeAreaView edges={['top']} className="px-4 py-2" pointerEvents="box-none">
                    <TouchableOpacity
                        onPress={handleBack}
                        className="w-10 h-10 items-center justify-center"
                        activeOpacity={0.7}
                    >
                        <ArrowLeft size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                </SafeAreaView>
            </View>

            {/* 2. Sticky Navigation Header - Fades In */}
            <Animated.View
                style={[stickyHeaderStyle, { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 }]}
                pointerEvents="box-none"
            >
                <View style={[StyleSheet.absoluteFill, { backgroundColor: headerBaseColor }]} />
                <LinearGradient
                    colors={[
                        'rgba(0, 0, 0, 0.47)', // Top of sticky bar
                        'rgba(0, 0, 0, 0.60)', // Middle dimming stop
                        'rgba(0, 0, 0, 0.70)', // Bottom dimming stop
                    ]}
                    locations={[0, 0.5, 1]}
                    style={StyleSheet.absoluteFill}
                />

                <SafeAreaView edges={['top']} className="px-4 py-2 flex-row items-center w-full">
                    <View className="w-10 mr-2" />
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
                                <SharpPause size={22} color="black" />
                            ) : (
                                <SharpPlay size={22} color="black" style={{ marginLeft: 3 }} />
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </SafeAreaView>
            </Animated.View>

                <AnimatedFlashList
                    data={displaySongs}
                    renderItem={renderTrackItem}
                    keyExtractor={(item: any) => item._id || item.id}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    ListHeaderComponent={renderHeader}
                    estimatedItemSize={80}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    overScrollMode="never"
                    bounces={false}
                />
                <CollectionOptions ref={optionsRef} />
                <ConfirmationModal
                    visible={isDownloadConfirmVisible}
                    title="Download Album"
                    message="Download this album for offline listening?"
                    confirmLabel="Download"
                    onConfirm={confirmDownloadAlbum}
                    onCancel={() => setIsDownloadConfirmVisible(false)}
                />
        </View>
    );
}
