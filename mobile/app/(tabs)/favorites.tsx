import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    StyleSheet,
    BackHandler,
    StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useDownloadStore } from '@/stores/useDownloadStore';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedScrollHandler,
    interpolate,
    Extrapolate,
} from 'react-native-reanimated';
import {
    ArrowLeft,
    CircleArrowDown,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FlashList as OriginalFlashList } from '@shopify/flash-list';
import { MediaListSkeleton } from '@/components/Skeleton';
import { TrackListItem } from '@/components/TrackListItem';
import CollectionOptions, { CollectionOptionsRef } from '@/components/CollectionOptions';
import { DownloadedIcon } from '@/components/DownloadedIcon';
import { SharpPlay, SharpPause, SharpShuffle } from '@/components/SharpIcons';
import Colors from '@/constants/Colors';

// Placeholder URL - resolveAudioUrl will replace with a fresh redirector URL at play time
const DUMMY_URL = 'https://raw.githubusercontent.com/anars/blank-audio/master/1-second-of-silence.mp3';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACCENT_COLOR = Colors.accent;
const AnimatedFlashList = Animated.createAnimatedComponent(OriginalFlashList) as any;

interface FavoritesHeaderProps {
    count: number;
    isDownloaded: boolean;
    isCurrentPlaying: boolean;
    shuffleMode: boolean;
    onDownload: () => void;
    onToggleShuffle: () => void;
    onPlayAll: () => void;
    onPause: () => void;
}

