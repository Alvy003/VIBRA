import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useStreamStore } from '@/stores/useStreamStore';
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
    Shuffle,
    CirclePlus,
    CircleArrowDown,
    Check,
    Music,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveAssetUrl } from '@/lib/url';
import { useDynamicColors } from '@/hooks/useDynamicColors';
import { useUser } from '@clerk/clerk-expo';
import { FlashList as OriginalFlashList } from '@shopify/flash-list';
const FlashList = OriginalFlashList as any;
import { MediaListSkeleton } from '@/components/Skeleton';
import { TrackListItem } from '@/components/TrackListItem';
import { MixCover } from '@/components/home/MixCover';
import { useSavedItemsStore } from '@/stores/useSavedItemsStore';
import { useDownloadStore } from '@/stores/useDownloadStore';
import EditPlaylistModal from '@/components/modals/EditPlaylistModal';
import PlaylistOptions from '@/components/PlaylistOptions';
import { DownloadedIcon } from '@/components/DownloadedIcon';

const { width } = Dimensions.get('window');
const ACCENT_COLOR = '#8B5CF6';

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
    width,
}) => {
    const isOwner = playlist.userId === user?.id;
    const creatorName = isOwner ? (user?.firstName || user?.username || 'You') : 'Vibra';
    const creatorImage = isOwner ? user?.imageUrl : null;

    return (
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
                        {artworkUrl ? (
                            <Image
                                source={{ uri: artworkUrl ?? undefined }}
                                style={{ width: width * 0.65, height: width * 0.65, borderRadius: 4 }}
                                contentFit="cover"
                                transition={0}
                                cachePolicy="memory-disk"
                            />
                        ) : (
                            <View style={{ width: width * 0.65, height: width * 0.65, borderRadius: 4, overflow: 'hidden', backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center' }}>
                                {isDiscovery ? (
                                    <MixCover title={playlist.name} variant={String(id)?.includes('weekly') ? 'weekly' : 'daily'} />
                                ) : (
                                    <Music size={80} color="#52525b" />
                                )}
                            </View>
                        )}
                    </View>

                    <View className="w-full mt-10">
                        <Text className="text-white text-3xl font-extrabold mb-2 leading-tight tracking-tight">
                            {playlist.name}
                        </Text>
                        <Text className="text-zinc-300 text-sm font-medium mb-4 leading-5" numberOfLines={2}>
                            {playlist.description || 'Curated for you by Vibra'}
                        </Text>

                        <View className="flex-row items-center">
                            {creatorImage ? (
                                <View className="mr-2 border border-white/10 rounded-full overflow-hidden">
                                    <Image source={{ uri: creatorImage ?? undefined }} style={{ width: 24, height: 24 }} cachePolicy="memory-disk" />
                                </View>
                            ) : (
                                <View className="w-6 h-6 rounded-full bg-purple-600 items-center justify-center mr-2 ring-1 ring-white/20">
                                    <Text className="text-white text-[10px] font-black">V</Text>
                                </View>
                            )}
                            <Text className="text-white text-xs font-bold uppercase tracking-wider">
                                {creatorName} <Text className="text-zinc-400 font-medium lowercase italic">• {allSongs.length} tracks</Text>
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="px-6 pt-8 pb-4 flex-row items-center justify-between">
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
                        {isDiscovery && (
                            <TouchableOpacity onPress={onToggleSave} activeOpacity={0.7}>
                                {isSaved ? (
                                    <View style={{ width: 26, height: 26, backgroundColor: ACCENT_COLOR, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                                        <Check size={18} color="black" strokeWidth={4} />
                                    </View>
                                ) : (
                                    <CirclePlus size={26} color="#b3b3b3" />
                                )}
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity onPress={onDownload} activeOpacity={0.7}>
                            {isPlaylistDownloaded ? (
                                <DownloadedIcon size={26} />
                            ) : (
                                <CircleArrowDown size={28} color="#b3b3b3" />
                            )}
                        </TouchableOpacity>

                        <PlaylistOptions
                            playlist={playlist}
                            isDiscovery={isDiscovery}
                            isDownloaded={isPlaylistDownloaded}
                            onEdit={onEdit}
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
    );
});

// ─────────────────────────────────────────────────────────────────────────────

export default function PlaylistScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useUser();
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const { playlists, fetchPlaylistById, updatePlaylist, isLoading: isLoadingPlaylist } = usePlaylistStore();
    const {
        currentTrack,
        isPlaying,
        initializeQueue,
        shuffleMode,
        toggleShuffle,
        pauseTrack
    } = usePlayerStore();
    const { dailyMix, weeklyMix, isLoadingDailyMix, isLoadingWeeklyMix } = useStreamStore();
    const { isItemSaved, toggleSaveItem } = useSavedItemsStore();
    const { downloadPlaylist, downloadedPlaylists } = useDownloadStore();

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

    useEffect(() => {
        if (id && !isDiscovery) {
            setIsInitialLoading(true);
            fetchPlaylistById(id as string);
        }
    }, [id, isDiscovery]);

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

    const colors = useDynamicColors(artworkUrl);

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/library');
        }
    };

    const headerBaseColor = (colors.primary && colors.primary !== '#310a5b') ? colors.primary : '#121212';

    const filteredSongs = allSongs;

    const isCurrentPlaylistPlaying = allSongs.some((s: any) => (s._id === currentTrack?.id || s.id === currentTrack?.id)) && isPlaying;
    const isSaved = isItemSaved(id as string);
    const isPlaylistDownloaded = !!downloadedPlaylists[id as string];

    const handlePlayPlaylist = useCallback(() => {
        const songsToPlay = filteredSongs.length > 0 ? filteredSongs : allSongs;
        if (songsToPlay.length > 0) {
            const tracks = songsToPlay.map(s => ({
                id: s._id || s.id || s.externalId,
                url: s.streamUrl || s.audioUrl || s.url,
                title: s.title,
                artist: s.artist,
                artwork: s.imageUrl || playlist?.imageUrl,
                source: s.source || 'jiosaavn'
            }));
            initializeQueue(tracks, 0, { type: 'playlist', id: id as string, title: playlist?.name });
        }
    }, [filteredSongs, allSongs, playlist, id, initializeQueue]);

    const handlePlayTrack = useCallback((song: any, index: number) => {
        const tracks = filteredSongs.map(s => ({
            id: s._id || s.id || s.externalId,
            url: s.streamUrl || s.audioUrl || s.url,
            title: s.title,
            artist: s.artist,
            artwork: s.imageUrl || playlist?.imageUrl,
            source: s.source || 'jiosaavn'
        }));
        initializeQueue(tracks, index, { type: 'playlist', id: id as string, title: playlist?.name });
    }, [filteredSongs, playlist, id, initializeQueue]);

    const handleDownloadPlaylist = useCallback(async () => {
        if (!allSongs.length) return;
        Alert.alert(
            "Download Playlist",
            `Do you want to download all ${allSongs.length} songs in "${playlist?.name}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Download",
                    onPress: async () => {
                        await downloadPlaylist(playlist, allSongs.map(s => ({
                            ...s,
                            id: s._id || s.id || s.externalId,
                            artwork: s.imageUrl || playlist?.imageUrl
                        })));
                    }
                }
            ]
        );
    }, [allSongs, playlist, downloadPlaylist]);

    const handleEditSave = useCallback(async (name: string, description: string) => {
        try {
            await updatePlaylist(id as string, name, description);
        } catch (error) {
            Alert.alert("Error", "Failed to update playlist details");
        }
    }, [id, updatePlaylist]);

    const renderHeader = useCallback(() => (
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
            width={width}
        />
    ), [playlist, allSongs, artworkUrl, colors, isDiscovery, id, user, isSaved, isPlaylistDownloaded, isCurrentPlaylistPlaying, shuffleMode, handleDownloadPlaylist, handlePlayPlaylist]);

    const renderTrackItem = useCallback(({ item: song, index }: { item: any, index: number }) => (
        <TrackListItem
            track={{
                ...song,
                imageUrl: song.imageUrl || playlist?.imageUrl
            }}
            index={index}
            isCurrent={currentTrack?.id === (song._id || song.id || song.externalId)}
            onPress={() => handlePlayTrack(song, index)}
            playlistImageUrl={playlist?.imageUrl}
            accentColor={ACCENT_COLOR}
        />
    ), [currentTrack?.id, playlist?.imageUrl, handlePlayTrack]);

    if (isLoading && !playlist) {
        return <MediaListSkeleton />;
    }

    if (!playlist) {
        return (
            <View className="flex-1 bg-black items-center justify-center p-6">
                <Text className="text-white text-lg mb-4">Playlist not found</Text>
                <TouchableOpacity onPress={() => router.replace('/(tabs)/library' as any)} className="bg-zinc-800 px-6 py-2 rounded-full">
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
                            {playlist.name}
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
                keyExtractor={(item: any) => item._id || item.id || item.externalId}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{ paddingBottom: 110 }}
                showsVerticalScrollIndicator={false}
            />

            <EditPlaylistModal
                visible={isEditModalVisible}
                onClose={() => setIsEditModalVisible(false)}
                onSave={handleEditSave}
                initialName={playlist.name}
                initialDescription={playlist.description || ''}
            />
        </View>
    );
}
