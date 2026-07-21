import CollectionOptions, { CollectionOptionsRef } from '@/components/CollectionOptions';
import { DownloadStateIcon } from '@/components/DownloadedIcon';
import * as Sentry from '@sentry/react-native';
import SaveStateIcon from '@/components/SaveStateIcon';
import { SharpPause, SharpPlay, SharpShuffle } from '@/components/SharpIcons';
import { MediaListSkeleton } from '@/components/Skeleton';
import { TrackListItem } from '@/components/TrackListItem';
import { MixCover, getMixBaseColor } from '@/components/home/MixCover';
import ConfirmationModal from '@/components/modals/ConfirmationModal';
import EditPlaylistModal from '@/components/modals/EditPlaylistModal';
import Colors from '@/constants/Colors';
import { useDynamicColors } from '@/hooks/useDynamicColors';
import { resolveAssetUrl } from '@/lib/url';
import { useDownloadStore } from '@/stores/useDownloadStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { useSavedItemsStore } from '@/stores/useSavedItemsStore';
import { useStreamStore } from '@/stores/useStreamStore';
import { useUser } from '@clerk/clerk-expo';
import { FlashList as OriginalFlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useGlobalSearchParams, useLocalSearchParams, useRouter } from 'expo-router';
import { useNetInfo } from '@react-native-community/netinfo';
import {
    ArrowLeft,
    MoreVertical,
    Music,
    Share2
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    BackHandler,
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
const DUMMY_URL = 'https://raw.githubusercontent.com/anars/blank-audio/master/1-second-of-silence.mp3';

const getTrackId = (track: any) => {
    if (!track) return '';
    const rawId = track.externalId || track._id || track.id;
    const source = track.source || 'jiosaavn';
    if (rawId && source === 'jiosaavn' && !String(rawId).startsWith('jiosaavn_')) {
        return `jiosaavn_${rawId}`;
    }
    return String(rawId || '');
};

// ─── PlaylistHeader is defined OUTSIDE the screen component ───────────────────
// This is critical: if defined inside, React creates a new type on each render
// which causes FlashList to unmount/remount the header (and its images) → flicker.
interface PlaylistHeaderProps {
    playlist: any;
    allSongs: any[];
    artworkUrl: string | null | undefined;
    colors: { primary: string };
    isDiscovery: boolean;
    id: string | string[];
    user: any;
    isSaved: boolean;
    isPlaylistDownloaded: boolean;
    isCurrentPlaylistPlaying: boolean;
    shuffleMode: boolean;
    onToggleSave: () => void;
    onDownload: () => void;
    onEdit: () => void;
    onToggleShuffle: () => void;
    onPlayAll: () => void;
    onPause: () => void;
    onOptions: () => void;
    onShare: () => void;
    width: number;
}

const PlaylistHeader = React.memo<PlaylistHeaderProps>(({
    playlist,
    allSongs,
    artworkUrl,
    colors,
    isDiscovery,
    id,
    user,
    isSaved,
    isPlaylistDownloaded,
    isCurrentPlaylistPlaying,
    shuffleMode,
    onToggleSave,
    onDownload,
    onEdit,
    onToggleShuffle,
    onPlayAll,
    onPause,
    onOptions,
    onShare,
    width,
}) => {
    const isOwner = playlist.userId === user?.id;
    const creatorName = isOwner ? (user?.firstName || user?.username || 'You') : 'Vibra';
    const creatorImage = isOwner ? user?.imageUrl : null;

    return (
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
                        {isDiscovery ? (
                            <View style={{ width: width * 0.62, height: width * 0.62, borderRadius: 3, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                                <MixCover title={playlist.name} variant={String(id)?.includes('weekly') ? 'weekly' : 'daily'} animated={false} style={{ width: '100%', height: '100%' }} />
                            </View>
                        ) : artworkUrl ? (
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
                        ) : (
                            <View style={{ width: width * 0.62, height: width * 0.62, borderRadius: 2, overflow: 'hidden', backgroundColor: Colors.surfaceLighter, alignItems: 'center', justifyContent: 'center' }}>
                                <Music size={80} color="#52525b" />
                            </View>
                        )}
                    </View>

                    <View className="w-full mt-5">
                        {!isDiscovery && (
                            <>
                                <Text className="text-white text-2xl font-semibold mb-2 leading-tight tracking-tight" numberOfLines={1}>
                                    {playlist.name}
                                </Text>
                                <Text className="text-zinc-400 text-sm font-medium mb-4 leading-5" numberOfLines={2}>
                                    {playlist.description || 'Curated for you by Vibra'}
                                </Text>
                            </>
                        )}

                        <View className={`flex-row items-center ${isDiscovery ? 'mt-1 mb-2' : ''}`}>
                            {creatorImage ? (
                                <View className="mr-2 rounded-full overflow-hidden">
                                    <Image source={{ uri: creatorImage ?? undefined }} style={{ width: 24, height: 24 }} cachePolicy="memory-disk" />
                                </View>
                            ) : (
                                <Image
                                    source={require('@/assets/images/vibra-white.png')}
                                    style={{ width: 18, height: 18 }}
                                    contentFit="contain"
                                />
                            )}
                            <Text className="text-white text-[11px] font-semibold tracking-wider">
                                {creatorName} <Text className="text-zinc-400 font-medium lowercase">• {allSongs.length} tracks</Text>
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="px-6 pt-4 pb-0 flex-row items-center justify-between">
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
                        {!isDiscovery ? (
                            <>
                                {!isOwner && (
                                    <TouchableOpacity onPress={onToggleSave} activeOpacity={0.7}>
                                        <SaveStateIcon
                                            variant="medium"
                                            isSaved={isSaved}
                                            checkmarkColor="black"
                                            outlineColor="#b3b3b3"
                                        />
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity onPress={onDownload} activeOpacity={0.7}>
                                    <DownloadStateIcon
                                        variant="medium"
                                        status={isPlaylistDownloaded ? 'downloaded' : 'idle'}
                                        color="#b3b3b3"
                                    />
                                </TouchableOpacity>

                                <TouchableOpacity onPress={onShare} activeOpacity={0.7}>
                                    <Share2 size={22} color="#b3b3b3" />
                                </TouchableOpacity>

                                <TouchableOpacity onPress={onOptions} activeOpacity={0.7}>
                                    <MoreVertical size={22} color="#b3b3b3" />
                                </TouchableOpacity>
                            </>
                        ) : null}
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
    );
});

// ─────────────────────────────────────────────────────────────────────────────

export default function PlaylistScreen() {
    const { id } = useLocalSearchParams();
    const { from } = useGlobalSearchParams();
    const router = useRouter();
    const listRef = React.useRef<any>(null);
    const { user } = useUser();
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const optionsRef = React.useRef<CollectionOptionsRef>(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isDownloadConfirmVisible, setIsDownloadConfirmVisible] = useState(false);

    const { playlists, fetchPlaylistById, updatePlaylist, isLoading: isLoadingPlaylist } = usePlaylistStore();
    const {
        currentTrack,
        isPlaying,
        initializeQueue,
        shuffleMode,
        toggleShuffle,
        pauseTrack
    } = usePlayerStore();
    const dailyMix = useStreamStore(s => s.dailyMix);
    const weeklyMix = useStreamStore(s => s.weeklyMix);
    const isLoadingDailyMix = useStreamStore(s => s.isLoadingDailyMix);
    const isLoadingWeeklyMix = useStreamStore(s => s.isLoadingWeeklyMix);
    const { isItemSaved, toggleSaveItem } = useSavedItemsStore();
    const { downloadPlaylist, downloadedPlaylists } = useDownloadStore();

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

    const isDiscovery = id === 'daily-mix' || id === 'weekly-mix';

    let playlist = playlists.find(p => p._id === id);
    let allSongs: any[] = [];
    let isLoading = isLoadingPlaylist;

    if (isDiscovery) {
        isLoading = id === 'daily-mix' ? isLoadingDailyMix : isLoadingWeeklyMix;
        const mixSongs = id === 'daily-mix' ? dailyMix : weeklyMix?.results;
        allSongs = mixSongs || [];
        playlist = {
            _id: id as string,
            name: id === 'daily-mix' ? 'Daily Mix' : 'Weekly Mix',
            description: id === 'daily-mix' ? 'Your personal discovery station' : 'Your week in music, AI-curated.',
            imageUrl: allSongs.length > 0 ? allSongs[0].imageUrl : undefined,
        } as any;
    } else {
        allSongs = (playlist?.songs || (playlist as any)?.tracks || []) as any[];
    }

    const netInfo = useNetInfo();
    const isOffline = netInfo.isConnected === false;

    useEffect(() => {
        if (id && !isDiscovery) {
            // Reset scroll position on ID change
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
            
            setIsInitialLoading(true);
            if (!isOffline) {
                fetchPlaylistById(id as string);
            }
        }
    }, [id, isDiscovery, isOffline]);

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
        if (!isLoading && playlist) {
            const timer = setTimeout(() => setIsInitialLoading(false), 50);
            return () => clearTimeout(timer);
        }
    }, [isLoading, playlist]);

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

    const artworkUrl = useMemo(() =>
        resolveAssetUrl(playlist?.imageUrl || (allSongs.length > 0 ? allSongs[0].imageUrl : null)),
        [playlist?.imageUrl, allSongs[0]?.imageUrl]
    );
    let colors = useDynamicColors(artworkUrl);

    if (isDiscovery) {
        const variant = id === 'weekly-mix' ? 'weekly' : 'daily';
        colors = { ...colors, primary: getMixBaseColor(variant) };
    }

    const headerBaseColor = (colors.primary && colors.primary !== '#310a5b') ? colors.primary : Colors.surface;

    const filteredSongs = allSongs;

    const isCurrentPlaylistPlaying = allSongs.some((s: any) => getTrackId(s) === currentTrack?.id) && isPlaying;
    const isSaved = isItemSaved(id as string);
    const isPlaylistDownloaded = !!downloadedPlaylists[id as string];

    const handlePlayPlaylist = useCallback(() => {
        const songsToPlay = filteredSongs.length > 0 ? filteredSongs : allSongs;
        if (songsToPlay.length > 0) {
            const tracks = songsToPlay.map(s => {
                const trackId = getTrackId(s);
                const source = s.source || 'jiosaavn';
                const initialUrl = s.url || s.streamUrl || s.audioUrl || '';
                const isLocal = initialUrl.startsWith('file://');

                return {
                    id: trackId,
                    url: isLocal ? initialUrl : DUMMY_URL,
                    title: s.title,
                    artist: s.artist,
                    artwork: s.imageUrl || playlist?.imageUrl,
                    source
                };
            });
            initializeQueue(tracks, 0, { type: 'playlist', id: id as string, title: playlist?.name });
        }
    }, [filteredSongs, allSongs, playlist, id, initializeQueue]);

    const handlePlayTrack = useCallback((song: any, index: number) => {
        const songsToPlay = filteredSongs.length > 0 ? filteredSongs : allSongs;
        const tracks = songsToPlay.map(s => {
            const trackId = getTrackId(s);
            const source = s.source || 'jiosaavn';
            const initialUrl = s.url || s.streamUrl || s.audioUrl || '';
            const isLocal = initialUrl.startsWith('file://');

            return {
                id: trackId,
                url: isLocal ? initialUrl : DUMMY_URL,
                title: s.title,
                artist: s.artist,
                artwork: s.imageUrl || playlist?.imageUrl,
                source
            };
        });
        initializeQueue(tracks, index, { type: 'playlist', id: id as string, title: playlist?.name });
    }, [filteredSongs, allSongs, playlist, id, initializeQueue]);

    const handleDownloadPlaylist = useCallback(() => {
        if (!allSongs.length) return;
        setIsDownloadConfirmVisible(true);
    }, [allSongs.length]);

    const confirmDownloadPlaylist = useCallback(async () => {
        setIsDownloadConfirmVisible(false);
        if (!playlist) return;
        await downloadPlaylist(playlist, allSongs.map(s => ({
            ...s,
            id: s._id || s.id || s.externalId,
            artwork: s.imageUrl || playlist?.imageUrl
        })));
    }, [allSongs, playlist, downloadPlaylist]);

    const handleShare = useCallback(async () => {
        if (!playlist) return;
        try {
            const cleanId = (id as string).replace(/^jiosaavn_playlist_/, '');
            const message = `Check out this playlist "${playlist.name}" on Vibra!\n\nListen here: https://vibra-969f.onrender.com/playlist/${cleanId}`;
            await Share.share({ message, title: playlist.name });
        } catch (error) {
            Sentry.captureException(error);
        }
    }, [playlist, id]);

    const handleEditSave = useCallback(async (name: string, description: string) => {
        try {
            await updatePlaylist(id as string, name, description);
        } catch (error) {
            Alert.alert("Error", "Failed to update playlist details");
        }
    }, [id, updatePlaylist]);

    const headerComponent = useMemo(() => (
        <PlaylistHeader
            playlist={playlist}
            allSongs={allSongs}
            artworkUrl={artworkUrl}
            colors={colors}
            isDiscovery={isDiscovery}
            id={id}
            user={user}
            isSaved={isSaved}
            isPlaylistDownloaded={isPlaylistDownloaded}
            isCurrentPlaylistPlaying={isCurrentPlaylistPlaying}
            shuffleMode={shuffleMode}
            onToggleSave={() => toggleSaveItem({ ...playlist, externalId: id, type: 'playlist' })}
            onDownload={handleDownloadPlaylist}
            onEdit={() => setIsEditModalVisible(true)}
            onToggleShuffle={toggleShuffle}
            onPlayAll={handlePlayPlaylist}
            onPause={pauseTrack}
            onOptions={() => playlist && optionsRef.current?.open({ ...playlist, title: playlist.name }, 'playlist')}
            onShare={handleShare}
            width={width}
        />
    ), [playlist, allSongs, artworkUrl, colors, isDiscovery, id, user, isSaved, isPlaylistDownloaded, isCurrentPlaylistPlaying, shuffleMode, handleDownloadPlaylist, handlePlayPlaylist, handleShare]);

    const displaySongs = useMemo(() => {
        return allSongs.map((s: any) => ({
            ...s,
            imageUrl: s.imageUrl || playlist?.imageUrl
        }));
    }, [allSongs, playlist?.imageUrl]);

    const renderTrackItem = useCallback(({ item: song, index }: { item: any, index: number }) => (
        <TrackListItem
            track={song}
            index={index}
            isCurrent={currentTrack?.id === getTrackId(song)}
            onPress={() => handlePlayTrack(song, index)}
            playlistImageUrl={playlist?.imageUrl}
        />
    ), [currentTrack?.id, playlist?.imageUrl, handlePlayTrack]);

    if (isLoading && !playlist) {
        return <MediaListSkeleton />;
    }

    if (!playlist) {
        return (
            <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: Colors.background }}>
                <Text className="text-white text-lg mb-4">Playlist not found</Text>
                <TouchableOpacity onPress={() => router.replace('/(tabs)/library' as any)} className="bg-zinc-800 px-6 py-2 rounded-full">
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
                            {playlist?.name}
                        </Text>
                    </Animated.View>

                    <Animated.View style={[headerPlayButtonStyle]} className="ml-2">
                        <TouchableOpacity
                            onPress={isCurrentPlaylistPlaying ? pauseTrack : handlePlayPlaylist}
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
                    keyExtractor={(item: any) => getTrackId(item)}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    ListHeaderComponent={headerComponent}
                    estimatedItemSize={80}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    overScrollMode="never"
                    bounces={false}
                />
                <CollectionOptions ref={optionsRef} />

            <EditPlaylistModal
                visible={isEditModalVisible}
                onClose={() => setIsEditModalVisible(false)}
                onSave={handleEditSave}
                initialName={playlist.name}
                initialDescription={playlist.description || ''}
            />

            <ConfirmationModal
                visible={isDownloadConfirmVisible}
                title="Download Playlist"
                message="Download this playlist for offline listening?"
                confirmLabel="Download"
                onConfirm={confirmDownloadPlaylist}
                onCancel={() => setIsDownloadConfirmVisible(false)}
            />
        </View>
    );
}