const FavoritesHeader = React.memo<FavoritesHeaderProps>(({
    count,
    isDownloaded,
    isCurrentPlaying,
    shuffleMode,
    onDownload,
    onToggleShuffle,
    onPlayAll,
    onPause,
}) => (
    <View style={[styles.headerContent, { backgroundColor: '#5038a0' }]}>
        {/* Liked Songs Purple Gradient - Blending from transparent to background */}
        <LinearGradient
            colors={[
                'transparent',
                'rgba(9, 9, 11, 0.05)',
                'rgba(9, 9, 11, 0.15)',
                'rgba(9, 9, 11, 0.3)',
                'rgba(9, 9, 11, 0.5)',
                'rgba(9, 9, 11, 0.7)',
                'rgba(9, 9, 11, 0.85)',
                Colors.background,
                Colors.background,
            ]}
            locations={[0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.78, 0.9, 1]}
            style={styles.headerGradient}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
        />
        
        <View style={styles.titleSection}>
            <Text style={styles.titleText}>Liked Songs</Text>
            <View style={styles.metadataRow}>
                <Text style={styles.metadataText}>{count} songs</Text>
            </View>
        </View>

        <View style={styles.actionBar}>
            {/* Left Controls: Only Download */}
            <View style={styles.leftControls}>
                <TouchableOpacity onPress={onDownload} activeOpacity={0.7}>
                    {isDownloaded ? (
                        <DownloadedIcon size={22} />
                    ) : (
                        <CircleArrowDown size={26} color={Colors.whiteAlpha60} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Right Controls: Shuffle and Play */}
            <View style={styles.rightControls}>
                <TouchableOpacity onPress={onToggleShuffle} activeOpacity={0.7}>
                    <View style={styles.shuffleContainer}>
                        <SharpShuffle size={26} color={shuffleMode ? ACCENT_COLOR : Colors.whiteAlpha60} />
                        {shuffleMode && <View style={styles.shuffleDot} />}
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={isCurrentPlaying ? onPause : onPlayAll}
                    style={styles.playButton}
                    activeOpacity={0.8}
                >
                    {isCurrentPlaying ? (
                        <SharpPause size={28} color="black" />
                    ) : (
                        <SharpPlay size={28} color="black" style={{ marginLeft: 3 }} />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    </View>
));

export default function FavoritesScreen() {
    const router = useRouter();
    const listRef = useRef<any>(null);
    const optionsRef = useRef<CollectionOptionsRef>(null);
    
    const { likedSongs, fetchLikedSongs, isLoading } = useMusicStore();
    const { 
        currentTrack, 
        isPlaying, 
        initializeQueue, 
        pauseTrack, 
        shuffleMode, 
        toggleShuffle 
    } = usePlayerStore();
    const { downloadPlaylist, downloadedPlaylists } = useDownloadStore();

    // Filter to only JioSaavn songs — old Cloudinary-uploaded songs have no externalId
    // and their audioUrls expire/change. JioSaavn songs use the backend redirector for fresh URLs.
    const jiosaavnLikedSongs = useMemo(
        () => likedSongs.filter((s: any) => s.externalId?.startsWith('jiosaavn_')),
        [likedSongs]
    );

    useEffect(() => {
        fetchLikedSongs();
    }, []);

    // Scroll handling for sticky header
    const scrollY = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const handleBack = useCallback(() => {
        // Explicitly return to Library to ensure tab consistency 
        router.push('/(tabs)/library');
    }, [router]);

    // Handle system back gesture
    useEffect(() => {
        const backAction = () => {
            handleBack();
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [handleBack]);

    const isCurrentPlaying = useMemo(() => {
        return jiosaavnLikedSongs.some(s => (s.externalId || s._id) === currentTrack?.id) && isPlaying;
    }, [jiosaavnLikedSongs, currentTrack?.id, isPlaying]);

    const isDownloaded = !!downloadedPlaylists['favorites'] || (jiosaavnLikedSongs.length > 0 && jiosaavnLikedSongs.every(s => useDownloadStore.getState().isDownloaded(s._id)));

    const handlePlayAll = useCallback(() => {
        if (jiosaavnLikedSongs.length === 0) return;
        const tracks = jiosaavnLikedSongs.map((s: any) => ({
            id: s.externalId || s._id,
            externalId: s.externalId || s._id,
            url: DUMMY_URL,       // resolveAudioUrl will replace with fresh redirector URL
            title: s.title,
            artist: s.artist,
            artwork: s.imageUrl,
            duration: s.duration,
            source: 'jiosaavn',
        }));
        initializeQueue(tracks, 0, { type: 'playlist', id: 'favorites', title: 'Liked Songs' });
    }, [jiosaavnLikedSongs, initializeQueue]);

    const handlePlaySong = useCallback((song: any, index: number) => {
        const tracks = jiosaavnLikedSongs.map((s: any) => ({
            id: s.externalId || s._id,
            externalId: s.externalId || s._id,
            url: DUMMY_URL,       // resolveAudioUrl will replace with fresh redirector URL
            title: s.title,
            artist: s.artist,
            artwork: s.imageUrl,
            duration: s.duration,
            source: 'jiosaavn',
        }));
        initializeQueue(tracks, index, { type: 'playlist', id: 'favorites', title: 'Liked Songs' });
    }, [jiosaavnLikedSongs, initializeQueue]);

    const handleDownloadAll = useCallback(async () => {
        if (jiosaavnLikedSongs.length === 0) return;
        downloadPlaylist({ externalId: 'favorites', title: 'Liked Songs', imageUrl: '' } as any, jiosaavnLikedSongs.map((s: any) => ({ ...s, id: s.externalId || s._id, artwork: s.imageUrl })));
    }, [jiosaavnLikedSongs, downloadPlaylist]);

    // Animated styles for sticky header
    const stickyHeaderStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [80, 140], [0, 1], Extrapolate.CLAMP);
        return { opacity };
    });

    const headerTitleStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [120, 160], [0, 1], Extrapolate.CLAMP);
        const translateY = interpolate(scrollY.value, [120, 160], [10, 0], Extrapolate.CLAMP);
        return { opacity, transform: [{ translateY }] };
    });

    const headerPlayButtonStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [140, 180], [0, 1], Extrapolate.CLAMP);
        const scale = interpolate(scrollY.value, [140, 180], [0.6, 1], Extrapolate.CLAMP);
        return { opacity, transform: [{ scale }] };
    });

    if (isLoading && jiosaavnLikedSongs.length === 0) {
        return <MediaListSkeleton />;
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            
            {/* Back Button */}
            <View style={styles.backButtonContainer}>
                <SafeAreaView edges={['top']}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <ArrowLeft size={26} color={Colors.textPrimary} />
                    </TouchableOpacity>
                </SafeAreaView>
            </View>

            {/* Sticky Header */}
            <Animated.View style={[styles.stickyHeader, stickyHeaderStyle]}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface }]} />
                {/* Branded Gradient Overlay for Sticky Header */}
                <LinearGradient
                    colors={['#5038a0', Colors.background]}
                    style={StyleSheet.absoluteFill}
                />
                <SafeAreaView edges={['top']} style={styles.stickyHeaderContent}>
                    <View style={{ width: 40 }} />
                    <Animated.View style={[styles.stickyTitleContainer, headerTitleStyle]}>
                        <Text style={styles.stickyTitle} numberOfLines={1}>Liked Songs</Text>
                    </Animated.View>
                    <Animated.View style={headerPlayButtonStyle}>
                        <TouchableOpacity
                            onPress={isCurrentPlaying ? pauseTrack : handlePlayAll}
                            style={styles.stickyPlayButton}
                        >
                            {isCurrentPlaying ? (
                                <SharpPause size={22} color="black" />
                            ) : (
                                <SharpPlay size={22} color="black" style={{ marginLeft: 2 }} />
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </SafeAreaView>
            </Animated.View>

            <AnimatedFlashList
                ref={listRef}
                data={jiosaavnLikedSongs}
                keyExtractor={(item: any) => item.externalId || item._id}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                renderItem={({ item, index }: any) => (
                    <TrackListItem
                        track={{ ...item, id: item.externalId || item._id }}
                        index={index}
                        isCurrent={currentTrack?.id === (item.externalId || item._id)}
                        onPress={() => handlePlaySong(item, index)}
                    />
                )}
                ListHeaderComponent={
                    <FavoritesHeader
                        count={jiosaavnLikedSongs.length}
                        isDownloaded={isDownloaded}
                        isCurrentPlaying={isCurrentPlaying}
                        shuffleMode={shuffleMode}
                        onDownload={handleDownloadAll}
                        onToggleShuffle={toggleShuffle}
                        onPlayAll={handlePlayAll}
                        onPause={pauseTrack}
                    />
                }
                estimatedItemSize={70}
                contentContainerStyle={{ paddingBottom: 150 }}
            />
            
            <CollectionOptions ref={optionsRef} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    backButtonContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        pointerEvents: 'box-none',
    },
    backButton: {
        width: 44,
        height: 44,
        marginLeft: 8,
        marginTop: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stickyHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 90,
        zIndex: 90,
    },
    stickyHeaderContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 13,
    },
    stickyTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    stickyTitle: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '700',
    },
    stickyPlayButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: ACCENT_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        paddingTop: 100,
        paddingBottom: 24,
        paddingHorizontal: 16,
    },
    headerGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    titleSection: {
        marginBottom: 20,
    },
    titleText: {
        color: Colors.textPrimary,
        fontSize: 25,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    metadataRow: {
        marginTop: 4,
    },
    metadataText: {
        color: Colors.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
    actionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftControls: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 3,
    },
    rightControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
    },
    shuffleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    shuffleDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: ACCENT_COLOR,
        position: 'absolute',
        bottom: -8,
    },
    playButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: ACCENT_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
});
