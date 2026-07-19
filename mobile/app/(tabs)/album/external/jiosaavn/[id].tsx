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
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSavedItemsStore } from '@/stores/useSavedItemsStore';
import { useStreamStore } from '@/stores/useStreamStore';
import { FlashList as OriginalFlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useGlobalSearchParams, useLocalSearchParams, useRouter } from 'expo-router';
import {
    ArrowLeft,
    MoreVertical
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
    BackHandler,
    Dimensions,
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

interface ExternalAlbumHeaderProps {
    album: any;
    artworkUrl: string | null | undefined;
    colors: any;
    isSaved: boolean;
    isAlbumDownloaded: boolean;
    isCurrentAlbumPlaying: boolean;
    shuffleMode: boolean;
    onToggleSave: () => void;
    onDownload: () => void;
    onToggleShuffle: () => void;
    onPlay: () => void;
    onPause: () => void;
    onOptions: () => void;
    width: number;
}

const ExternalAlbumHeader = React.memo<ExternalAlbumHeaderProps>(({
    album,
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

                <View className="w-full mt-5">
                    <Text className="text-white text-2xl font-semibold mb-3 leading-tight tracking-tight" numberOfLines={1}>
                        {album.title}
                    </Text>
                    <Text className="text-white text-sm font-semibold mb-4" numberOfLines={2}>{album.artist}</Text>
                    <View className="flex-row items-center">
                        <Text className="text-zinc-400 text-[12px] font-medium tracking-wider">
                            Album <Text className="text-zinc-400 font-medium lowercase">• {album.year || '2024'}</Text>
                        </Text>
                    </View>
                </View>
            </View>

            <View className="px-6 pt-4 pb-0 flex-row items-center justify-between">
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

export default function ExternalAlbumScreen() {
    const { id } = useLocalSearchParams();
    const { from } = useGlobalSearchParams();
    const router = useRouter();
    const listRef = React.useRef<any>(null);
    const optionsRef = React.useRef<CollectionOptionsRef>(null);
    const [isInitialLoading, setIsInitialLoading] = React.useState(true);
    const [isDownloadConfirmVisible, setIsDownloadConfirmVisible] = React.useState(false);

    const {
        currentExternalAlbum: album,
        isLoadingDetail,
        fetchExternalAlbum,
        clearDetail
    } = useStreamStore();

    const { currentTrack, isPlaying, initializeQueue, pauseTrack, shuffleMode, toggleShuffle } = usePlayerStore();
    const { downloadAlbum, downloadedAlbums, downloadedSongs } = useDownloadStore();
    const { isItemSaved, toggleSaveItem } = useSavedItemsStore();

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

    const artworkUrl = useMemo(() => resolveAssetUrl(album?.imageUrl), [album?.imageUrl]);
    const colors = useDynamicColors(artworkUrl);


    useEffect(() => {
        if (id) {
            // Reset scroll position on ID change
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
            
            setIsInitialLoading(true);
            fetchExternalAlbum('jiosaavn', id as string);
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


    const headerBaseColor = (colors.primary && colors.primary !== '#310a5b') ? colors.primary : Colors.surface;

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
    const isSaved = isItemSaved(displayAlbum?.externalId || (displayAlbum as any)?._id || id);

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

    const handleDownloadAlbum = useCallback(() => {
        if (!album?.songs?.length) return;
        setIsDownloadConfirmVisible(true);
    }, [album?.songs?.length]);

    const confirmDownloadAlbum = useCallback(async () => {
        setIsDownloadConfirmVisible(false);
        if (!album) return;
        await downloadAlbum(album, album.songs.map((s: any) => ({
            ...s,
            id: s.externalId,
            artwork: s.imageUrl || album.imageUrl
        })));
    }, [album, downloadAlbum]);

    const handleToggleSave = useCallback(() => {
        if (!displayAlbum) return;
        toggleSaveItem({
            ...displayAlbum,
            externalId: displayAlbum.externalId || (displayAlbum as any)?._id || id,
            type: 'album'
        });
    }, [displayAlbum, id, toggleSaveItem]);

    const headerComponent = useMemo(() => (
        <ExternalAlbumHeader
            album={displayAlbum}
            artworkUrl={artworkUrl}
            colors={colors}
            isSaved={isSaved}
            isAlbumDownloaded={isAlbumDownloaded}
            isCurrentAlbumPlaying={isCurrentAlbumPlaying}
            shuffleMode={shuffleMode}
            onToggleSave={handleToggleSave}
            onDownload={handleDownloadAlbum}
            onToggleShuffle={toggleShuffle}
            onPlay={handlePlayAll}
            onPause={pauseTrack}
            onOptions={() => optionsRef.current?.open(displayAlbum, 'album')}
            width={width}
        />
    ), [displayAlbum, artworkUrl, colors, isSaved, isAlbumDownloaded, isCurrentAlbumPlaying, shuffleMode, handleToggleSave, handleDownloadAlbum, toggleShuffle, handlePlayAll, pauseTrack]);

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
        <View className="flex-1 mb-5" style={{ backgroundColor: Colors.background }}>
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
                        <Text className="text-white text-base font-semibold" numberOfLines={1}>
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
                                <SharpPause size={22} color="black"/>
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
                    keyExtractor={(item: any) => item.externalId || item.id}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    ListHeaderComponent={headerComponent}
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
